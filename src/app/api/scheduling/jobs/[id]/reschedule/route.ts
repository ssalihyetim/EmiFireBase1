import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase/firestore';
import { ScheduleManager } from '@/lib/scheduling/schedule-manager';
import { AvailabilityCalculator } from '@/lib/scheduling/availability-calculator';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const scheduleEntryId = resolvedParams.id;
    
    const { 
      newStartTime, 
      machineId 
    }: { 
      newStartTime: string;
      machineId?: string;
    } = await request.json();

    if (!newStartTime) {
      return NextResponse.json(
        { error: 'newStartTime is required' },
        { status: 400 }
      );
    }

    const scheduleManager = new ScheduleManager();
    const availabilityCalculator = new AvailabilityCalculator();

    // Parse the new start time
    const startTimestamp = Timestamp.fromDate(new Date(newStartTime));
    
    // Get the existing schedule entry to calculate duration
    const existingSchedules = await scheduleManager.getScheduleEntries();
    const existingEntry = existingSchedules.find(entry => entry.id === scheduleEntryId);
    
    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Schedule entry not found' },
        { status: 404 }
      );
    }

    // Calculate duration from existing entry
    const duration = (existingEntry.endTime.toMillis() - existingEntry.startTime.toMillis()) / (1000 * 60);
    
    // Use provided machineId or existing machine
    const targetMachineId = machineId || existingEntry.machineId;

    // Calculate new end time
    const endTimestamp = await availabilityCalculator.estimateCompletionTime(
      targetMachineId,
      startTimestamp,
      duration
    );

    // Check for conflicts
    const tempEntry = {
      ...existingEntry,
      machineId: targetMachineId,
      startTime: startTimestamp,
      endTime: endTimestamp
    };

    const conflicts = await scheduleManager.detectConflicts(tempEntry);
    
    if (conflicts.length > 0) {
      return NextResponse.json(
        { 
          error: 'Rescheduling would create conflicts',
          conflicts 
        },
        { status: 409 }
      );
    }

    // Update the schedule entry
    await scheduleManager.updateScheduleEntry(scheduleEntryId, {
      machineId: targetMachineId,
      startTime: startTimestamp,
      endTime: endTimestamp,
      scheduledStartTime: startTimestamp.toDate().toISOString(),
      scheduledEndTime: endTimestamp.toDate().toISOString()
    });

    return NextResponse.json({ 
      success: true,
      message: 'Job rescheduled successfully',
      newStartTime: startTimestamp.toDate().toISOString(),
      newEndTime: endTimestamp.toDate().toISOString()
    });

  } catch (error) {
    console.error('Error rescheduling job:', error);
    return NextResponse.json(
      { error: 'Failed to reschedule job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const scheduleEntryId = resolvedParams.id;

    const scheduleManager = new ScheduleManager();
    
    // Delete the schedule entry
    await scheduleManager.deleteScheduleEntry(scheduleEntryId);

    return NextResponse.json({ 
      success: true,
      message: 'Job removed from schedule successfully'
    });

  } catch (error) {
    console.error('Error removing job from schedule:', error);
    return NextResponse.json(
      { error: 'Failed to remove job from schedule' },
      { status: 500 }
    );
  }
} 