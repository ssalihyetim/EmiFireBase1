import { NextRequest, NextResponse } from 'next/server';
import { startTaskTracking } from '@/lib/task-tracking';
import type { JobTask } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      taskId, 
      jobId, 
      operatorId, 
      assignedMachine, 
      notes 
    } = body;
    
    // Validation
    if (!taskId || !jobId || !operatorId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: taskId, jobId, operatorId' 
        },
        { status: 400 }
      );
    }
    
    // Start task tracking directly (simplified for demo)
    const trackingId = await startTaskTracking(
      taskId,
      jobId,
      operatorId,
      assignedMachine
    );
    
    return NextResponse.json({
      success: true,
      message: 'Task tracking started successfully',
      data: {
        taskId,
        jobId,
        trackingId,
        operator: operatorId,
        machine: assignedMachine,
        startTime: new Date().toISOString(),
        notes
      }
    });
    
  } catch (error) {
    console.error('Error starting task tracking:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start task tracking',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 