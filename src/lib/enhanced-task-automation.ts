import type { Job, JobTask, JobSubtask } from '@/types';
import type { 
  TaskPerformance,
  Issue,
  QualityResult,
  CompletedFormData,
  JobArchive,
  JobPattern,
  ManufacturingLot
} from '@/types/archival';
import { 
  generateUnifiedJobTasks,
  createUnifiedTaskView
} from './unified-task-automation';
import {
  startTaskTracking,
  completeTaskTracking,
  updateTaskStatusWithTracking,
  getJobPerformanceData,
  calculateJobPerformanceMetrics,
  addTaskIssue,
  addOperatorNote,
  recordQualityCheckpoint,
  recordCompletedForm,
  generateIssueId,
  generateQualityResultId
} from './task-tracking';
import { saveJobTasks, updateTaskInFirestore } from './firebase-tasks';

// === Enhanced Task Generation with Tracking ===

/**
 * Generate unified tasks with tracking capabilities enabled
 */
export async function generateTrackedUnifiedJobTasks(
  job: Job,
  existingOperations?: any[]
): Promise<JobTask[]> {
  // Generate standard unified tasks
  const tasks = generateUnifiedJobTasks(job, existingOperations);
  
  // Enhance tasks with tracking capabilities
  const enhancedTasks = tasks.map(task => ({
    ...task,
    // Add tracking fields
    trackingEnabled: true,
    performanceTrackingId: undefined, // Will be set when task starts
    qualityCheckpoints: [],
    operatorNotes: [],
    issuesEncountered: [],
    
    // Enhanced status tracking
    actualStartTime: undefined,
    actualEndTime: undefined,
    actualDurationHours: undefined,
    
    // Quality & Pattern tracking
    qualityResult: undefined,
    patternTaskId: undefined, // For pattern-based jobs
    
    // Archive preparation
    isArchivalCandidate: task.category === 'manufacturing_process'
  }));
  
  console.log(`Generated ${enhancedTasks.length} tracked unified tasks for job ${job.id}`);
  return enhancedTasks;
}

// === Task Lifecycle Management ===

/**
 * Start a task with comprehensive tracking
 */
export async function startTrackedTask(
  task: JobTask,
  operatorId: string,
  assignedMachine?: string,
  notes?: string
): Promise<JobTask> {
  try {
    // Update task status with tracking
    const updatedTask = await updateTaskStatusWithTracking(
      task,
      'in_progress',
      operatorId,
      assignedMachine,
      notes
    );
    
    // Save updated task to Firebase
    await updateTaskInFirestore(updatedTask);
    
    // Add initial operator note if provided
    if (notes && updatedTask.performanceTrackingId) {
      await addOperatorNote(updatedTask.performanceTrackingId, notes, operatorId);
    }
    
    console.log(`Started tracked task ${task.id} for operator ${operatorId}`);
    return updatedTask;
    
  } catch (error) {
    console.error('Error starting tracked task:', error);
    throw error;
  }
}

/**
 * Complete a task with quality assessment
 */
export async function completeTrackedTask(
  task: JobTask,
  operatorId: string,
  qualityAssessment: {
    score: number; // 1-10
    inspectionType: QualityResult['inspectionType'];
    result: QualityResult['result'];
    notes?: string;
    measurements?: QualityResult['measurements'];
  },
  completedForms?: CompletedFormData[],
  lessonsLearned?: string[]
): Promise<JobTask> {
  try {
    // Create quality result
    const qualityResult: QualityResult = {
      id: generateQualityResultId(task.id, qualityAssessment.inspectionType),
      taskId: task.id,
      inspectionType: qualityAssessment.inspectionType,
      result: qualityAssessment.result,
      score: qualityAssessment.score,
      inspectedBy: operatorId,
      inspectionDate: new Date().toISOString(),
      measurements: qualityAssessment.measurements,
      notes: qualityAssessment.notes
    };
    
    // Update task status with tracking completion
    const updatedTask = await updateTaskStatusWithTracking(
      task,
      'completed',
      operatorId,
      undefined,
      qualityAssessment.notes
    );
    
    // Record completed forms if provided
    if (completedForms && completedForms.length > 0) {
      for (const form of completedForms) {
        await recordCompletedForm(task.id, form);
      }
    }
    
    // Save updated task to Firebase
    await updateTaskInFirestore({
      ...updatedTask,
      qualityResult,
      lessonsLearned: lessonsLearned || []
    });
    
    console.log(`Completed tracked task ${task.id} with quality score ${qualityAssessment.score}/10`);
    return updatedTask;
    
  } catch (error) {
    console.error('Error completing tracked task:', error);
    throw error;
  }
}

/**
 * Report an issue during task execution
 */
export async function reportTaskIssue(
  task: JobTask,
  issueData: {
    type: Issue['type'];
    severity: Issue['severity'];
    description: string;
    reportedBy: string;
    solutionApplied?: string;
  },
  trackingId?: string
): Promise<Issue> {
  const issue: Issue = {
    id: generateIssueId(task.id, issueData.type),
    type: issueData.type,
    severity: issueData.severity,
    description: issueData.description,
    reportedBy: issueData.reportedBy,
    reportedAt: new Date().toISOString(),
    solutionApplied: issueData.solutionApplied
  };
  
  // Add to task tracking if tracking ID is available
  const actualTrackingId = trackingId || task.performanceTrackingId;
  if (actualTrackingId) {
    await addTaskIssue(actualTrackingId, issue);
  }
  
  console.log(`Reported ${issue.severity} issue for task ${task.id}: ${issue.description}`);
  return issue;
}

/**
 * Add quality checkpoint during task execution
 */
export async function addTaskQualityCheckpoint(
  task: JobTask,
  inspectionData: {
    inspectionType: QualityResult['inspectionType'];
    result: QualityResult['result'];
    score: number;
    inspectedBy: string;
    notes?: string;
    measurements?: QualityResult['measurements'];
  },
  trackingId?: string
): Promise<QualityResult> {
  const qualityResult: QualityResult = {
    id: generateQualityResultId(task.id, inspectionData.inspectionType),
    taskId: task.id,
    inspectionType: inspectionData.inspectionType,
    result: inspectionData.result,
    score: inspectionData.score,
    inspectedBy: inspectionData.inspectedBy,
    inspectionDate: new Date().toISOString(),
    notes: inspectionData.notes,
    measurements: inspectionData.measurements
  };
  
  // Record quality checkpoint if tracking ID is available
  const actualTrackingId = trackingId || task.performanceTrackingId;
  if (actualTrackingId) {
    await recordQualityCheckpoint(actualTrackingId, qualityResult);
  }
  
  console.log(`Added quality checkpoint for task ${task.id}: ${inspectionData.result} (${inspectionData.score}/10)`);
  return qualityResult;
}

// === Job Performance Analysis ===

/**
 * Generate comprehensive job performance report
 */
export async function generateJobPerformanceReport(jobId: string): Promise<{
  jobId: string;
  performanceData: TaskPerformance[];
  metrics: ReturnType<typeof calculateJobPerformanceMetrics>;
  qualityAnalysis: {
    avgQualityScore: number;
    qualityTrend: 'improving' | 'stable' | 'declining';
    failedInspections: number;
    criticalIssues: Issue[];
  };
  timeAnalysis: {
    onTimeTaskCompletion: number;
    avgEfficiency: number;
    bottleneckTasks: string[];
  };
  recommendations: string[];
}> {
  try {
    // Get all performance data for the job
    const performanceData = await getJobPerformanceData(jobId);
    
    if (performanceData.length === 0) {
      throw new Error(`No performance data found for job ${jobId}`);
    }
    
    // Calculate overall metrics
    const metrics = calculateJobPerformanceMetrics(performanceData);
    
    // Quality analysis
    const qualityScores = performanceData.map(p => p.qualityResult.score);
    const avgQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    
    const failedInspections = performanceData.filter(p => p.qualityResult.result === 'fail').length;
    const criticalIssues = performanceData.flatMap(p => p.issuesEncountered)
      .filter(issue => issue.severity === 'critical' || issue.severity === 'high');
    
    // Determine quality trend (simplified - would need historical data for real trend)
    const qualityTrend: 'improving' | 'stable' | 'declining' = 
      avgQualityScore >= 8 ? 'stable' : avgQualityScore >= 6 ? 'improving' : 'declining';
    
    // Time analysis
    const onTimeTaskCompletion = performanceData.filter(p => 
      p.actualDuration <= p.estimatedDuration * 1.1 // 10% tolerance
    ).length;
    
    const avgEfficiency = performanceData.reduce((sum, p) => sum + p.efficiencyRating, 0) / performanceData.length;
    
    // Identify bottleneck tasks (tasks that took significantly longer than estimated)
    const bottleneckTasks = performanceData
      .filter(p => p.actualDuration > p.estimatedDuration * 1.5) // 50% over estimate
      .map(p => p.taskId);
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (avgQualityScore < 7) {
      recommendations.push("Quality improvement needed - implement additional quality checks");
    }
    
    if (metrics.overallEfficiency < 80) {
      recommendations.push("Process efficiency below target - review task estimates and methods");
    }
    
    if (criticalIssues.length > 0) {
      recommendations.push("Address critical issues to prevent recurrence");
    }
    
    if (bottleneckTasks.length > 0) {
      recommendations.push(`Review bottleneck tasks: ${bottleneckTasks.join(', ')}`);
    }
    
    if (!metrics.onTimeCompletion) {
      recommendations.push("Improve time management - consider adjusting schedules or resources");
    }
    
    return {
      jobId,
      performanceData,
      metrics,
      qualityAnalysis: {
        avgQualityScore,
        qualityTrend,
        failedInspections,
        criticalIssues
      },
      timeAnalysis: {
        onTimeTaskCompletion,
        avgEfficiency,
        bottleneckTasks
      },
      recommendations
    };
    
  } catch (error) {
    console.error('Error generating job performance report:', error);
    throw error;
  }
}

// === Pattern Compatibility Analysis ===

/**
 * Analyze if current job performance can create a reliable pattern
 */
export function analyzePatternReadiness(
  performanceData: TaskPerformance[],
  jobData: Job
): {
  isPatternReady: boolean;
  qualityScore: number;
  reliability: number;
  recommendations: string[];
  riskFactors: string[];
} {
  const metrics = calculateJobPerformanceMetrics(performanceData);
  
  // Pattern readiness criteria
  const qualityThreshold = 8; // Minimum quality score
  const efficiencyThreshold = 80; // Minimum efficiency
  const maxCriticalIssues = 0; // No critical issues
  
  const qualityScore = metrics.avgQualityScore;
  const reliability = Math.min(
    (qualityScore / 10) * 0.4 + // 40% weight on quality
    (metrics.overallEfficiency / 100) * 0.3 + // 30% weight on efficiency
    (metrics.onTimeCompletion ? 0.3 : 0), // 30% weight on on-time completion
    1
  ) * 100;
  
  const isPatternReady = 
    qualityScore >= qualityThreshold &&
    metrics.overallEfficiency >= efficiencyThreshold &&
    metrics.criticalIssues <= maxCriticalIssues &&
    metrics.onTimeCompletion;
  
  const recommendations: string[] = [];
  const riskFactors: string[] = [];
  
  if (qualityScore < qualityThreshold) {
    recommendations.push(`Improve quality score to ${qualityThreshold}/10 or higher`);
    riskFactors.push("Quality consistency concerns");
  }
  
  if (metrics.overallEfficiency < efficiencyThreshold) {
    recommendations.push(`Improve efficiency to ${efficiencyThreshold}% or higher`);
    riskFactors.push("Time estimation accuracy issues");
  }
  
  if (metrics.criticalIssues > 0) {
    recommendations.push("Resolve all critical issues before pattern creation");
    riskFactors.push("Unresolved critical manufacturing issues");
  }
  
  if (!metrics.onTimeCompletion) {
    recommendations.push("Ensure on-time completion for pattern reliability");
    riskFactors.push("Schedule adherence problems");
  }
  
  return {
    isPatternReady,
    qualityScore,
    reliability,
    recommendations,
    riskFactors
  };
}

// === Integration Utilities ===

/**
 * Create enhanced unified task view with performance data
 */
export async function createEnhancedUnifiedTaskView(
  tasks: JobTask[],
  machines?: any[]
): Promise<any[]> {
  // Get base unified task view
  const baseViews = createUnifiedTaskView(tasks, machines);
  
  // Enhance with performance data
  const enhancedViews = await Promise.all(
    baseViews.map(async (view) => {
      let performanceData: TaskPerformance | null = null;
      
      // Try to get performance data for in-progress or completed tasks
      if (view.task.performanceTrackingId) {
        try {
          const performanceDataResult = await getJobPerformanceData(view.task.jobId);
          performanceData = performanceDataResult.find(p => p.taskId === view.task.id) || null;
        } catch (error) {
          console.warn(`Could not load performance data for task ${view.task.id}:`, error);
        }
      }
      
      return {
        ...view,
        performanceData,
        hasTracking: !!view.task.performanceTrackingId,
        efficiency: performanceData?.efficiencyRating,
        qualityScore: performanceData?.qualityResult.score,
        issues: performanceData?.issuesEncountered || [],
        isArchivalCandidate: view.task.isArchivalCandidate || false
      };
    })
  );
  
  return enhancedViews;
}

/**
 * Check if job is ready for archival
 */
export function isJobReadyForArchival(
  job: Job,
  tasks: JobTask[],
  performanceData: TaskPerformance[]
): {
  isReady: boolean;
  completionPercentage: number;
  missingRequirements: string[];
} {
  const completedTasks = tasks.filter(task => task.status === 'completed');
  const completionPercentage = (completedTasks.length / tasks.length) * 100;
  
  const missingRequirements: string[] = [];
  
  // Check basic completion
  if (completionPercentage < 100) {
    missingRequirements.push(`${tasks.length - completedTasks.length} tasks still pending completion`);
  }
  
  // Check quality compliance
  const failedQualityTasks = performanceData.filter(p => !p.as9100dCompliance);
  if (failedQualityTasks.length > 0) {
    missingRequirements.push(`${failedQualityTasks.length} tasks do not meet AS9100D compliance`);
  }
  
  // Check critical issues resolution
  const unresolvedCriticalIssues = performanceData.flatMap(p => p.issuesEncountered)
    .filter(issue => (issue.severity === 'critical' || issue.severity === 'high') && !issue.resolvedAt);
  if (unresolvedCriticalIssues.length > 0) {
    missingRequirements.push(`${unresolvedCriticalIssues.length} critical issues remain unresolved`);
  }
  
  return {
    isReady: missingRequirements.length === 0,
    completionPercentage,
    missingRequirements
  };
} 