import { ProcessInstance } from "@/types/planning";

export interface DependencyNode {
  processInstanceId: string;
  dependencies: string[];
  dependents: string[];
  level: number;          // Topological level (0 = no dependencies)
  criticalPath: boolean;  // Is this on the critical path?
  earliestStart: number;  // Earliest possible start time (minutes from project start)
  latestStart: number;    // Latest possible start time without delaying project
  slack: number;          // Amount of slack time available
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  levels: string[][]; // Processes organized by dependency level
  criticalPath: string[];
  totalDuration: number;
  hasCycles: boolean;
  cycles?: string[][];
}

export interface DependencyConflict {
  type: 'circular' | 'invalid_reference' | 'self_dependency' | 'critical_path_overload';
  description: string;
  affectedProcesses: string[];
  suggestedResolution: string;
}

export class DependencyResolver {
  /**
   * Build and analyze complete dependency graph
   */
  buildDependencyGraph(processInstances: ProcessInstance[]): DependencyGraph {
    console.log('🔍 Building dependency graph for', processInstances.length, 'processes');
    
    // Create dependency map
    const dependencyMap = this.createDependencyMap(processInstances);
    
    // Check for conflicts
    const conflicts = this.validateDependencies(processInstances);
    if (conflicts.length > 0) {
      console.error('❌ Dependency conflicts found:', conflicts);
    }
    
    // Perform topological sort
    const sortedLevels = this.topologicalSort(processInstances);
    const hasCycles = this.detectCycles(processInstances);
    
    // Build nodes with timing analysis
    const nodes = this.buildDependencyNodes(processInstances, dependencyMap, sortedLevels);
    
    // Calculate critical path
    const criticalPathAnalysis = this.calculateCriticalPath(nodes, processInstances);
    
    return {
      nodes,
      levels: sortedLevels,
      criticalPath: criticalPathAnalysis.criticalPath,
      totalDuration: criticalPathAnalysis.totalDuration,
      hasCycles,
      cycles: hasCycles ? this.findCycles(processInstances) : undefined
    };
  }

  /**
   * Create bidirectional dependency mapping
   */
  private createDependencyMap(processInstances: ProcessInstance[]): Map<string, string[]> {
    const dependencyMap = new Map<string, string[]>();
    
    // Initialize empty arrays for all processes
    processInstances.forEach(process => {
      dependencyMap.set(process.id, []);
    });
    
    // Build reverse dependency map (who depends on whom)
    processInstances.forEach(process => {
      if (process.dependencies && process.dependencies.length > 0) {
        process.dependencies.forEach(depId => {
          const dependents = dependencyMap.get(depId) || [];
          dependents.push(process.id);
          dependencyMap.set(depId, dependents);
        });
      }
    });
    
    return dependencyMap;
  }

  /**
   * Validate dependencies for conflicts
   */
  validateDependencies(processInstances: ProcessInstance[]): DependencyConflict[] {
    const conflicts: DependencyConflict[] = [];
    const processIds = new Set(processInstances.map(p => p.id));
    
    processInstances.forEach(process => {
      // Check for self-dependencies
      if (process.dependencies?.includes(process.id)) {
        conflicts.push({
          type: 'self_dependency',
          description: `Process ${process.displayName} depends on itself`,
          affectedProcesses: [process.id],
          suggestedResolution: 'Remove self-dependency'
        });
      }
      
      // Check for invalid references
      process.dependencies?.forEach(depId => {
        if (!processIds.has(depId)) {
          conflicts.push({
            type: 'invalid_reference',
            description: `Process ${process.displayName} depends on non-existent process ${depId}`,
            affectedProcesses: [process.id],
            suggestedResolution: 'Remove invalid dependency or add missing process'
          });
        }
      });
    });
    
    // Check for circular dependencies
    if (this.detectCycles(processInstances)) {
      const cycles = this.findCycles(processInstances);
      cycles.forEach((cycle, index) => {
        conflicts.push({
          type: 'circular',
          description: `Circular dependency detected: ${cycle.join(' → ')} → ${cycle[0]}`,
          affectedProcesses: cycle,
          suggestedResolution: 'Break the circular dependency by removing one of the dependencies'
        });
      });
    }
    
    return conflicts;
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  topologicalSort(processInstances: ProcessInstance[]): string[][] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();
    
    // Initialize
    processInstances.forEach(process => {
      inDegree.set(process.id, 0);
      adjList.set(process.id, []);
    });
    
    // Build graph and calculate in-degrees
    processInstances.forEach(process => {
      if (process.dependencies) {
        process.dependencies.forEach(depId => {
          const adjacents = adjList.get(depId) || [];
          adjacents.push(process.id);
          adjList.set(depId, adjacents);
          
          inDegree.set(process.id, (inDegree.get(process.id) || 0) + 1);
        });
      }
    });
    
    // Kahn's algorithm
    const levels: string[][] = [];
    let currentLevel: string[] = [];
    
    // Find all nodes with no incoming edges
    processInstances.forEach(process => {
      if (inDegree.get(process.id) === 0) {
        currentLevel.push(process.id);
      }
    });
    
    while (currentLevel.length > 0) {
      levels.push([...currentLevel]);
      const nextLevel: string[] = [];
      
      currentLevel.forEach(nodeId => {
        const adjacents = adjList.get(nodeId) || [];
        adjacents.forEach(adjId => {
          const newInDegree = (inDegree.get(adjId) || 0) - 1;
          inDegree.set(adjId, newInDegree);
          
          if (newInDegree === 0) {
            nextLevel.push(adjId);
          }
        });
      });
      
      currentLevel = nextLevel;
    }
    
    return levels;
  }

  /**
   * Detect cycles using DFS
   */
  private detectCycles(processInstances: ProcessInstance[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycleDFS = (processId: string): boolean => {
      visited.add(processId);
      recursionStack.add(processId);
      
      const process = processInstances.find(p => p.id === processId);
      if (process?.dependencies) {
        for (const depId of process.dependencies) {
          if (!visited.has(depId)) {
            if (hasCycleDFS(depId)) {
              return true;
            }
          } else if (recursionStack.has(depId)) {
            return true; // Back edge found - cycle detected
          }
        }
      }
      
      recursionStack.delete(processId);
      return false;
    };
    
    for (const process of processInstances) {
      if (!visited.has(process.id)) {
        if (hasCycleDFS(process.id)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Find all cycles in the dependency graph
   */
  private findCycles(processInstances: ProcessInstance[]): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];
    
    const findCycleDFS = (processId: string): void => {
      visited.add(processId);
      recursionStack.add(processId);
      path.push(processId);
      
      const process = processInstances.find(p => p.id === processId);
      if (process?.dependencies) {
        for (const depId of process.dependencies) {
          if (!visited.has(depId)) {
            findCycleDFS(depId);
          } else if (recursionStack.has(depId)) {
            // Found a cycle
            const cycleStart = path.indexOf(depId);
            const cycle = path.slice(cycleStart);
            cycles.push([...cycle]);
          }
        }
      }
      
      recursionStack.delete(processId);
      path.pop();
    };
    
    for (const process of processInstances) {
      if (!visited.has(process.id)) {
        findCycleDFS(process.id);
      }
    }
    
    return cycles;
  }

  /**
   * Build detailed dependency nodes with timing information
   */
  private buildDependencyNodes(
    processInstances: ProcessInstance[],
    dependencyMap: Map<string, string[]>,
    levels: string[][]
  ): Map<string, DependencyNode> {
    const nodes = new Map<string, DependencyNode>();
    
    processInstances.forEach(process => {
      const level = this.findProcessLevel(process.id, levels);
      const dependencies = process.dependencies || [];
      const dependents = dependencyMap.get(process.id) || [];
      
      nodes.set(process.id, {
        processInstanceId: process.id,
        dependencies,
        dependents,
        level,
        criticalPath: false, // Will be calculated later
        earliestStart: 0,    // Will be calculated later
        latestStart: 0,      // Will be calculated later
        slack: 0             // Will be calculated later
      });
    });
    
    return nodes;
  }

  /**
   * Calculate critical path and timing information
   */
  private calculateCriticalPath(
    nodes: Map<string, DependencyNode>,
    processInstances: ProcessInstance[]
  ): { criticalPath: string[], totalDuration: number } {
    // Calculate earliest start times (forward pass)
    this.calculateEarliestStartTimes(nodes, processInstances);
    
    // Calculate latest start times (backward pass)
    const totalDuration = this.calculateLatestStartTimes(nodes, processInstances);
    
    // Calculate slack and identify critical path
    const criticalPath = this.identifyCriticalPath(nodes);
    
    return { criticalPath, totalDuration };
  }

  /**
   * Calculate earliest start times for all processes
   */
  private calculateEarliestStartTimes(
    nodes: Map<string, DependencyNode>,
    processInstances: ProcessInstance[]
  ): void {
    const processMap = new Map(processInstances.map(p => [p.id, p]));
    
    // Topological order ensures dependencies are processed first
    const sortedNodes = Array.from(nodes.values()).sort((a, b) => a.level - b.level);
    
    sortedNodes.forEach(node => {
      let earliestStart = 0;
      
      // Find the latest completion time of all dependencies
      node.dependencies.forEach(depId => {
        const depNode = nodes.get(depId);
        const depProcess = processMap.get(depId);
        
        if (depNode && depProcess) {
          const depCompletionTime = depNode.earliestStart + 
            depProcess.setupTimeMinutes + 
            (depProcess.cycleTimeMinutes * depProcess.quantity);
          
          earliestStart = Math.max(earliestStart, depCompletionTime);
        }
      });
      
      node.earliestStart = earliestStart;
    });
  }

  /**
   * Calculate latest start times for all processes
   */
  private calculateLatestStartTimes(
    nodes: Map<string, DependencyNode>,
    processInstances: ProcessInstance[]
  ): number {
    const processMap = new Map(processInstances.map(p => [p.id, p]));
    
    // Find project completion time
    let projectEnd = 0;
    nodes.forEach((node, processId) => {
      const process = processMap.get(processId);
      if (process) {
        const completionTime = node.earliestStart + 
          process.setupTimeMinutes + 
          (process.cycleTimeMinutes * process.quantity);
        projectEnd = Math.max(projectEnd, completionTime);
      }
    });
    
    // Initialize latest start times
    nodes.forEach((node, processId) => {
      const process = processMap.get(processId);
      if (process && node.dependents.length === 0) {
        // End processes
        node.latestStart = projectEnd - 
          process.setupTimeMinutes - 
          (process.cycleTimeMinutes * process.quantity);
      }
    });
    
    // Backward pass
    const sortedNodes = Array.from(nodes.values()).sort((a, b) => b.level - a.level);
    
    sortedNodes.forEach(node => {
      if (node.dependents.length > 0) {
        let latestStart = Infinity;
        
        node.dependents.forEach(dependentId => {
          const dependentNode = nodes.get(dependentId);
          if (dependentNode) {
            latestStart = Math.min(latestStart, dependentNode.latestStart);
          }
        });
        
        node.latestStart = latestStart === Infinity ? node.earliestStart : latestStart;
      }
    });
    
    // Calculate slack
    nodes.forEach(node => {
      node.slack = node.latestStart - node.earliestStart;
    });
    
    return projectEnd;
  }

  /**
   * Identify critical path (processes with zero slack)
   */
  private identifyCriticalPath(nodes: Map<string, DependencyNode>): string[] {
    const criticalNodes: string[] = [];
    
    nodes.forEach((node, processId) => {
      if (Math.abs(node.slack) < 0.1) { // Consider floating point precision
        node.criticalPath = true;
        criticalNodes.push(processId);
      }
    });
    
    // Sort critical nodes by earliest start time
    return criticalNodes.sort((a, b) => {
      const nodeA = nodes.get(a);
      const nodeB = nodes.get(b);
      return (nodeA?.earliestStart || 0) - (nodeB?.earliestStart || 0);
    });
  }

  /**
   * Find the level of a process in the topological sort
   */
  private findProcessLevel(processId: string, levels: string[][]): number {
    for (let i = 0; i < levels.length; i++) {
      if (levels[i].includes(processId)) {
        return i;
      }
    }
    return -1; // Not found
  }

  /**
   * Get sorted process instances based on dependency analysis
   */
  getSortedProcessInstances(
    processInstances: ProcessInstance[],
    dependencyGraph: DependencyGraph
  ): ProcessInstance[] {
    const processMap = new Map(processInstances.map(p => [p.id, p]));
    const sorted: ProcessInstance[] = [];
    
    // Add processes level by level, prioritizing critical path
    dependencyGraph.levels.forEach(level => {
      // Separate critical and non-critical processes
      const criticalProcesses = level.filter(id => 
        dependencyGraph.criticalPath.includes(id)
      );
      const nonCriticalProcesses = level.filter(id => 
        !dependencyGraph.criticalPath.includes(id)
      );
      
      // Add critical processes first
      criticalProcesses.forEach(id => {
        const process = processMap.get(id);
        if (process) sorted.push(process);
      });
      
      // Then add non-critical processes
      nonCriticalProcesses.forEach(id => {
        const process = processMap.get(id);
        if (process) sorted.push(process);
      });
    });
    
    return sorted;
  }

  /**
   * Get dependency analysis for debugging
   */
  getDependencyAnalysis(dependencyGraph: DependencyGraph): {
    totalLevels: number;
    criticalPathLength: number;
    longestChain: number;
    parallelismOpportunities: number;
  } {
    return {
      totalLevels: dependencyGraph.levels.length,
      criticalPathLength: dependencyGraph.criticalPath.length,
      longestChain: Math.max(...dependencyGraph.levels.map(level => level.length)),
      parallelismOpportunities: dependencyGraph.levels.filter(level => level.length > 1).length
    };
  }
} 