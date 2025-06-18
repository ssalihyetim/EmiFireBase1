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
        console.log(`⚠️ Machine ${machineId} not found in Firestore, using fallback scheduling`);
        // Return a basic time slot for immediate scheduling with default working hours
        const now = new Date();
        const today = new Date(now);
        today.setHours(8, 0, 0, 0); // Start at 8 AM today
        
        // If it's already past 8 AM, schedule for tomorrow
        if (now.getHours() >= 8) {
          today.setDate(today.getDate() + 1);
        }
        
        const endTime = new Date(today.getTime() + durationMinutes * 60 * 1000);
        
        console.log(`   🔄 Fallback slot: ${today.toISOString()} - ${endTime.toISOString()}`);
        
        return [{
          start: Timestamp.fromDate(today),
          end: Timestamp.fromDate(endTime),
          duration: durationMinutes
        }];
      }

      console.log(`   📋 Machine: ${machine.name} (${machine.type})`);
      return this.calculateSlotsForMachine(machine, durationMinutes);
    } catch (error) {
      console.error('❌ Error getting available time slots:', error);
      throw new Error('Failed to get available time slots');
    }
  }

  /**
   * Calculate available slots for a given machine
   */
  private async calculateSlotsForMachine(machine: any, durationMinutes: number): Promise<TimeSlot[]> {
    console.log(`   🏗️  calculateSlotsForMachine starting for machine ${machine.name || machine.id}`);
    console.log(`   🏗️  Duration needed: ${durationMinutes} minutes`);
    
    // Get current schedules with error handling
    let schedules: any[] = [];
    try {
      schedules = await this.scheduleManager.getMachineSchedule(machine.id);
      console.log(`   📊 Found ${schedules.length} existing schedules`);
    } catch (error) {
      console.warn(`   ⚠️  Could not get machine schedule (probably no schedules exist yet):`, error);
      schedules = [];
    }
    
    const availableSlots: TimeSlot[] = [];

    // Get working hours for the machine (or use defaults)
    const workingHours = machine.workingHours || this.defaultWorkingConfig.defaultWorkingHours;
    const workingDays = machine.workingHours?.workingDays || this.defaultWorkingConfig.workingDaysPerWeek;

    console.log(`   ⏰ Working hours: ${workingHours.start} - ${workingHours.end}`);
    console.log(`   📅 Working days: [${workingDays.join(', ')}]`);
    console.log(`   🕒 Duration needed: ${durationMinutes} minutes`);

    // Calculate daily working minutes (accounting for breaks)
    const dailyWorkingMinutes = this.calculateDailyWorkingMinutes(workingHours);
    console.log(`   ⏱️ Daily working minutes available: ${dailyWorkingMinutes}`);

    // Check if operation requires multiple days
    if (durationMinutes > dailyWorkingMinutes) {
      console.log(`   📅 Multi-day operation detected: ${durationMinutes} minutes > ${dailyWorkingMinutes} daily`);
      return await this.calculateMultiDaySlots(machine, durationMinutes, schedules, workingHours, workingDays);
    }

    // Single-day operation - use existing logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`   📅 Checking availability from: ${today.toISOString()}`);
    
    // Calculate slots for the next 14 days (2 weeks) to ensure we find working days
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const currentDate = new Date(today.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      
          // JavaScript getDay(): 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
    // Our workingDays: [1,2,3,4,5] = Monday to Friday
    const dayOfWeek = currentDate.getDay();
    
    console.log(`     Day ${dayOffset + 1}: ${currentDate.toDateString()} (JS day: ${dayOfWeek})`);

    // Skip non-working days - check if this day is in working days
    // However, allow weekends if the operation specifically allows weekend work
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const allowWeekends = machine.allowWeekends || false; // Check if machine/operation allows weekends
    
    if (!workingDays.includes(dayOfWeek) && !(isWeekend && allowWeekends)) {
      console.log(`       ⏭️  Skipping non-working day (${dayOfWeek} not in [${workingDays.join(', ')}]) and weekend work not allowed`);
      continue;
    }

      console.log(`       ✅ Working day - checking availability`);

          // Create working hours for this day
    // Check if after-hours operations are allowed for this machine/operation
    const allowAfterHours = machine.allowAfterHours || false;
    const effectiveWorkingHours = allowAfterHours 
      ? { start: '06:00', end: '22:00' } // Extended hours: 6 AM - 10 PM
      : workingHours; // Normal hours: 8 AM - 5 PM
    
    const workingStart = this.createDateTimeFromTimeString(currentDate, effectiveWorkingHours.start);
    const workingEnd = this.createDateTimeFromTimeString(currentDate, effectiveWorkingHours.end);

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
      if (availableSlots.length >= 5) {
        console.log(`   🎯 Found sufficient slots (${availableSlots.length}), stopping search`);
        break;
      }
    }

    console.log(`   🎯 FINAL RESULT: ${availableSlots.length} available slots found`);
    
    // Log first few slots for debugging
    if (availableSlots.length > 0) {
      availableSlots.slice(0, 3).forEach((slot, index) => {
        console.log(`     ✅ Slot ${index + 1}: ${slot.start.toDate().toISOString()} - ${slot.end.toDate().toISOString()} (${slot.duration} min)`);
      });
    } else {
      console.log(`   ❌ NO SLOTS FOUND! This is the problem.`);
    }

    console.log(`   🎯 Total available slots found: ${availableSlots.length}`);
    
    // If no slots found, provide a realistic multi-day fallback
    if (availableSlots.length === 0) {
      console.log(`   🚨 NO SLOTS FOUND! Creating realistic multi-day fallback slot`);
      return await this.createRealisticFallbackSlot(machine, durationMinutes, workingHours, workingDays);
    }

    return availableSlots;
  }

  /**
   * Calculate daily working minutes accounting for breaks
   */
  private calculateDailyWorkingMinutes(workingHours: { start: string; end: string }): number {
    const startTime = this.parseTimeString(workingHours.start);
    const endTime = this.parseTimeString(workingHours.end);
    const totalMinutes = (endTime.hours * 60 + endTime.minutes) - (startTime.hours * 60 + startTime.minutes);
    
    // Subtract break times
    let breakMinutes = 0;
    this.defaultWorkingConfig.breakTimes.forEach(breakTime => {
      const breakStart = this.parseTimeString(breakTime.start);
      const breakEnd = this.parseTimeString(breakTime.end);
      breakMinutes += (breakEnd.hours * 60 + breakEnd.minutes) - (breakStart.hours * 60 + breakStart.minutes);
    });
    
    return totalMinutes - breakMinutes;
  }

  /**
   * Parse time string like "08:00" into hours and minutes
   */
  private parseTimeString(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  }

  /**
   * Calculate multi-day slots for operations that exceed daily working hours
   */
  private async calculateMultiDaySlots(
    machine: any,
    durationMinutes: number,
    schedules: any[],
    workingHours: { start: string; end: string },
    workingDays: number[]
  ): Promise<TimeSlot[]> {
    console.log(`   📅 Calculating multi-day slots for ${durationMinutes} minutes`);
    
    const dailyWorkingMinutes = this.calculateDailyWorkingMinutes(workingHours);
    const daysNeeded = Math.ceil(durationMinutes / dailyWorkingMinutes);
    
    console.log(`   📊 Days needed: ${daysNeeded} (${durationMinutes} ÷ ${dailyWorkingMinutes})`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find first available sequence of working days
    for (let startOffset = 0; startOffset < 30; startOffset++) {
      const startDate = new Date(today.getTime() + startOffset * 24 * 60 * 60 * 1000);
      
      if (!workingDays.includes(startDate.getDay())) {
        continue; // Skip non-working days
      }
      
      const consecutiveWorkingDays = await this.findConsecutiveWorkingDays(
        startDate,
        daysNeeded,
        workingDays,
        schedules,
        workingHours,
        machine
      );
      
      if (consecutiveWorkingDays.length >= daysNeeded) {
        // Create multi-day slot
        const multiDaySlot = this.createMultiDaySlot(
          consecutiveWorkingDays,
          durationMinutes,
          workingHours,
          dailyWorkingMinutes
        );
        
        if (multiDaySlot) {
          console.log(`   ✅ Multi-day slot created: ${multiDaySlot.start.toDate().toISOString()} - ${multiDaySlot.end.toDate().toISOString()}`);
          return [multiDaySlot];
        }
      }
    }
    
    console.log(`   ❌ Could not find suitable multi-day slot`);
    return [];
  }

  /**
   * Find consecutive working days that are available
   */
  private async findConsecutiveWorkingDays(
    startDate: Date,
    daysNeeded: number,
    workingDays: number[],
    schedules: any[],
    workingHours: { start: string; end: string },
    machine: any
  ): Promise<Date[]> {
    const availableDays: Date[] = [];
    let currentDate = new Date(startDate);
    let daysChecked = 0;
    
    while (availableDays.length < daysNeeded && daysChecked < 60) {
      if (workingDays.includes(currentDate.getDay())) {
        // Check if this day has enough availability
        const workingStart = this.createDateTimeFromTimeString(currentDate, workingHours.start);
        const workingEnd = this.createDateTimeFromTimeString(currentDate, workingHours.end);
        
        const daySlots = this.findAvailableSlotsInDay(
          workingStart,
          workingEnd,
          schedules,
          60, // Just check if we have some availability
          machine.maintenanceWindows || []
        );
        
        if (daySlots.length > 0) {
          availableDays.push(new Date(currentDate));
        } else {
          // If any day in sequence is not available, restart
          availableDays.length = 0;
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
      daysChecked++;
    }
    
    return availableDays;
  }

  /**
   * Create a multi-day time slot
   */
  private createMultiDaySlot(
    workingDays: Date[],
    totalDurationMinutes: number,
    workingHours: { start: string; end: string },
    dailyWorkingMinutes: number
  ): TimeSlot | null {
    if (workingDays.length === 0) return null;
    
    const startDate = workingDays[0];
    const startTime = this.createDateTimeFromTimeString(startDate, workingHours.start);
    
    // Calculate end time across multiple days
    let remainingMinutes = totalDurationMinutes;
    let endTime = new Date(startTime);
    
    for (const workingDay of workingDays) {
      const dayStart = this.createDateTimeFromTimeString(workingDay, workingHours.start);
      const dayEnd = this.createDateTimeFromTimeString(workingDay, workingHours.end);
      
      if (remainingMinutes <= dailyWorkingMinutes) {
        // This is the final day
        endTime = new Date(dayStart.getTime() + remainingMinutes * 60 * 1000);
        break;
      } else {
        // Use full working day
        remainingMinutes -= dailyWorkingMinutes;
        endTime = dayEnd;
      }
    }
    
    return {
      start: Timestamp.fromDate(startTime),
      end: Timestamp.fromDate(endTime),
      duration: totalDurationMinutes
    };
  }

  /**
   * Create realistic fallback slot that respects working hours
   */
  private async createRealisticFallbackSlot(
    machine: any,
    durationMinutes: number,
    workingHours: { start: string; end: string },
    workingDays: number[]
  ): Promise<TimeSlot[]> {
    console.log(`   🔄 Creating realistic fallback slot for ${durationMinutes} minutes`);
    
    const today = new Date();
    let startDate = new Date(today);
    
    // Find next working day
    while (!workingDays.includes(startDate.getDay())) {
      startDate.setDate(startDate.getDate() + 1);
    }
    
    const dailyWorkingMinutes = this.calculateDailyWorkingMinutes(workingHours);
    
    if (durationMinutes <= dailyWorkingMinutes) {
      // Single day operation
      const startTime = this.createDateTimeFromTimeString(startDate, workingHours.start);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
      
      return [{
        start: Timestamp.fromDate(startTime),
        end: Timestamp.fromDate(endTime),
        duration: durationMinutes
      }];
    } else {
      // Multi-day operation
      const daysNeeded = Math.ceil(durationMinutes / dailyWorkingMinutes);
      console.log(`   📅 Fallback: ${daysNeeded} days needed for ${durationMinutes} minutes`);
      
      // Find required number of working days
      const workingDaysList: Date[] = [];
      let currentDate = new Date(startDate);
      
      while (workingDaysList.length < daysNeeded) {
        if (workingDays.includes(currentDate.getDay())) {
          workingDaysList.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const multiDaySlot = this.createMultiDaySlot(
        workingDaysList,
        durationMinutes,
        workingHours,
        dailyWorkingMinutes
      );
      
      if (multiDaySlot) {
        console.log(`   ✅ Realistic fallback created: ${multiDaySlot.start.toDate().toISOString()} - ${multiDaySlot.end.toDate().toISOString()}`);
        return [multiDaySlot];
      }
    }
    
    return [];
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
        console.log(`   ❌ Machine document not found for ID: ${machineId}`);
        console.log(`   💡 This might be a timing issue if machines were just seeded`);
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
    const now = Date.now();
    const isToday = new Date(dayStart).toDateString() === new Date(now).toDateString();
    
    // For today, start from current time or start of working hours, whichever is later
    // For future days, start from beginning of working hours
    let currentTime = isToday ? Math.max(dayStart, now) : dayStart;
    
    console.log(`         ⏰ Starting search from: ${new Date(currentTime).toISOString()} (isToday: ${isToday})`);

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