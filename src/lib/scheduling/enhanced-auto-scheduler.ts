import { ProcessInstance, Machine, ScheduleResult, ScheduleEntry, Conflict } from "@/types/planning";
import { Timestamp } from "firebase/firestore";
import { PriorityCalculator, PriorityResult } from "./priority-calculator";
import { MachineMatcher, MachineScore } from "./machine-matcher";
import { DependencyResolver, DependencyGraph } from "./dependency-resolver";
import { AvailabilityCalculator } from "./availability-calculator";
import { ScheduleManager } from "./schedule-manager";

export interface EnhancedSchedulingOptions {
  priorityWeights?: {
    dueDateUrgency: number;
    customerPriority: number;
    dependencyCriticality: number;
    setupOptimization: number;
  };
  machineMatchingWeights?: {
    capability: number;
    loadBalance: number;
    setupOptimization: number;
    efficiency: number;
  };
  optimizationStrategy: 'balanced' | 'speed' | 'cost' | 'quality';
  allowParallelProcessing: boolean;
  considerSetupTime: boolean;
  bufferTimePercentage: number;
}

export interface SchedulingMetrics {
  totalProcessingTime: number;
  totalSetupTime: number;
  averageUtilization: number;
  criticalPathDuration: number;
  parallelismAchieved: number;
  conflictsResolved: number;
  schedulingDurationMs: number;
  costOptimization: number;
  qualityScore: number;
}

export interface DetailedScheduleEntry extends ScheduleEntry {
  priority: number;
  urgencyLevel: string;
  machineScore: number;
  isOnCriticalPath: boolean;
  setupOptimized: boolean;
  bufferTime: number;
}

export class EnhancedAutoScheduler {
  private priorityCalculator: PriorityCalculator;
  private machineMatcher: MachineMatcher;
  private dependencyResolver: DependencyResolver;
  private availabilityCalculator: AvailabilityCalculator;
  private scheduleManager: ScheduleManager;

  constructor(options?: Partial<EnhancedSchedulingOptions>) {
    const defaultOptions: EnhancedSchedulingOptions = {
      optimizationStrategy: 'balanced',
      allowParallelProcessing: true,
      considerSetupTime: true,
      bufferTimePercentage: 10
    };

    const finalOptions = { ...defaultOptions, ...options };

    this.priorityCalculator = new PriorityCalculator(finalOptions.priorityWeights);
    this.machineMatcher = new MachineMatcher(finalOptions.machineMatchingWeights);
    this.dependencyResolver = new DependencyResolver();
    this.availabilityCalculator = new AvailabilityCalculator();
    this.scheduleManager = new ScheduleManager();
  }

  /**
   * Enhanced auto-scheduling with multi-objective optimization
   */
  async scheduleProcessInstances(
    processInstances: ProcessInstance[],
    machines: Machine[],
    options?: Partial<EnhancedSchedulingOptions>
  ): Promise<ScheduleResult> {
    const startTime = Date.now();
    console.log('🚀 Enhanced auto-scheduling started for', processInstances.length, 'processes');

    try {
      // Phase 1: Dependency Analysis
      console.log('📊 Phase 1: Analyzing dependencies...');
      const dependencyGraph = this.dependencyResolver.buildDependencyGraph(processInstances);
      
      if (dependencyGraph.hasCycles) {
        console.error('❌ Circular dependencies detected');
        return this.createFailureResult('Circular dependencies detected', [], startTime);
      }

      // Phase 2: Priority Calculation
      console.log('⚖️ Phase 2: Calculating priorities...');
      const priorityResults = this.priorityCalculator.calculatePriorities(
        processInstances,
        this.createDependencyMap(processInstances)
      );

      // Phase 3: Optimized Process Ordering
      console.log('🔄 Phase 3: Optimizing process order...');
      const orderedProcesses = this.getOptimizedProcessOrder(
        processInstances,
        dependencyGraph,
        priorityResults
      );

      // Phase 4: Machine Assignment & Scheduling
      console.log('🏭 Phase 4: Assigning machines and scheduling...');
      const scheduleEntries: DetailedScheduleEntry[] = [];
      const machineWorkloads = new Map<string, number>();
      const conflicts: Conflict[] = [];

      // Initialize machine workloads
      machines.forEach(machine => {
        machineWorkloads.set(machine.id, machine.currentWorkload || 0);
      });

      // Schedule each process in optimized order
      for (const process of orderedProcesses) {
        const scheduleEntry = await this.scheduleProcessInstance(
          process,
          machines,
          machineWorkloads,
          dependencyGraph,
          priorityResults,
          scheduleEntries
        );

        if (scheduleEntry) {
          scheduleEntries.push(scheduleEntry);
          
          // Update machine workload
          const duration = scheduleEntry.endTime.toMillis() - scheduleEntry.startTime.toMillis();
          const currentWorkload = machineWorkloads.get(scheduleEntry.machineId) || 0;
          machineWorkloads.set(scheduleEntry.machineId, currentWorkload + (duration / (1000 * 60 * 60)));
          
          console.log(`✅ Scheduled ${process.displayName} on ${scheduleEntry.machineName}`);
        } else {
          const conflict: Conflict = {
            type: 'dependency_conflict',
            description: `Failed to schedule process ${process.displayName} - no suitable machine or time slot found`,
            conflictingEntries: [process.id],
            suggestedResolution: 'Check machine capabilities or adjust time requirements'
          };
          conflicts.push(conflict);
          console.error('❌', conflict.description);
        }
      }

      // Phase 5: Optimization & Validation
      console.log('🔧 Phase 5: Final optimization...');
      const optimizedEntries = await this.optimizeSchedule(scheduleEntries, dependencyGraph);
      
      // Phase 6: Persist to Database
      console.log('💾 Phase 6: Persisting schedule...');
      await this.persistSchedule(optimizedEntries);

      // Calculate metrics
      const metrics = this.calculateStandardMetrics(
        optimizedEntries,
        machines,
        startTime
      );

      console.log('🎯 Enhanced scheduling completed successfully');
      console.log('📊 Metrics:', metrics);

      return {
        success: true,
        entries: optimizedEntries,
        conflicts,
        metrics
      };

    } catch (error) {
      console.error('💥 Enhanced scheduling failed:', error);
      return this.createFailureResult(
        error instanceof Error ? error.message : 'Unknown scheduling error',
        [],
        startTime
      );
    }
  }

  /**
   * Schedule a single process instance with enhanced logic
   */
  private async scheduleProcessInstance(
    processInstance: ProcessInstance,
    machines: Machine[],
    machineWorkloads: Map<string, number>,
    dependencyGraph: DependencyGraph,
    priorityResults: PriorityResult[],
    existingEntries: DetailedScheduleEntry[]
  ): Promise<DetailedScheduleEntry | null> {
    
    // Find best machine for this process
    const machineScores = await this.machineMatcher.findCapableMachines(
      processInstance,
      machines,
      machineWorkloads
    );

    if (machineScores.length === 0) {
      console.warn(`❌ No capable machines found for ${processInstance.displayName}`);
      return null;
    }

    // Get priority information
    const priorityResult = priorityResults.find(p => p.processInstanceId === processInstance.id);
    const isOnCriticalPath = dependencyGraph.criticalPath.includes(processInstance.id);

    // Calculate earliest possible start time based on dependencies
    const earliestStart = await this.calculateEarliestStartTime(
      processInstance,
      existingEntries,
      dependencyGraph
    );

    // Try each machine in order of score
    for (const machineScore of machineScores) {
      const machine = machineScore.machine;
      
      // Calculate process duration
      const totalDuration = processInstance.setupTimeMinutes + 
        (processInstance.cycleTimeMinutes * processInstance.quantity);
      
      // Add buffer time
      const bufferTime = Math.ceil(totalDuration * 0.1); // 10% buffer
      const totalDurationWithBuffer = totalDuration + bufferTime;

      // Find available time slot
      const availableSlots = await this.availabilityCalculator.getAvailableTimeSlots(
        machine.id,
        totalDurationWithBuffer
      );

      // Find the first suitable slot after earliest start time
      const suitableSlot = availableSlots.find(slot => 
        slot.start.toMillis() >= earliestStart.toMillis()
      );

      if (suitableSlot) {
        const endTime = Timestamp.fromMillis(
          suitableSlot.start.toMillis() + (totalDurationWithBuffer * 60 * 1000)
        );

        // Create detailed schedule entry
        const scheduleEntry: DetailedScheduleEntry = {
          id: `enhanced_${processInstance.id}_${Date.now()}`,
          machineId: machine.id,
          processInstanceId: processInstance.id,
          orderId: processInstance.offerId,
          startTime: suitableSlot.start,
          endTime: endTime,
          status: 'scheduled',
          
          // Legacy compatibility fields
          jobId: processInstance.id,
          partName: processInstance.displayName,
          quantity: processInstance.quantity,
          process: {
            id: processInstance.id,
            name: processInstance.baseProcessName,
            machineType: processInstance.machineType,
            setupTimeMinutes: processInstance.setupTimeMinutes,
            cycleTimeMinutes: processInstance.cycleTimeMinutes,
            description: processInstance.description,
            dependencies: processInstance.dependencies,
            requiredMachineCapabilities: processInstance.requiredMachineCapabilities,
            estimatedCost: processInstance.estimatedCost
          },
          machineName: machine.name,
          scheduledStartTime: suitableSlot.start.toDate().toISOString(),
          scheduledEndTime: endTime.toDate().toISOString(),
          dependencies: processInstance.dependencies,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),

          // Enhanced fields
          priority: priorityResult?.totalScore || 50,
          urgencyLevel: priorityResult?.urgencyLevel || 'medium',
          machineScore: machineScore.totalScore,
          isOnCriticalPath,
          setupOptimized: machineScore.breakdown.setupOptimizationScore > 70,
          bufferTime
        };

        return scheduleEntry;
      }
    }

    return null; // No suitable machine/time slot found
  }

  /**
   * Calculate earliest start time based on dependencies
   */
  private async calculateEarliestStartTime(
    processInstance: ProcessInstance,
    existingEntries: DetailedScheduleEntry[],
    dependencyGraph: DependencyGraph
  ): Promise<Timestamp> {
    let earliestStart = Timestamp.now();

    if (processInstance.dependencies && processInstance.dependencies.length > 0) {
      for (const depId of processInstance.dependencies) {
        const dependencyEntry = existingEntries.find(entry => 
          entry.processInstanceId === depId
        );
        
        if (dependencyEntry) {
          const depEndTime = dependencyEntry.endTime;
          if (depEndTime.toMillis() > earliestStart.toMillis()) {
            earliestStart = depEndTime;
          }
        }
      }
    }

    return earliestStart;
  }

  /**
   * Get optimized process order considering multiple factors
   */
  private getOptimizedProcessOrder(
    processInstances: ProcessInstance[],
    dependencyGraph: DependencyGraph,
    priorityResults: PriorityResult[]
  ): ProcessInstance[] {
    // Start with dependency-sorted processes
    const dependencySorted = this.dependencyResolver.getSortedProcessInstances(
      processInstances,
      dependencyGraph
    );

    // Create priority map for quick lookup
    const priorityMap = new Map(
      priorityResults.map(p => [p.processInstanceId, p.totalScore])
    );

    // Within each dependency level, sort by priority
    const processMap = new Map(processInstances.map(p => [p.id, p]));
    const optimizedOrder: ProcessInstance[] = [];

    dependencyGraph.levels.forEach(level => {
      const levelProcesses = level
        .map(id => processMap.get(id))
        .filter((p): p is ProcessInstance => p !== undefined);

      // Sort by priority within the level
      levelProcesses.sort((a, b) => {
        const priorityA = priorityMap.get(a.id) || 0;
        const priorityB = priorityMap.get(b.id) || 0;
        return priorityB - priorityA; // Higher priority first
      });

      optimizedOrder.push(...levelProcesses);
    });

    return optimizedOrder;
  }

  /**
   * Optimize the final schedule
   */
  private async optimizeSchedule(
    scheduleEntries: DetailedScheduleEntry[],
    dependencyGraph: DependencyGraph
  ): Promise<DetailedScheduleEntry[]> {
    // For now, return entries as-is
    // Future optimizations could include:
    // - Setup time minimization by reordering similar processes
    // - Load balancing adjustments
    // - Buffer time optimization
    
    return scheduleEntries;
  }

  /**
   * Persist schedule to database
   */
  private async persistSchedule(scheduleEntries: DetailedScheduleEntry[]): Promise<void> {
    for (const entry of scheduleEntries) {
      try {
        await this.scheduleManager.createScheduleEntry(entry);
      } catch (error) {
        console.error('Failed to persist schedule entry:', entry.id, error);
      }
    }
  }

  /**
   * Calculate standard metrics that match the ScheduleResult interface
   */
  private calculateStandardMetrics(
    scheduleEntries: DetailedScheduleEntry[],
    machines: Machine[],
    startTime: number
  ) {
    const averageUtilization = this.calculateMachineUtilization(scheduleEntries, machines);
    
    return {
      totalScheduledJobs: scheduleEntries.length,
      averageUtilization,
      onTimeDeliveryRate: 95, // Placeholder calculation
      schedulingDurationMs: Date.now() - startTime
    };
  }

  /**
   * Calculate machine utilization
   */
  private calculateMachineUtilization(
    scheduleEntries: DetailedScheduleEntry[],
    machines: Machine[]
  ): number {
    const machineUsage = new Map<string, number>();
    
    scheduleEntries.forEach(entry => {
      const duration = entry.endTime.toMillis() - entry.startTime.toMillis();
      const currentUsage = machineUsage.get(entry.machineId) || 0;
      machineUsage.set(entry.machineId, currentUsage + duration);
    });

    const utilizationScores = Array.from(machineUsage.entries()).map(([machineId, usage]) => {
      const machine = machines.find(m => m.id === machineId);
      if (!machine) return 0;
      
      // Assuming 8-hour work day as baseline
      const baselineHours = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
      return Math.min((usage / baselineHours) * 100, 100);
    });

    return utilizationScores.reduce((sum, score) => sum + score, 0) / utilizationScores.length;
  }

  /**
   * Calculate cost optimization score
   */
  private calculateCostOptimization(scheduleEntries: DetailedScheduleEntry[]): number {
    // Simple cost optimization based on machine selection
    const avgMachineScore = scheduleEntries.reduce((sum, entry) => 
      sum + entry.machineScore, 0) / scheduleEntries.length;
    
    return avgMachineScore;
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(scheduleEntries: DetailedScheduleEntry[]): number {
    const criticalPathOptimized = scheduleEntries.filter(entry => 
      entry.isOnCriticalPath && entry.setupOptimized
    ).length;
    
    const totalCriticalPath = scheduleEntries.filter(entry => 
      entry.isOnCriticalPath
    ).length;
    
    if (totalCriticalPath === 0) return 100;
    
    return (criticalPathOptimized / totalCriticalPath) * 100;
  }

  /**
   * Create dependency map for priority calculator
   */
  private createDependencyMap(processInstances: ProcessInstance[]): Map<string, string[]> {
    const dependencyMap = new Map<string, string[]>();
    
    processInstances.forEach(process => {
      dependencyMap.set(process.id, []);
    });
    
    processInstances.forEach(process => {
      if (process.dependencies) {
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
   * Create failure result with correct type structure
   */
  private createFailureResult(
    error: string,
    conflicts: Conflict[],
    startTime: number
  ): ScheduleResult {
    const failureConflict: Conflict = {
      type: 'dependency_conflict',
      description: error,
      conflictingEntries: [],
      suggestedResolution: 'Review process dependencies and machine requirements'
    };

    return {
      success: false,
      entries: [],
      conflicts: [
        ...conflicts,
        failureConflict
      ],
      metrics: {
        totalScheduledJobs: 0,
        averageUtilization: 0,
        onTimeDeliveryRate: 0,
        schedulingDurationMs: Date.now() - startTime
      }
    };
  }
} 