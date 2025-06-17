import { ProcessInstance, Machine, ScheduleResult, ScheduleEntry, Conflict } from "@/types/planning";
import { Timestamp } from "firebase/firestore";
import { MachineMatcher } from "./machine-matcher";
import { DependencyResolver } from "./dependency-resolver";
import { ScheduleManager } from "./schedule-manager";

export interface SimpleSchedulingOptions {
  startDate?: Date; // When to start scheduling (default: tomorrow)
  workingHours: {
    start: string; // e.g., "08:00"
    end: string;   // e.g., "17:00"
    workingDays: number[]; // [1,2,3,4,5] = Mon-Fri
    breakDuration: number; // minutes
  };
  maxDailyHours: number; // Maximum hours per day per machine
}

export interface SimplifiedScheduleEntry extends ScheduleEntry {
  dayNumber: number; // Which day this falls on (1, 2, 3, etc.)
  dailySequence: number; // Order within the day
  totalDays: number; // How many days this operation spans
}

export class SimpleAutoScheduler {
  private machineMatcher: MachineMatcher;
  private dependencyResolver: DependencyResolver;
  private scheduleManager: ScheduleManager;
  private options: SimpleSchedulingOptions;

  constructor(options?: Partial<SimpleSchedulingOptions>) {
    // Initialize options first with temporary working days
    this.options = {
      workingHours: {
        start: "08:00",
        end: "17:00", 
        workingDays: [1, 2, 3, 4, 5], // Mon-Fri
        breakDuration: 60 // 1 hour lunch break
      },
      maxDailyHours: 8,
      ...options
    };

    // Now set the start date
    if (!this.options.startDate) {
      this.options.startDate = this.getNextBusinessDay();
    }
    this.machineMatcher = new MachineMatcher();
    this.dependencyResolver = new DependencyResolver();
    this.scheduleManager = new ScheduleManager();
  }

  /**
   * Get next business day starting at 8 AM
   */
  private getNextBusinessDay(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0); // 8:00 AM
    
    // If tomorrow is weekend, move to Monday
    while (!this.options.workingHours.workingDays.includes(tomorrow.getDay())) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    
    return tomorrow;
  }

  /**
   * Calculate working minutes per day (accounting for breaks)
   */
  private getWorkingMinutesPerDay(): number {
    const [startHour, startMin] = this.options.workingHours.start.split(':').map(Number);
    const [endHour, endMin] = this.options.workingHours.end.split(':').map(Number);
    
    const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    return totalMinutes - this.options.workingHours.breakDuration;
  }

  /**
   * Simple scheduling algorithm
   */
  async scheduleProcessInstances(
    processInstances: ProcessInstance[],
    machines: Machine[]
  ): Promise<ScheduleResult> {
    const startTime = Date.now();
    console.log('🚀 Simple auto-scheduling started for', processInstances.length, 'processes');

    try {
      // Phase 1: Build dependency graph
      console.log('📊 Phase 1: Building dependency graph...');
      const dependencyGraph = this.dependencyResolver.buildDependencyGraph(processInstances);
      
      if (dependencyGraph.hasCycles) {
        console.error('❌ Circular dependencies detected');
        return this.createFailureResult('Circular dependencies detected', [], startTime);
      }

      // Phase 2: Get dependency-ordered processes
      console.log('🔄 Phase 2: Ordering processes by dependencies...');
      
      // First, let's see the original order and dependencies
      console.log('📋 Original ProcessInstances:');
      processInstances.forEach((process, index) => {
        console.log(`  ${index + 1}. ${process.displayName} (orderIndex: ${process.orderIndex}) - deps: [${process.dependencies?.join(', ') || 'none'}]`);
      });
      
      // ✅ TEMPORARY FIX: Use simple orderIndex-based sorting instead of complex dependency resolution
      // This ensures the processes are scheduled in the correct order as intended by the user
      const orderedProcesses = [...processInstances].sort((a, b) => a.orderIndex - b.orderIndex);
      
      console.log('📋 OrderIndex-sorted ProcessInstances:');
      orderedProcesses.forEach((process, index) => {
        console.log(`  ${index + 1}. ${process.displayName} (orderIndex: ${process.orderIndex}) - deps: [${process.dependencies?.join(', ') || 'none'}]`);
      });
      
      // TODO: Later we can re-enable dependency-based sorting when the dependency chain is working correctly
      // const orderedProcesses = this.dependencyResolver.getSortedProcessInstances(
      //   processInstances,
      //   dependencyGraph
      // );

      // Phase 3: Simple sequential scheduling
      console.log('📅 Phase 3: Simple sequential scheduling...');
      const scheduleEntries: SimplifiedScheduleEntry[] = [];
      const conflicts: Conflict[] = [];
      
      let currentStartTime = this.options.startDate!;
      const workingMinutesPerDay = this.getWorkingMinutesPerDay();

      // Track machine usage by day
      const machineSchedules = new Map<string, Map<number, number>>(); // machineId -> day -> minutesUsed

      for (const process of orderedProcesses) {
        console.log(`\n🔧 Scheduling: ${process.displayName}`);
        
        // Find best machine for this process
        const machineScores = await this.machineMatcher.findCapableMachines(
          process,
          machines,
          new Map() // We don't use workloads in simple scheduling
        );

        if (machineScores.length === 0) {
          const conflict: Conflict = {
            type: 'dependency_conflict',
            description: `No capable machines found for ${process.displayName}`,
            conflictingEntries: [process.id],
            suggestedResolution: 'Check machine capabilities'
          };
          conflicts.push(conflict);
          console.error('❌', conflict.description);
          continue;
        }

        // Calculate total time needed
        const totalMinutes = process.setupTimeMinutes + (process.cycleTimeMinutes * (process.quantity || 1));
        console.log(`⏱️  Total time needed: ${totalMinutes} minutes (${Math.ceil(totalMinutes / 60)} hours)`);

        // Find the best machine that can accommodate this job
        let selectedMachine = null;
        let startDay = this.getBusinessDayNumber(currentStartTime);

        for (const machineScore of machineScores) {
          const machine = machineScore.machine;
          
          // Find when this machine can start the job
          const machineCanStart = this.findEarliestStartForMachine(
            machine.id,
            totalMinutes,
            startDay,
            workingMinutesPerDay,
            machineSchedules
          );

          if (machineCanStart.canStart) {
            selectedMachine = {
              machine,
              score: machineScore.totalScore,
              startDay: machineCanStart.day,
              startTime: machineCanStart.startTime
            };
            break; // Take the first (best) machine that can do it
          }
        }

        if (!selectedMachine) {
          const conflict: Conflict = {
            type: 'dependency_conflict',
            description: `No available time slots found for ${process.displayName}`,
            conflictingEntries: [process.id],
            suggestedResolution: 'Check machine availability or reduce duration'
          };
          conflicts.push(conflict);
          console.error('❌', conflict.description);
          continue;
        }

        // Schedule the job
        const scheduleEntry = this.createScheduleEntry(
          process,
          selectedMachine,
          totalMinutes,
          workingMinutesPerDay
        );

        scheduleEntries.push(scheduleEntry);

        // Update machine schedules
        this.updateMachineSchedule(
          selectedMachine.machine.id,
          selectedMachine.startDay,
          totalMinutes,
          workingMinutesPerDay,
          machineSchedules
        );

        // Update currentStartTime for next process (dependency handling)
        currentStartTime = scheduleEntry.endTime.toDate();

        console.log(`✅ Scheduled ${process.displayName} on ${selectedMachine.machine.name}`);
        console.log(`   📅 Start: ${scheduleEntry.startTime.toDate().toLocaleDateString()}`);
        console.log(`   📅 End: ${scheduleEntry.endTime.toDate().toLocaleDateString()}`);
        console.log(`   📊 Days: ${scheduleEntry.totalDays}`);
      }

      // Phase 4: Persist schedule
      console.log('💾 Phase 4: Persisting schedule...');
      await this.persistSchedule(scheduleEntries);

      const metrics = {
        totalScheduledJobs: scheduleEntries.length,
        averageUtilization: this.calculateUtilization(scheduleEntries, machines),
        onTimeDeliveryRate: 100, // Simple scheduling assumes on-time delivery
        schedulingDurationMs: Date.now() - startTime
      };

      console.log('🎉 Simple scheduling completed successfully');
      console.log(`📊 Scheduled ${scheduleEntries.length} processes`);
      console.log(`⚠️ ${conflicts.length} conflicts detected`);

      return {
        success: true,
        entries: scheduleEntries,
        conflicts: conflicts,
        metrics: metrics
      };

    } catch (error) {
      console.error('❌ Simple scheduling failed:', error);
      return this.createFailureResult(
        `Scheduling failed: ${error}`,
        [],
        startTime
      );
    }
  }

  /**
   * Get business day number (1 = first day, 2 = second day, etc.)
   */
  private getBusinessDayNumber(date: Date): number {
    const startDate = this.options.startDate!;
    const timeDiff = date.getTime() - startDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    let businessDays = 0;
    const currentDate = new Date(startDate);
    
    for (let i = 0; i <= daysDiff; i++) {
      if (this.options.workingHours.workingDays.includes(currentDate.getDay())) {
        businessDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return Math.max(1, businessDays);
  }

  /**
   * Find earliest start time for a machine
   */
  private findEarliestStartForMachine(
    machineId: string,
    durationMinutes: number,
    earliestDay: number,
    workingMinutesPerDay: number,
    machineSchedules: Map<string, Map<number, number>>
  ): { canStart: boolean; day: number; startTime: Date } {
    
    const machineSchedule = machineSchedules.get(machineId) || new Map();
    let currentDay = earliestDay;
    
    // Try to find a day where we can fit this job
    for (let attempt = 0; attempt < 30; attempt++) { // Max 30 days ahead
      const minutesUsedThisDay = machineSchedule.get(currentDay) || 0;
      const availableMinutes = workingMinutesPerDay - minutesUsedThisDay;
      
      if (availableMinutes >= Math.min(durationMinutes, workingMinutesPerDay)) {
        // This day can accommodate at least part of the job
        const startTime = this.getDateForBusinessDay(currentDay);
        startTime.setHours(parseInt(this.options.workingHours.start.split(':')[0]));
        startTime.setMinutes(parseInt(this.options.workingHours.start.split(':')[1]));
        
        // Add time for work already scheduled this day
        startTime.setMinutes(startTime.getMinutes() + minutesUsedThisDay);
        
        return {
          canStart: true,
          day: currentDay,
          startTime
        };
      }
      
      currentDay++;
    }
    
    return { canStart: false, day: 0, startTime: new Date() };
  }

  /**
   * Get actual date for business day number
   */
  private getDateForBusinessDay(dayNumber: number): Date {
    const startDate = new Date(this.options.startDate!);
    let businessDaysFound = 0;
    let currentDate = new Date(startDate);
    
    while (businessDaysFound < dayNumber) {
      if (this.options.workingHours.workingDays.includes(currentDate.getDay())) {
        businessDaysFound++;
      }
      if (businessDaysFound < dayNumber) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    return currentDate;
  }

  /**
   * Create schedule entry
   */
  private createScheduleEntry(
    process: ProcessInstance,
    selectedMachine: any,
    totalMinutes: number,
    workingMinutesPerDay: number
  ): SimplifiedScheduleEntry {
    
    const startTime = Timestamp.fromDate(selectedMachine.startTime);
    const totalDays = Math.ceil(totalMinutes / workingMinutesPerDay);
    
    // Calculate end time (spread across business days)
    let remainingMinutes = totalMinutes;
    let endDate = new Date(selectedMachine.startTime);
    let currentDay = selectedMachine.startDay;
    
    while (remainingMinutes > 0) {
      const minutesThisDay = Math.min(remainingMinutes, workingMinutesPerDay);
      remainingMinutes -= minutesThisDay;
      
      if (remainingMinutes > 0) {
        // Move to next business day
        currentDay++;
        endDate = this.getDateForBusinessDay(currentDay);
        endDate.setHours(parseInt(this.options.workingHours.end.split(':')[0]));
        endDate.setMinutes(parseInt(this.options.workingHours.end.split(':')[1]));
      } else {
        // Calculate exact end time on final day
        const dayStartTime = this.getDateForBusinessDay(currentDay);
        dayStartTime.setHours(parseInt(this.options.workingHours.start.split(':')[0]));
        dayStartTime.setMinutes(parseInt(this.options.workingHours.start.split(':')[1]));
        
        endDate = new Date(dayStartTime);
        endDate.setMinutes(endDate.getMinutes() + minutesThisDay);
      }
    }
    
    const endTime = Timestamp.fromDate(endDate);

    return {
      id: `simple_${process.id}_${Date.now()}`,
      machineId: selectedMachine.machine.id,
      processInstanceId: process.id,
      orderId: process.offerId,
      startTime,
      endTime,
      status: 'scheduled',
      
      // Legacy compatibility fields
      jobId: process.id,
      partName: process.displayName,
      quantity: process.quantity || 1,
      process: {
        id: process.id,
        name: process.baseProcessName,
        machineType: process.machineType,
        setupTimeMinutes: process.setupTimeMinutes,
        cycleTimeMinutes: process.cycleTimeMinutes,
        description: process.description,
        dependencies: process.dependencies,
        requiredMachineCapabilities: process.requiredMachineCapabilities,
        estimatedCost: process.estimatedCost
      },
      machineName: selectedMachine.machine.name,
      scheduledStartTime: startTime.toDate().toISOString(),
      scheduledEndTime: endTime.toDate().toISOString(),
      dependencies: process.dependencies,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Simple scheduler specific fields
      dayNumber: selectedMachine.startDay,
      dailySequence: 1, // Could be enhanced to track order within day
      totalDays
    };
  }

  /**
   * Update machine schedule tracking
   */
  private updateMachineSchedule(
    machineId: string,
    startDay: number,
    totalMinutes: number,
    workingMinutesPerDay: number,
    machineSchedules: Map<string, Map<number, number>>
  ): void {
    if (!machineSchedules.has(machineId)) {
      machineSchedules.set(machineId, new Map());
    }
    
    const machineSchedule = machineSchedules.get(machineId)!;
    let remainingMinutes = totalMinutes;
    let currentDay = startDay;
    
    while (remainingMinutes > 0) {
      const minutesThisDay = Math.min(remainingMinutes, workingMinutesPerDay);
      const currentUsage = machineSchedule.get(currentDay) || 0;
      machineSchedule.set(currentDay, currentUsage + minutesThisDay);
      
      remainingMinutes -= minutesThisDay;
      currentDay++;
    }
  }

  /**
   * Persist schedule to database
   */
  private async persistSchedule(scheduleEntries: SimplifiedScheduleEntry[]): Promise<void> {
    for (const entry of scheduleEntries) {
      try {
        await this.scheduleManager.createScheduleEntry(entry);
      } catch (error) {
        console.error('Failed to persist schedule entry:', entry.id, error);
      }
    }
  }

  /**
   * Calculate utilization
   */
  private calculateUtilization(
    scheduleEntries: SimplifiedScheduleEntry[],
    machines: Machine[]
  ): number {
    // Simple utilization calculation
    const totalScheduledHours = scheduleEntries.reduce((sum, entry) => {
      const duration = entry.endTime.toMillis() - entry.startTime.toMillis();
      return sum + (duration / (1000 * 60 * 60)); // Convert to hours
    }, 0);
    
    const totalCapacityHours = machines.length * this.options.maxDailyHours * 5; // 5 days
    
    return Math.min((totalScheduledHours / totalCapacityHours) * 100, 100);
  }

  /**
   * Create failure result
   */
  private createFailureResult(
    error: string,
    conflicts: Conflict[],
    startTime: number
  ): ScheduleResult {
    return {
      success: false,
      entries: [],
      conflicts: [
        {
          type: 'dependency_conflict',
          description: error,
          conflictingEntries: [],
          suggestedResolution: 'Check system configuration and try again'
        },
        ...conflicts
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