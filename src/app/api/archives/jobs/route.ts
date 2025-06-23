import { NextRequest, NextResponse } from 'next/server';
import { 
  archiveCompletedJob, 
  searchJobArchives, 
  getJobArchive,
  calculateArchiveStatistics 
} from '@/lib/job-archival';
import type { 
  ArchiveSearchCriteria, 
  ArchiveOperationResult 
} from '@/types/archival';
import type { Job, JobTask, JobSubtask } from '@/types';

// POST: Archive a completed job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      jobId,
      archiveReason = 'Job completed successfully',
      archivedBy = 'system',
      tasks = [],
      subtasks = []
    } = body;
    
    // Validation
    if (!jobId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Job ID is required' 
        },
        { status: 400 }
      );
    }
    
    // For demo purposes, create mock data (in real implementation would fetch from database)
    const mockJob: Job = {
      id: jobId,
      orderId: 'archive_demo_order',
      orderNumber: 'ARCH-001',
      clientName: 'Archive Demo Client',
      item: {
        id: 'archive_demo_item',
        partName: 'Archived Component',
        rawMaterialType: 'Aluminum 7075-T6',
        rawMaterialDimension: '150x100x50mm',
        materialCost: 75,
        machiningCost: 350,
        outsourcedProcessesCost: 50,
        unitPrice: 500,
        quantity: 1,
        totalPrice: 500,
        assignedProcesses: ['Turning', '3-Axis Milling', 'Heat Treatment', 'Anodizing']
      },
      status: 'Completed',
      priority: 'normal',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      updatedAt: new Date().toISOString()
    };
    
    const mockTasks: JobTask[] = tasks.length > 0 ? tasks : [
      {
        id: `${jobId}_task_manufacturing`,
        jobId,
        templateId: 'manufacturing_process',
        name: 'Manufacturing Operations',
        category: 'manufacturing_process',
        description: 'Complete manufacturing process execution',
        estimatedDurationHours: 24,
        status: 'completed',
        priority: 'high',
        orderIndex: 0,
        assignedTo: 'Senior Machinist',
        createdAt: mockJob.createdAt,
        updatedAt: mockJob.updatedAt,
        dependencies: []
      },
      {
        id: `${jobId}_task_quality`,
        jobId,
        templateId: 'quality_control',
        name: 'Quality Control & Inspection',
        category: 'quality_control',
        description: 'Final quality inspection and documentation',
        estimatedDurationHours: 4,
        status: 'completed',
        priority: 'high',
        orderIndex: 1,
        assignedTo: 'Quality Inspector',
        createdAt: mockJob.createdAt,
        updatedAt: mockJob.updatedAt,
        dependencies: [`${jobId}_task_manufacturing`]
      }
    ];
    
    const mockSubtasks: JobSubtask[] = subtasks.length > 0 ? subtasks : [
      {
        id: `${jobId}_subtask_setup`,
        taskId: `${jobId}_task_manufacturing`,
        name: 'Machine Setup and Tool Preparation',
        estimatedDurationMinutes: 120,
        orderIndex: 0,
        status: 'completed',
        assignedTo: 'Setup Operator'
      },
      {
        id: `${jobId}_subtask_machining`,
        taskId: `${jobId}_task_manufacturing`,
        name: 'Primary Machining Operations',
        estimatedDurationMinutes: 720,
        orderIndex: 1,
        status: 'completed',
        assignedTo: 'CNC Operator'
      }
    ];
    
    // Archive the job
    const archiveResult = await archiveCompletedJob(
      mockJob,
      mockTasks,
      mockSubtasks,
      archiveReason,
      archivedBy
    );
    
    if (archiveResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Job archived successfully',
        data: {
          archiveId: archiveResult.archiveId,
          jobId,
          metrics: archiveResult.metrics
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to archive job',
          details: archiveResult.errors
        },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error archiving job:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to archive job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET: Search job archives or get statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if requesting statistics
    if (searchParams.get('stats') === 'true') {
      const statistics = await calculateArchiveStatistics();
      
      return NextResponse.json({
        success: true,
        data: {
          type: 'statistics',
          statistics
        }
      });
    }
    
    // Check if requesting specific archive
    const archiveId = searchParams.get('archiveId');
    if (archiveId) {
      const archive = await getJobArchive(archiveId);
      
      if (!archive) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Archive not found' 
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: {
          type: 'single_archive',
          archive
        }
      });
    }
    
    // Search archives by criteria
    const partNumber = searchParams.get('partNumber');
    const archiveType = searchParams.get('archiveType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const minQualityScore = searchParams.get('minQualityScore');
    const maxResults = parseInt(searchParams.get('maxResults') || '50');
    
    // Build search criteria
    const criteria: ArchiveSearchCriteria = {};
    
    if (partNumber) criteria.partNumber = partNumber;
    if (archiveType && archiveType !== 'all') {
      criteria.archiveType = [archiveType as any];
    }
    if (startDate && endDate) {
      criteria.dateRange = {
        start: startDate,
        end: endDate
      };
    }
    if (minQualityScore) {
      criteria.qualityScore = { 
        min: parseFloat(minQualityScore), 
        max: 10 
      };
    }
    
    const archives = await searchJobArchives(criteria, maxResults);
    
    return NextResponse.json({
      success: true,
      data: {
        type: 'search_results',
        archives,
        count: archives.length,
        criteria
      }
    });
    
  } catch (error) {
    console.error('Error in GET archives:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve archives',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 