import { NextRequest, NextResponse } from 'next/server';
import { SimpleAutoScheduler } from '@/lib/scheduling/simple-auto-scheduler';
import { ProcessInstance, Machine } from '@/types/planning';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Simple Auto-Schedule API called');
    
    const body = await request.json();
    const { processInstances, machines, options } = body;

    // Validate required data
    if (!processInstances || !Array.isArray(processInstances)) {
      return NextResponse.json(
        { error: 'ProcessInstances array is required' },
        { status: 400 }
      );
    }

    if (!machines || !Array.isArray(machines)) {
      return NextResponse.json(
        { error: 'Machines array is required' },
        { status: 400 }
      );
    }

    console.log(`📊 Scheduling ${processInstances.length} process instances across ${machines.length} machines`);
    
    // Initialize simple scheduler with provided options
    const scheduler = new SimpleAutoScheduler(options);
    
    // Run scheduling
    const result = await scheduler.scheduleProcessInstances(
      processInstances as ProcessInstance[],
      machines as Machine[]
    );

    console.log(`✅ Simple scheduling completed successfully:
   📊 Scheduled ${result.metrics.totalScheduledJobs} jobs
   ⚠️ ${result.conflicts.length} conflicts detected
   ⏱️ Processing time: ${result.metrics.schedulingDurationMs}ms
   📈 Average utilization: ${result.metrics.averageUtilization.toFixed(1)}%`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Simple Auto-Schedule API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during simple scheduling',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 