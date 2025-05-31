import { NextRequest, NextResponse } from 'next/server';
import { ProcessInstance, ScheduleResult } from '@/types/planning';
import { AutoScheduler } from '@/lib/scheduling/auto-scheduler';

export async function POST(request: NextRequest) {
  try {
    const { processInstances }: { processInstances: ProcessInstance[] } = await request.json();
    
    if (!processInstances || !Array.isArray(processInstances)) {
      return NextResponse.json(
        { error: 'Invalid processInstances array' },
        { status: 400 }
      );
    }

    // Initialize the auto-scheduling engine
    const autoScheduler = new AutoScheduler();
    
    // Run the scheduling algorithm
    const result: ScheduleResult = await autoScheduler.scheduleProcessInstances(processInstances);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Auto-scheduling error:', error);
    return NextResponse.json(
      { error: 'Failed to generate schedule' },
      { status: 500 }
    );
  }
} 