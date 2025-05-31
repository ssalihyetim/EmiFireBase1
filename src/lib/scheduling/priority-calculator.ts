import { ProcessInstance } from "@/types/planning";
import { Timestamp } from "firebase/firestore";

export interface PriorityWeights {
  dueDateUrgency: number;      // 0.4 - Most important factor
  customerPriority: number;    // 0.3 - Business importance  
  dependencyCriticality: number; // 0.2 - Technical complexity
  setupOptimization: number;   // 0.1 - Efficiency factor
}

export interface PriorityResult {
  processInstanceId: string;
  totalScore: number;
  breakdown: {
    dueDateScore: number;
    customerScore: number; 
    dependencyScore: number;
    setupScore: number;
  };
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
}

export class PriorityCalculator {
  private readonly defaultWeights: PriorityWeights = {
    dueDateUrgency: 0.4,
    customerPriority: 0.3,
    dependencyCriticality: 0.2,
    setupOptimization: 0.1
  };

  private weights: PriorityWeights;

  constructor(weights?: PriorityWeights) {
    this.weights = weights || this.defaultWeights;
  }

  /**
   * Calculate comprehensive priority scores for all process instances
   */
  calculatePriorities(
    processInstances: ProcessInstance[],
    dependencyMap: Map<string, string[]> = new Map()
  ): PriorityResult[] {
    const results: PriorityResult[] = [];
    
    for (const instance of processInstances) {
      const result = this.calculateSinglePriority(instance, processInstances, dependencyMap);
      results.push(result);
    }

    // Sort by total score (highest priority first)
    return results.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Calculate priority for a single process instance
   */
  private calculateSinglePriority(
    instance: ProcessInstance,
    allInstances: ProcessInstance[],
    dependencyMap: Map<string, string[]>
  ): PriorityResult {
    const dueDateScore = this.calculateDueDateUrgency(instance);
    const customerScore = this.calculateCustomerPriorityScore(instance);
    const dependencyScore = this.calculateDependencyCriticality(instance, dependencyMap);
    const setupScore = this.calculateSetupOptimizationScore(instance, allInstances);

    const totalScore = 
      (dueDateScore * this.weights.dueDateUrgency) +
      (customerScore * this.weights.customerPriority) +
      (dependencyScore * this.weights.dependencyCriticality) +
      (setupScore * this.weights.setupOptimization);

    const urgencyLevel = this.determineUrgencyLevel(totalScore);

    return {
      processInstanceId: instance.id,
      totalScore,
      breakdown: {
        dueDateScore,
        customerScore,
        dependencyScore,
        setupScore
      },
      urgencyLevel
    };
  }

  /**
   * Calculate urgency based on due date proximity
   * Returns score from 0-100 (100 = most urgent)
   */
  private calculateDueDateUrgency(instance: ProcessInstance): number {
    if (!instance.dueDate) {
      return 50; // Default medium priority for no due date
    }

    const now = new Date();
    const dueDate = new Date(instance.dueDate);
    const totalDuration = instance.setupTimeMinutes + (instance.cycleTimeMinutes * instance.quantity);
    const requiredCompletionTime = new Date(now.getTime() + (totalDuration * 60 * 1000));

    // Calculate days until due date
    const daysUntilDue = (dueDate.getTime() - requiredCompletionTime.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilDue < 0) {
      return 100; // Overdue - highest priority
    } else if (daysUntilDue < 1) {
      return 95;  // Due today/tomorrow
    } else if (daysUntilDue < 3) {
      return 80;  // Due within 3 days
    } else if (daysUntilDue < 7) {
      return 60;  // Due within a week
    } else if (daysUntilDue < 14) {
      return 40;  // Due within 2 weeks
    } else {
      return 20;  // Due later
    }
  }

  /**
   * Convert customer priority to numerical score
   * Returns score from 0-100
   */
  private calculateCustomerPriorityScore(instance: ProcessInstance): number {
    switch (instance.customerPriority) {
      case 'urgent': return 100;
      case 'high': return 80;
      case 'medium': return 50;
      case 'low': return 20;
      default: return 50;
    }
  }

  /**
   * Calculate criticality based on dependency chain complexity
   * Returns score from 0-100
   */
  private calculateDependencyCriticality(
    instance: ProcessInstance,
    dependencyMap: Map<string, string[]>
  ): number {
    // Count direct dependencies
    const directDependencies = instance.dependencies?.length || 0;
    
    // Count processes that depend on this one
    const dependents = dependencyMap.get(instance.id)?.length || 0;
    
    // Calculate dependency depth (how many levels of dependencies)
    const dependencyDepth = this.calculateDependencyDepth(instance, dependencyMap);
    
    // Score based on complexity
    let score = 0;
    
    // Direct dependencies add urgency
    score += directDependencies * 10;
    
    // Dependents add criticality (blocking others)
    score += dependents * 15;
    
    // Dependency depth adds complexity
    score += dependencyDepth * 5;
    
    // Normalize to 0-100 scale
    return Math.min(score, 100);
  }

  /**
   * Calculate setup optimization potential
   * Returns score from 0-100
   */
  private calculateSetupOptimizationScore(
    instance: ProcessInstance,
    allInstances: ProcessInstance[]
  ): number {
    // Find similar processes that could benefit from batching
    const similarProcesses = allInstances.filter(other => 
      other.id !== instance.id &&
      other.machineType === instance.machineType &&
      this.hasOverlapInCapabilities(
        instance.requiredMachineCapabilities,
        other.requiredMachineCapabilities
      )
    );

    // Higher score for processes that can be batched effectively
    if (similarProcesses.length === 0) {
      return 30; // Standalone process
    } else if (similarProcesses.length < 3) {
      return 60; // Some batching potential
    } else {
      return 90; // High batching potential
    }
  }

  /**
   * Calculate dependency depth recursively
   */
  private calculateDependencyDepth(
    instance: ProcessInstance,
    dependencyMap: Map<string, string[]>,
    visited: Set<string> = new Set()
  ): number {
    if (visited.has(instance.id)) {
      return 0; // Circular dependency protection
    }

    visited.add(instance.id);

    if (!instance.dependencies || instance.dependencies.length === 0) {
      return 0;
    }

    let maxDepth = 0;
    for (const depId of instance.dependencies) {
      // This would require access to all instances - simplified for now
      maxDepth = Math.max(maxDepth, 1); // Simplified depth calculation
    }

    return maxDepth + 1;
  }

  /**
   * Check if two capability sets have overlap
   */
  private hasOverlapInCapabilities(caps1: string[], caps2: string[]): boolean {
    if (!caps1 || !caps2) return false;
    return caps1.some(cap => caps2.includes(cap));
  }

  /**
   * Determine urgency level from total score
   */
  private determineUrgencyLevel(totalScore: number): 'critical' | 'high' | 'medium' | 'low' {
    if (totalScore >= 80) return 'critical';
    if (totalScore >= 60) return 'high';
    if (totalScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Get priority ranking for display
   */
  getPriorityRanking(results: PriorityResult[]): Array<{
    rank: number;
    processInstanceId: string;
    score: number;
    urgencyLevel: string;
  }> {
    return results.map((result, index) => ({
      rank: index + 1,
      processInstanceId: result.processInstanceId,
      score: Math.round(result.totalScore),
      urgencyLevel: result.urgencyLevel
    }));
  }

  /**
   * Update weights for custom priority strategies
   */
  updateWeights(newWeights: Partial<PriorityWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
    
    // Ensure weights sum to 1.0
    const totalWeight = Object.values(this.weights).reduce((sum: number, weight: number) => sum + weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      console.warn(`Priority weights sum to ${totalWeight}, not 1.0. Consider normalizing.`);
    }
  }
} 