import { Timestamp } from 'firebase/firestore';
import { TimeSlot, TimeWindow, WorkingConfiguration, Machine } from '@/types/planning';
import { ScheduleManager } from './schedule-manager';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export class AvailabilityCalculator {
  private scheduleManager: ScheduleManager;
  private defaultWorkingConfig: WorkingConfiguration = {
    defaultWorkingHours: { start: '08:00', end: '17:00' },
    workingDaysPerWeek: [1, 2, 3, 4, 5], // Monday to Friday
    timeZone: 'Europe/Berlin',
    bufferTimePercentage: 10,
    breakTimes: [
      { start: '12:00', end: '13:00' } // Lunch break
    ]
  };

  constructor() {
    this.scheduleManager = new ScheduleManager();
  }

  /**
   * Calculate the next available time for a machine
   */
  async calculateNextAvailable(machineId: string): Promise<Timestamp> {
    try {
      console.log(`🔍 AvailabilityCalculator: Calculating next available time for machine ${machineId}`);
      
      // Get machine data to check current workload and availability
      const machine = await this.getMachine(machineId);
      if (!machine) {
        throw new Error(`Machine ${machineId} not found`);
      }

      console.log(`   📋 Machine found: ${machine.name}, availableFrom: ${machine.availableFrom?.toDate().toISOString()}`);

      // If machine has a specific availableFrom time, use that
      if (machine.availableFrom) {
        return machine.availableFrom;
      }

      // Otherwise, get the latest scheduled end time
      const schedules = await this.scheduleManager.getMachineSchedule(machineId);
      console.log(`   📊 Found ${schedules.length} existing schedules for machine`);
      
      if (schedules.length === 0) {
        // No schedules, available now
        const now = Timestamp.now();
        console.log(`   ✅ No schedules, available now: ${now.toDate().toISOString()}`);
        return now;
      }

      // Find the latest end time
      const latestEndTime = schedules.reduce((latest, schedule) => {
        return schedule.endTime.toMillis() > latest.toMillis() ? schedule.endTime : latest;
      }, schedules[0].endTime);

      console.log(`   ⏰ Latest end time: ${latestEndTime.toDate().toISOString()}`);
      return latestEndTime;
    } catch (error) {
      console.error('❌ Error calculating next available time:', error);
      throw new Error('Failed to calculate next available time');
    }
  }

  /**
   * Get available time slots for a machine that can fit a job of specified duration
   */
  async getAvailableTimeSlots(machineId: string, durationMinutes: number): Promise<TimeSlot[]> {
    try {
      console.log(`🔍 AvailabilityCalculator: Getting time slots for machine ${machineId}, duration ${durationMinutes} minutes`);
      
      const machine = await this.getMachine(machineId);
      if (!machine) {
        throw new Error(`Machine ${machineId} not found`);
      }

      console.log(`   📋 Machine: ${machine.name} (${machine.type})`);

      // Get current schedules
      const schedules = await this.scheduleManager.getMachineSchedule(machineId);
      console.log(`   📊 Found ${schedules.length} existing schedules`);
      
      const availableSlots: TimeSlot[] = [];

      // Get working hours for the machine (or use defaults)
      const workingHours = machine.workingHours || this.defaultWorkingConfig.defaultWorkingHours;
      const workingDays = machine.workingHours?.workingDays || this.defaultWorkingConfig.workingDaysPerWeek;

      console.log(`   ⏰ Working hours: ${workingHours.start} - ${workingHours.end}`);
      console.log(`   📅 Working days: [${workingDays.join(', ')}]`);

      // Start from tomorrow to avoid current day complications
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      console.log(`   📅 Checking availability from: ${tomorrow.toISOString()}`);
      
      // Calculate slots for the next 21 days (3 weeks) to ensure we find working days
      for (let dayOffset = 0; dayOffset < 21; dayOffset++) {
        const currentDate = new Date(tomorrow.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        
        // JavaScript getDay(): 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
        // Our workingDays: [1,2,3,4,5] = Monday to Friday
        const dayOfWeek = currentDate.getDay();
        
        console.log(`     Day ${dayOffset + 1}: ${currentDate.toDateString()} (JS day: ${dayOfWeek})`);

        // Skip non-working days - check if this day is in working days
        if (!workingDays.includes(dayOfWeek)) {
          console.log(`       ⏭️  Skipping non-working day (${dayOfWeek} not in [${workingDays.join(', ')}])`);
          continue;
        }

        console.log(`       ✅ Working day - checking availability`);

        // Create working hours for this day
        const workingStart = this.createDateTimeFromTimeString(currentDate, workingHours.start);
        const workingEnd = this.createDateTimeFromTimeString(currentDate, workingHours.end);

        console.log(`       ⏰ Working period: ${workingStart.toISOString()} - ${workingEnd.toISOString()}`);

        // Check for available slots within working hours
        const daySlots = this.findAvailableSlotsInDay(
          workingStart,
          workingEnd,
          schedules,
          durationMinutes,
          machine.maintenanceWindows || []
        );

        console.log(`       ✅ Found ${daySlots.length} slots for this day`);
        availableSlots.push(...daySlots);

        // If we found enough slots, we can stop early
        if (availableSlots.length >= 10) {
          console.log(`   🎯 Found sufficient slots (${availableSlots.length}), stopping search`);
          break;
        }
      }

      console.log(`   🎯 Total available slots found: ${availableSlots.length}`);
      
      // Log first few slots for debugging
      availableSlots.slice(0, 3).forEach((slot, index) => {
        console.log(`     Slot ${index + 1}: ${slot.start.toDate().toISOString()} - ${slot.end.toDate().toISOString()} (${slot.duration} min)`);
      });

      return availableSlots;
    } catch (error) {
      console.error('❌ Error getting available time slots:', error);
      throw new Error('Failed to get available time slots');
    }
  }

  /**
   * Check if a time window conflicts with maintenance
   */
  async checkMaintenanceConflicts(machineId: string, timeWindow: TimeWindow): Promise<boolean> {
    try {
      const machine = await this.getMachine(machineId);
      if (!machine || !machine.maintenanceWindows) {
        return false;
      }

      const windowStart = new Date(timeWindow.start).getTime();
      const windowEnd = new Date(timeWindow.end).getTime();

      return machine.maintenanceWindows.some(maintenance => {
        const maintenanceStart = new Date(maintenance.start).getTime();
        const maintenanceEnd = new Date(maintenance.end).getTime();

        // Check for overlap
        return windowStart < maintenanceEnd && maintenanceStart < windowEnd;
      });
    } catch (error) {
      console.error('Error checking maintenance conflicts:', error);
      return false; // Assume no conflict on error
    }
  }

  /**
   * Estimate completion time for a schedule entry
   */
  async estimateCompletionTime(machineId: string, startTime: Timestamp, durationMinutes: number): Promise<Timestamp> {
    try {
      const machine = await this.getMachine(machineId);
      const bufferPercentage = this.defaultWorkingConfig.bufferTimePercentage;
      
      // Add buffer time
      const totalDuration = durationMinutes * (1 + bufferPercentage / 100);
      
      // Calculate end time
      const endTime = new Date(startTime.toMillis() + totalDuration * 60 * 1000);
      
      console.log(`   ⏱️  Completion time: ${endTime.toISOString()} (${totalDuration} minutes with ${bufferPercentage}% buffer)`);
      
      return Timestamp.fromDate(endTime);
    } catch (error) {
      console.error('Error estimating completion time:', error);
      throw new Error('Failed to estimate completion time');
    }
  }

  /**
   * Get machine data from Firestore
   */
  private async getMachine(machineId: string): Promise<Machine | null> {
    try {
      console.log(`   🔍 Fetching machine data for ${machineId}`);
      const machineDoc = await getDoc(doc(db, 'machines', machineId));
      if (!machineDoc.exists()) {
        console.log(`   ❌ Machine document not found`);
        return null;
      }

      const data = machineDoc.data();
      console.log(`   ✅ Machine data loaded:`, {
        name: data.name,
        type: data.type,
        isActive: data.isActive,
        workingHours: data.workingHours,
        availableFrom: data.availableFrom?.toDate()?.toISOString()
      });

      return {
        id: machineDoc.id,
        ...data,
        availableFrom: data.availableFrom || Timestamp.now(),
      } as Machine;
    } catch (error) {
      console.error('   ❌ Error getting machine:', error);
      return null;
    }
  }

  /**
   * Create a DateTime from a date and time string (e.g., "08:00")
   */
  private createDateTimeFromTimeString(date: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Find available slots within a working day
   */
  private findAvailableSlotsInDay(
    workingStart: Date,
    workingEnd: Date,
    schedules: any[],
    durationMinutes: number,
    maintenanceWindows: TimeWindow[]
  ): TimeSlot[] {
    console.log(`         🔍 Finding slots in day: ${workingStart.toDateString()}`);
    console.log(`         ⏰ Duration needed: ${durationMinutes} minutes`);
    
    const slots: TimeSlot[] = [];
    const dayStart = workingStart.getTime();
    const dayEnd = workingEnd.getTime();

    // Get all occupied periods (schedules + maintenance)
    const occupiedPeriods: { start: number; end: number }[] = [];

    // Add scheduled jobs
    schedules.forEach(schedule => {
      const scheduleStart = schedule.startTime.toMillis();
      const scheduleEnd = schedule.endTime.toMillis();
      
      // Only include if it overlaps with this working day
      if (scheduleStart < dayEnd && scheduleEnd > dayStart) {
        occupiedPeriods.push({
          start: Math.max(scheduleStart, dayStart),
          end: Math.min(scheduleEnd, dayEnd)
        });
        console.log(`         📅 Schedule conflict: ${new Date(scheduleStart).toISOString()} - ${new Date(scheduleEnd).toISOString()}`);
      }
    });

    // Add maintenance windows
    maintenanceWindows.forEach(maintenance => {
      const maintenanceStart = new Date(maintenance.start).getTime();
      const maintenanceEnd = new Date(maintenance.end).getTime();
      
      if (maintenanceStart < dayEnd && maintenanceEnd > dayStart) {
        occupiedPeriods.push({
          start: Math.max(maintenanceStart, dayStart),
          end: Math.min(maintenanceEnd, dayEnd)
        });
        console.log(`         🔧 Maintenance window: ${maintenance.start} - ${maintenance.end}`);
      }
    });

    // Add break times
    this.defaultWorkingConfig.breakTimes.forEach(breakTime => {
      const breakStart = this.createDateTimeFromTimeString(new Date(dayStart), breakTime.start).getTime();
      const breakEnd = this.createDateTimeFromTimeString(new Date(dayStart), breakTime.end).getTime();
      
      if (breakStart < dayEnd && breakEnd > dayStart) {
        occupiedPeriods.push({
          start: breakStart,
          end: breakEnd
        });
        console.log(`         ☕ Break time: ${breakTime.start} - ${breakTime.end}`);
      }
    });

    console.log(`         📊 Found ${occupiedPeriods.length} occupied periods`);

    // Sort occupied periods by start time
    occupiedPeriods.sort((a, b) => a.start - b.start);

    // Merge overlapping periods
    const mergedPeriods: { start: number; end: number }[] = [];
    occupiedPeriods.forEach(period => {
      if (mergedPeriods.length === 0) {
        mergedPeriods.push(period);
      } else {
        const last = mergedPeriods[mergedPeriods.length - 1];
        if (period.start <= last.end) {
          last.end = Math.max(last.end, period.end);
        } else {
          mergedPeriods.push(period);
        }
      }
    });

    console.log(`         🔗 After merging: ${mergedPeriods.length} periods`);

    // Find gaps that can fit the required duration
    let currentTime = Math.max(dayStart, Date.now()); // Don't schedule in the past
    console.log(`         ⏰ Starting search from: ${new Date(currentTime).toISOString()}`);

    mergedPeriods.forEach(period => {
      const gapDuration = (period.start - currentTime) / (1000 * 60); // minutes
      console.log(`         🕳️  Gap found: ${gapDuration} minutes (${new Date(currentTime).toISOString()} - ${new Date(period.start).toISOString()})`);
      
      if (gapDuration >= durationMinutes) {
        slots.push({
          start: Timestamp.fromMillis(currentTime),
          end: Timestamp.fromMillis(period.start),
          duration: gapDuration
        });
        console.log(`         ✅ Available slot: ${gapDuration} minutes`);
      }
      
      currentTime = period.end;
    });

    // Check final gap until end of working day
    const finalGapDuration = (dayEnd - currentTime) / (1000 * 60);
    console.log(`         🏁 Final gap: ${finalGapDuration} minutes (${new Date(currentTime).toISOString()} - ${new Date(dayEnd).toISOString()})`);
    
    if (finalGapDuration >= durationMinutes) {
      slots.push({
        start: Timestamp.fromMillis(currentTime),
        end: Timestamp.fromMillis(dayEnd),
        duration: finalGapDuration
      });
      console.log(`         ✅ Final slot available: ${finalGapDuration} minutes`);
    }

    console.log(`         🎯 Day result: ${slots.length} available slots`);
    return slots;
  }
} 