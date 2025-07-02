import { Timestamp } from 'firebase/firestore';
import { 
  ProcessInstance, 
  ScheduleResult, 
  ScheduleEntry, 
  Conflict,
  Machine,
  PriorityLevel
} from '@/types/planning';
import { ScheduleManager } from './schedule-manager';
import { AvailabilityCalculator } from './availability-calculator';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export class AutoScheduler {
  private scheduleManager: ScheduleManager;
  private availabilityCalculator: AvailabilityCalculator;

  constructor() {
    this.scheduleManager = new ScheduleManager();
    this.availabilityCalculator = new AvailabilityCalculator();
  }

  /**
   * Get actual part name from job/offer data
   */
  private async getPartNameFromJob(processInstanceId: string, offerId: string): Promise<string | null> {
    try {
      // Extract job ID from process instance ID (format: jobId_processName_number)
      // Handle lot tracking format: jobId-lot-X_processName_number
      const jobIdMatch = processInstanceId.match(/^(.+?)_[^_]+_\d+$/);
      if (!jobIdMatch) return null;
      
      let jobId = jobIdMatch[1];
      
      // Remove lot suffix if present for database lookup
      if (jobId.includes('-lot-')) {
        jobId = jobId.split('-lot-')[0];
      }
      
      // Try to get job data first
      const jobDoc = await getDocs(query(collection(db, 'jobs'), where('id', '==', jobId)));
      if (!jobDoc.empty) {
        const jobData = jobDoc.docs[0].data();
        return jobData.item?.partName || null;
      }
      
      // Fallback: try to get from order data
      const orderDoc = await getDocs(query(collection(db, 'orders'), where('id', '==', offerId)));
      if (!orderDoc.empty) {
        const orderData = orderDoc.docs[0].data();
        // Find the item that matches this job
        const targetItem = orderData.items?.find((item: any) => 
          jobId.includes(item.id) || jobId.includes(orderData.items.indexOf(item).toString())
        );
        return targetItem?.partName || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting part name from job:', error);
      return null;
    }
  }

  /**
   * Main auto-scheduling method
   */
  async scheduleProcessInstances(processInstances: ProcessInstance[]): Promise<ScheduleResult> {
    const startTime = Date.now();
    const scheduleEntries: ScheduleEntry[] = [];
    const conflicts: Conflict[] = [];

    try {
      console.log(`🚀 AutoScheduler: Starting scheduling for ${processInstances.length} process instances`);

      // Step 1: Validate process instances
      const validation = this.validateProcessInstances(processInstances);
      if (!validation.isValid) {
        console.error('❌ Process validation failed:', validation.errors);
        return {
          success: false,
          entries: [],
          conflicts: validation.errors.map(error => ({
            type: 'machine_conflict' as const,
            description: error,
            conflictingEntries: [],
            suggestedResolution: 'Fix process instance data'
          })),
          metrics: {
            totalScheduledJobs: 0,
            averageUtilization: 0,
            onTimeDeliveryRate: 0,
            schedulingDurationMs: Date.now() - startTime
          }
        };
      }

      // Step 2: Resolve dependencies and sort by priority
      const sortedInstances = await this.sortByPriorityAndDependencies(processInstances);
      console.log(`📋 AutoScheduler: Sorted ${sortedInstances.length} instances by priority`);

      // Step 3: Get all available machines
      const machines = await this.getMachines();
      console.log(`🔧 AutoScheduler: Found ${machines.length} machines in database`);
      
      if (machines.length === 0) {
        console.error('❌ No machines found in database');
        return {
          success: false,
          entries: [],
          conflicts: [{
            type: 'machine_conflict',
            description: 'No machines available in the system',
            conflictingEntries: [],
            suggestedResolution: 'Add machines to the database first'
          }],
          metrics: {
            totalScheduledJobs: 0,
            averageUtilization: 0,
            onTimeDeliveryRate: 0,
            schedulingDurationMs: Date.now() - startTime
          }
        };
      }

      // Log machine details
      machines.forEach(machine => {
        console.log(`   📍 Machine: ${machine.name} (${machine.type}) - Active: ${machine.isActive}`);
      });

      // Step 4: Schedule each process instance
      for (const processInstance of sortedInstances) {
        try {
          console.log(`\n🔄 Processing: ${processInstance.displayName} (${processInstance.machineType})`);
          const scheduleEntry = await this.scheduleProcessInstance(processInstance, machines);
          if (scheduleEntry) {
            scheduleEntries.push(scheduleEntry);
            console.log(`✅ Successfully scheduled: ${processInstance.displayName} on ${scheduleEntry.machineName}`);
            
            // Save to database
            await this.scheduleManager.createScheduleEntry(scheduleEntry);
          }
        } catch (error) {
          console.error(`❌ Failed to schedule process instance ${processInstance.id}:`, error);
          conflicts.push({
            type: 'machine_conflict',
            description: `Failed to schedule process ${processInstance.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            conflictingEntries: [processInstance.id],
            suggestedResolution: 'Check machine availability or extend working hours'
          });
        }
      }

      // Step 5: Calculate metrics
      const metrics = this.calculateMetrics(scheduleEntries, startTime);

      console.log(`🎯 AutoScheduler: Completed - ${scheduleEntries.length} scheduled, ${conflicts.length} conflicts`);

      return {
        success: conflicts.length === 0,
        entries: scheduleEntries,
        conflicts,
        metrics
      };

    } catch (error) {
      console.error('💥 AutoScheduler: Critical failure:', error);
      return {
        success: false,
        entries: [],
        conflicts: [{
          type: 'machine_conflict',
          description: `Auto-scheduling algorithm failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          conflictingEntries: [],
          suggestedResolution: 'Try manual scheduling or contact support'
        }],
        metrics: {
          totalScheduledJobs: 0,
          averageUtilization: 0,
          onTimeDeliveryRate: 0,
          schedulingDurationMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Schedule a single process instance
   */
  private async scheduleProcessInstance(
    processInstance: ProcessInstance, 
    machines: Machine[]
  ): Promise<ScheduleEntry | null> {
    console.log(`   🔍 Finding capable machines for ${processInstance.machineType} process`);
    
    // Find capable machines
    const capableMachines = machines.filter(machine => {
      const typeMatch = machine.type === processInstance.machineType;
      const activeMatch = machine.isActive;
      const capabilityMatch = this.machineHasCapabilities(machine, processInstance.requiredMachineCapabilities);
      
      console.log(`      Machine ${machine.name}: type=${typeMatch}, active=${activeMatch}, capabilities=${capabilityMatch}`);
      
      return typeMatch && activeMatch && capabilityMatch;
    });

    console.log(`   📊 Found ${capableMachines.length} capable machines`);

    if (capableMachines.length === 0) {
      throw new Error(`No capable machines found for process ${processInstance.displayName}. Required: ${processInstance.machineType} with capabilities: ${processInstance.requiredMachineCapabilities.join(', ')}`);
    }

    // Calculate total duration (setup + cycle * quantity)
    const totalDuration = processInstance.setupTimeMinutes + 
                         (processInstance.cycleTimeMinutes * processInstance.quantity);
    
    console.log(`   ⏱️  Total duration needed: ${totalDuration} minutes (setup: ${processInstance.setupTimeMinutes}, cycle: ${processInstance.cycleTimeMinutes} × ${processInstance.quantity})`);

    // Find the best machine and time slot
    let bestMachine: Machine | null = null;
    let bestStartTime: Timestamp | null = null;

    for (const machine of capableMachines) {
      try {
        console.log(`   🔍 Checking availability for ${machine.name}...`);
        const availableSlots = await this.availabilityCalculator.getAvailableTimeSlots(
          machine.id, 
          totalDuration
        );

        console.log(`      Found ${availableSlots.length} available slots`);
        
        if (availableSlots.length > 0) {
          // Use the earliest available slot
          const earliestSlot = availableSlots[0];
          console.log(`      Earliest slot: ${earliestSlot.start.toDate().toISOString()} for ${earliestSlot.duration} minutes`);
          
          if (!bestStartTime || earliestSlot.start.toMillis() < bestStartTime.toMillis()) {
            bestMachine = machine;
            bestStartTime = earliestSlot.start;
            console.log(`      ✅ New best option: ${machine.name} at ${bestStartTime.toDate().toISOString()}`);
          }
        }
      } catch (error) {
        console.error(`      ❌ Error checking availability for machine ${machine.id}:`, error);
        continue;
      }
    }

    if (!bestMachine || !bestStartTime) {
      throw new Error(`No available time slots found for process ${processInstance.displayName}. Checked ${capableMachines.length} machines.`);
    }

    console.log(`   🎯 Selected: ${bestMachine.name} starting at ${bestStartTime.toDate().toISOString()}`);

    // Calculate end time
    const endTime = await this.availabilityCalculator.estimateCompletionTime(
      bestMachine.id,
      bestStartTime,
      totalDuration
    );

    // Get actual part name from the job/offer
    const actualPartName = await this.getPartNameFromJob(processInstance.id, processInstance.offerId);
    
    // Create schedule entry
    const scheduleEntry: ScheduleEntry = {
      id: `schedule_${processInstance.id}_${Date.now()}`,
      machineId: bestMachine.id,
      processInstanceId: processInstance.id,
      orderId: processInstance.offerId,
      startTime: bestStartTime,
      endTime: endTime,
      status: 'scheduled',
      operatorNotes: '',
      
      // Legacy compatibility fields
      jobId: processInstance.id,
      partName: actualPartName || processInstance.displayName, // Use actual part name
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
      machineName: bestMachine.name,
      scheduledStartTime: bestStartTime.toDate().toISOString(),
      scheduledEndTime: endTime.toDate().toISOString(),
      dependencies: processInstance.dependencies,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return scheduleEntry;
  }

  /**
   * Check if machine has required capabilities
   */
  private machineHasCapabilities(machine: Machine, requiredCapabilities: string[]): boolean {
    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      return true; // No specific capabilities required
    }

    if (!machine.capabilities || machine.capabilities.length === 0) {
      return false; // Machine has no capabilities listed
    }

    return requiredCapabilities.every(required => 
      machine.capabilities!.some(capability => 
        capability.toLowerCase().includes(required.toLowerCase())
      )
    );
  }

  /**
   * Validate process instances
   */
  private validateProcessInstances(processInstances: ProcessInstance[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    processInstances.forEach(instance => {
      if (!instance.quantity || instance.quantity <= 0) {
        errors.push(`Process ${instance.displayName} has invalid quantity`);
      }
      if (!instance.setupTimeMinutes || instance.setupTimeMinutes < 0) {
        errors.push(`Process ${instance.displayName} has invalid setup time`);
      }
      if (!instance.cycleTimeMinutes || instance.cycleTimeMinutes < 0) {
        errors.push(`Process ${instance.displayName} has invalid cycle time`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sort process instances by priority and dependencies
   */
  private async sortByPriorityAndDependencies(processInstances: ProcessInstance[]): Promise<ProcessInstance[]> {
    // Simple priority-based sorting for now
    // In a more sophisticated implementation, this would do topological sorting
    // based on dependencies and then priority within each dependency level
    
    return processInstances.sort((a, b) => {
      // First sort by due date if available
      if (a.dueDate && b.dueDate) {
        const aDue = new Date(a.dueDate).getTime();
        const bDue = new Date(b.dueDate).getTime();
        if (aDue !== bDue) {
          return aDue - bDue;
        }
      }

      // Then by customer priority
      const priorityOrder: Record<PriorityLevel, number> = {
        'urgent': 0,
        'high': 1,
        'medium': 2,
        'low': 3
      };

      const aPriority = priorityOrder[a.customerPriority || 'medium'];
      const bPriority = priorityOrder[b.customerPriority || 'medium'];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Finally by order index
      return a.orderIndex - b.orderIndex;
    });
  }

  /**
   * Get all machines from database
   */
  private async getMachines(): Promise<Machine[]> {
    try {
      console.log('   🔍 Fetching machines from database...');
      const querySnapshot = await getDocs(collection(db, 'machines'));
      const machines: Machine[] = [];

      console.log(`   📊 Raw query returned ${querySnapshot.size} documents`);

      querySnapshot.forEach(doc => {
        try {
          const data = doc.data();
          console.log(`   📋 Processing machine doc ${doc.id}:`, {
            name: data.name,
            type: data.type,
            isActive: data.isActive,
            capabilities: data.capabilities
          });

          machines.push({
            id: doc.id,
            ...data,
            availableFrom: data.availableFrom || Timestamp.now(),
            currentWorkload: data.currentWorkload || 0,
            workingHours: data.workingHours || {
              start: '08:00',
              end: '17:00',
              workingDays: [1, 2, 3, 4, 5]
            },
            maintenanceWindows: data.maintenanceWindows || []
          } as Machine);
        } catch (error) {
          console.error(`   ❌ Error processing machine doc ${doc.id}:`, error);
        }
      });

      console.log(`   ✅ Successfully loaded ${machines.length} machines`);
      return machines;
    } catch (error) {
      console.error('   💥 Error getting machines from database:', error);
      return [];
    }
  }

  /**
   * Calculate scheduling metrics
   */
  private calculateMetrics(scheduleEntries: ScheduleEntry[], startTime: number) {
    const schedulingDurationMs = Date.now() - startTime;
    
    // Basic metrics - can be enhanced
    return {
      totalScheduledJobs: scheduleEntries.length,
      averageUtilization: 75, // Placeholder - would calculate based on machine hours
      onTimeDeliveryRate: 95, // Placeholder - would calculate based on due dates
      schedulingDurationMs
    };
  }
} 