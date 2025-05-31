import { NextRequest, NextResponse } from 'next/server';
import { ScheduleEntry, DateRange } from '@/types/planning';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const machineId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!machineId) {
      return NextResponse.json(
        { error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    // Build query for machine schedule
    let scheduleQuery = query(
      collection(db, 'schedules'),
      where('machineId', '==', machineId),
      orderBy('startTime', 'asc')
    );

    // Add date range filtering if provided
    if (startDate && endDate) {
      const startTimestamp = Timestamp.fromDate(new Date(startDate));
      const endTimestamp = Timestamp.fromDate(new Date(endDate));
      
      scheduleQuery = query(
        collection(db, 'schedules'),
        where('machineId', '==', machineId),
        where('startTime', '>=', startTimestamp),
        where('startTime', '<=', endTimestamp),
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

    return NextResponse.json({ scheduleEntries });
  } catch (error) {
    console.error('Error fetching machine schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch machine schedule' },
      { status: 500 }
    );
  }
} 