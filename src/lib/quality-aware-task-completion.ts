import type { JobTask, JobSubtask } from '@/types';
import type { QualityResult } from '@/types/archival';
import { 
  completeTaskTracking, 
  startTaskTracking, 
  updateTaskEstimatedDuration,
  generateQualityResultId 
} from './task-tracking';
import { updateTaskInFirestore } from './firebase-tasks';
import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const TASK_PERFORMANCE_COLLECTION = 'task_performance';

/**
 * Complete task with quality assessment
 * This replaces the default task completion with quality-aware completion
 */
export async function completeTrackedTask(
  task: JobTask,
  qualityResult: QualityResult,
  operatorNotes?: string[],
  operatorId?: string
): Promise<JobTask> {
  const now = new Date().toISOString();
  
  // Find existing tracking record
  const q = query(
    collection(db, TASK_PERFORMANCE_COLLECTION),
    where('taskId', '==', task.id),
    where('jobId', '==', task.jobId)
  );
  
  const snapshot = await getDocs(q);
  let trackingId: string;
  
  if (!snapshot.empty) {
    // Use existing tracking record
    trackingId = snapshot.docs[0].id;
  } else {
    // Create new tracking record if none exists
    trackingId = await startTaskTracking(task.id, task.jobId, operatorId);
    
    // Update estimated duration from task data
    if (task.estimatedDurationHours) {
      await updateTaskEstimatedDuration(trackingId, task.estimatedDurationHours);
    }
  }
  
  // Complete tracking with quality assessment
  await completeTaskTracking(
    trackingId,
    qualityResult,
    operatorNotes
  );
  
  // Update task status
  const updatedTask: JobTask = {
    ...task,
    status: 'completed',
    actualEnd: now,
    updatedAt: now
  };
  
  // Calculate actual duration if start time exists
  if (task.actualStart) {
    const startTime = new Date(task.actualStart).getTime();
    const endTime = new Date(now).getTime();
    updatedTask.actualDurationHours = (endTime - startTime) / (1000 * 60 * 60);
  }
  
  // Add operator assignment if provided
  if (operatorId && !task.assignedTo) {
    updatedTask.assignedTo = operatorId;
  }
  
  // Save updated task to Firestore
  await updateTaskInFirestore(updatedTask);
  
  console.log(`Task ${task.id} completed with quality score: ${qualityResult.score}/10`);
  
  return updatedTask;
}

/**
 * Add quality checkpoint during task execution
 */
export async function addTaskQualityCheckpoint(
  task: JobTask,
  inspectionType: QualityResult['inspectionType'],
  result: QualityResult['result'],
  score: number,
  inspectedBy: string,
  notes?: string,
  measurements?: QualityResult['measurements']
): Promise<void> {
  // Find existing tracking record
  const q = query(
    collection(db, TASK_PERFORMANCE_COLLECTION),
    where('taskId', '==', task.id),
    where('jobId', '==', task.jobId)
  );
  
  const snapshot = await getDocs(q);
  let trackingId: string;
  
  if (!snapshot.empty) {
    trackingId = snapshot.docs[0].id;
  } else {
    // Create tracking record if none exists
    trackingId = await startTaskTracking(task.id, task.jobId, inspectedBy);
  }
  
  // Create quality checkpoint
  const qualityResult: QualityResult = {
    id: generateQualityResultId(task.id, inspectionType),
    taskId: task.id,
    inspectionType,
    result,
    score,
    inspectedBy,
    inspectionDate: new Date().toISOString(),
    notes,
    measurements
  };
  
  // Record the checkpoint
  const { recordQualityCheckpoint } = await import('./task-tracking');
  await recordQualityCheckpoint(trackingId, qualityResult);
  
  console.log(`Quality checkpoint added for task ${task.id}: ${result} (${score}/10)`);
}

/**
 * Get quality requirements for a task
 */
export function getTaskQualityRequirements(task: JobTask): {
  requiredInspections: QualityResult['inspectionType'][];
  minimumQualityScore: number;
  as9100dCompliance: boolean;
  qualityCheckpoints: string[];
} {
  const requirements = {
    requiredInspections: ['final'] as QualityResult['inspectionType'][],
    minimumQualityScore: 8, // AS9100D standard
    as9100dCompliance: !!task.as9100dClause,
    qualityCheckpoints: []
  };
  
  // Add specific requirements based on task type
  if (task.category === 'manufacturing_process') {
    requirements.requiredInspections.push('in_process');
    
    // FAI required for first articles
    if (task.name.toLowerCase().includes('first') || 
        task.name.toLowerCase().includes('fai')) {
      requirements.requiredInspections.push('fai');
    }
    
    // Dimensional inspection for precision work
    if (task.manufacturingProcessType && 
        ['3_axis_milling', '4_axis_milling', '5_axis_milling'].includes(task.manufacturingProcessType)) {
      requirements.requiredInspections.push('dimensional');
    }
  }
  
  // Higher quality requirements for critical tasks
  if (task.priority === 'critical' || task.priority === 'urgent') {
    requirements.minimumQualityScore = 9;
  }
  
  return requirements;
}

/**
 * Validate quality assessment before task completion
 */
export function validateQualityAssessment(
  task: JobTask,
  qualityResult: QualityResult
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const requirements = getTaskQualityRequirements(task);
  
  // Check minimum quality score
  if (qualityResult.score < requirements.minimumQualityScore) {
    errors.push(`Quality score ${qualityResult.score} below required minimum ${requirements.minimumQualityScore}`);
  }
  
  // Check AS9100D compliance
  if (requirements.as9100dCompliance && qualityResult.score < 8) {
    errors.push('AS9100D compliance requires quality score ≥ 8/10');
  }
  
  // Check result consistency with score
  if (qualityResult.result === 'pass' && qualityResult.score < 7) {
    warnings.push('Quality score seems low for a "pass" result');
  }
  
  if (qualityResult.result === 'fail' && qualityResult.score > 5) {
    warnings.push('Quality score seems high for a "fail" result');
  }
  
  // Check measurements for dimensional inspections
  if (qualityResult.inspectionType === 'dimensional' && 
      (!qualityResult.measurements || qualityResult.measurements.length === 0)) {
    warnings.push('Dimensional inspection should include measurements');
  }
  
  // Check inspector assignment
  if (!qualityResult.inspectedBy || qualityResult.inspectedBy.trim() === '') {
    errors.push('Inspector name is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get historical quality performance for similar tasks
 */
export async function getTaskQualityHistory(
  taskTemplateId: string,
  limit: number = 10
): Promise<{
  averageQualityScore: number;
  totalAssessments: number;
  passRate: number;
  commonIssues: string[];
  recommendations: string[];
}> {
  try {
    const { getTaskTypePerformanceHistory } = await import('./task-tracking');
    const history = await getTaskTypePerformanceHistory(taskTemplateId);
    
    if (history.length === 0) {
      return {
        averageQualityScore: 8,
        totalAssessments: 0,
        passRate: 100,
        commonIssues: [],
        recommendations: ['No historical data available']
      };
    }
    
    const qualityScores = history.map(h => h.qualityResult.score);
    const averageScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    const passCount = history.filter(h => h.qualityResult.result === 'pass').length;
    const passRate = (passCount / history.length) * 100;
    
    // Extract common issues
    const allIssues = history.flatMap(h => h.issuesEncountered || []);
    const issueMap = new Map<string, number>();
    allIssues.forEach(issue => {
      const count = issueMap.get(issue.description) || 0;
      issueMap.set(issue.description, count + 1);
    });
    
    const commonIssues = Array.from(issueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue);
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (averageScore < 8) {
      recommendations.push('Historical quality below AS9100D standard - implement additional checks');
    }
    if (passRate < 90) {
      recommendations.push('Low historical pass rate - review process and training');
    }
    if (commonIssues.length > 0) {
      recommendations.push('Address common issues: ' + commonIssues.slice(0, 2).join(', '));
    }
    
    return {
      averageQualityScore: averageScore,
      totalAssessments: history.length,
      passRate,
      commonIssues,
      recommendations
    };
  } catch (error) {
    console.error('Error fetching task quality history:', error);
    return {
      averageQualityScore: 8,
      totalAssessments: 0,
      passRate: 100,
      commonIssues: [],
      recommendations: ['Error loading historical data']
    };
  }
} 