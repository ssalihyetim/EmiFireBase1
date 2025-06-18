import { NextRequest, NextResponse } from 'next/server';
import { deleteJob } from '@/lib/firebase-jobs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const jobId = resolvedParams.id;

    console.log(`🗑️ API: Starting deletion for job ${jobId}`);
    
    // Use the enhanced cascade delete function
    await deleteJob(jobId);

    console.log(`✅ API: Successfully deleted job ${jobId} and all related data`);

    return NextResponse.json({ 
      success: true,
      message: 'Job and all related data deleted successfully',
      jobId: jobId
    });

  } catch (error) {
    console.error('❌ API: Error deleting job:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete job and related data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 