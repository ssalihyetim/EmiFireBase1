import { NextRequest, NextResponse } from 'next/server';
import { Conflict, ScheduleEntry } from '@/types/planning';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const machineId = searchParams.get('machineId');

    // Build query for schedule entries
    let scheduleQuery = query(
      collection(db, 'schedules'),
      orderBy('startTime', 'asc')
    );

    // Add filtering if provided
    if (startDate && endDate) {
      const startTimestamp = Timestamp.fromDate(new Date(startDate));
      const endTimestamp = Timestamp.fromDate(new Date(endDate));
      
      scheduleQuery = query(
        collection(db, 'schedules'),
        where('startTime', '>=', startTimestamp),
        where('startTime', '<=', endTimestamp),
        orderBy('startTime', 'asc')
      );
    }

    if (machineId) {
      scheduleQuery = query(
        collection(db, 'schedules'),
        where('machineId', '==', machineId),
        orderBy('startTime', 'asc')
      );
    }

    const querySnapshot = await getDocs(scheduleQuery);
    const scheduleEntries: ScheduleEntry[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      scheduleEntries.push({
        id: doc.id,
        machineId: data.machineId,
        processInstanceId: data.processInstanceId,
        orderId: data.orderId,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        actualStartTime: data.actualStartTime,
        actualEndTime: data.actualEndTime,
        operatorNotes: data.operatorNotes,
        // Legacy compatibility fields
        jobId: data.jobId || data.processInstanceId,
        partName: data.partName || '',
        quantity: data.quantity || 1,
        process: data.process || {},
        machineName: data.machineName || '',
        scheduledStartTime: data.startTime?.toDate().toISOString() || '',
        scheduledEndTime: data.endTime?.toDate().toISOString() || '',
        dependencies: data.dependencies,
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
      } as ScheduleEntry);
    });

    // Detect conflicts
    const conflicts: Conflict[] = detectMachineConflicts(scheduleEntries);

    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to detect conflicts' },
      { status: 500 }
    );
  }
}

/**
 * Detect machine conflicts where multiple jobs are scheduled at overlapping times
 */
function detectMachineConflicts(scheduleEntries: ScheduleEntry[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const machineSchedules = new Map<string, ScheduleEntry[]>();

  // Group schedule entries by machine
  scheduleEntries.forEach(entry => {
    if (!machineSchedules.has(entry.machineId)) {
      machineSchedules.set(entry.machineId, []);
    }
    machineSchedules.get(entry.machineId)!.push(entry);
  });

  // Check for overlapping schedules on each machine
  machineSchedules.forEach((entries, machineId) => {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i];
        const entry2 = entries[j];

        // Check if time ranges overlap
        const start1 = entry1.startTime.toMillis();
        const end1 = entry1.endTime.toMillis();
        const start2 = entry2.startTime.toMillis();
        const end2 = entry2.endTime.toMillis();

        if (start1 < end2 && start2 < end1) {
          conflicts.push({
            type: 'machine_conflict',
            description: `Machine ${machineId} has overlapping schedules`,
            conflictingEntries: [entry1.id, entry2.id],
            suggestedResolution: 'Reschedule one of the conflicting jobs to a different time slot'
          });
        }
      }
    }
  });

  return conflicts;
} 