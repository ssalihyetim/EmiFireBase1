import { NextRequest, NextResponse } from 'next/server';
import { ScheduleEntry, ValidationResult } from '@/types/planning';
import { ScheduleManager } from '@/lib/scheduling/schedule-manager';
import { AvailabilityCalculator } from '@/lib/scheduling/availability-calculator';

export async function POST(request: NextRequest) {
  try {
    const { scheduleEntries }: { scheduleEntries: ScheduleEntry[] } = await request.json();
    
    if (!scheduleEntries || !Array.isArray(scheduleEntries)) {
      return NextResponse.json(
        { error: 'Invalid scheduleEntries array' },
        { status: 400 }
      );
    }

    const scheduleManager = new ScheduleManager();
    const availabilityCalculator = new AvailabilityCalculator();
    
    const validationResult: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Validate each schedule entry
    for (const entry of scheduleEntries) {
      // Basic validation
      if (!entry.machineId) {
        validationResult.errors.push(`Schedule entry ${entry.id} missing machineId`);
        continue;
      }

      if (!entry.startTime || !entry.endTime) {
        validationResult.errors.push(`Schedule entry ${entry.id} missing start or end time`);
        continue;
      }

      if (entry.startTime.toMillis() >= entry.endTime.toMillis()) {
        validationResult.errors.push(`Schedule entry ${entry.id} has invalid time range`);
        continue;
      }

      // Check for conflicts with existing schedules
      try {
        const conflicts = await scheduleManager.detectConflicts(entry);
        if (conflicts.length > 0) {
          validationResult.errors.push(
            `Schedule entry ${entry.id} conflicts with existing schedules on machine ${entry.machineId}`
          );
        }
      } catch (error) {
        validationResult.warnings.push(
          `Could not check conflicts for schedule entry ${entry.id}: ${error}`
        );
      }

      // Check maintenance conflicts
      try {
        const hasMaintenanceConflict = await availabilityCalculator.checkMaintenanceConflicts(
          entry.machineId,
          {
            start: entry.startTime.toDate().toISOString(),
            end: entry.endTime.toDate().toISOString()
          }
        );

        if (hasMaintenanceConflict) {
          validationResult.errors.push(
            `Schedule entry ${entry.id} conflicts with maintenance window on machine ${entry.machineId}`
          );
        }
      } catch (error) {
        validationResult.warnings.push(
          `Could not check maintenance conflicts for schedule entry ${entry.id}: ${error}`
        );
      }

      // Check working hours
      const entryStart = entry.startTime.toDate();
      const entryHour = entryStart.getHours();
      
      if (entryHour < 8 || entryHour >= 17) {
        validationResult.warnings.push(
          `Schedule entry ${entry.id} is scheduled outside normal working hours`
        );
      }

      // Check weekend scheduling
      const dayOfWeek = entryStart.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        validationResult.warnings.push(
          `Schedule entry ${entry.id} is scheduled on weekend`
        );
      }
    }

    // Check for overlaps within the provided schedule entries
    for (let i = 0; i < scheduleEntries.length; i++) {
      for (let j = i + 1; j < scheduleEntries.length; j++) {
        const entry1 = scheduleEntries[i];
        const entry2 = scheduleEntries[j];

        // Only check if they're on the same machine
        if (entry1.machineId === entry2.machineId) {
          const start1 = entry1.startTime.toMillis();
          const end1 = entry1.endTime.toMillis();
          const start2 = entry2.startTime.toMillis();
          const end2 = entry2.endTime.toMillis();

          // Check for overlap
          if (start1 < end2 && start2 < end1) {
            validationResult.errors.push(
              `Schedule entries ${entry1.id} and ${entry2.id} overlap on machine ${entry1.machineId}`
            );
          }
        }
      }
    }

    // Final validation
    validationResult.isValid = validationResult.errors.length === 0;

    return NextResponse.json(validationResult);

  } catch (error) {
    console.error('Schedule validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate schedule' },
      { status: 500 }
    );
  }
} 