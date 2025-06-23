import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  updateDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import type { JobTask, JobSubtask } from '@/types';
import type { 
  TaskPerformance, 
  TaskPerformanceFirestore, 
  Issue, 
  QualityResult,
  CompletedFormData 
} from '@/types/archival';
import { archiveCompletedJob } from './job-archival';
import { updateJobStatus } from './firebase-tasks';

const TASK_PERFORMANCE_COLLECTION = 'task_performance';
const QUALITY_RECORDS_COLLECTION = 'quality_records';
const ISSUES_COLLECTION = 'task_issues';

// === Task Performance Tracking ===

/**
 * Start tracking a task when it begins
 */
export async function startTaskTracking(
  taskId: string, 
  jobId: string, 
  operatorId?: string,
  assignedMachine?: string
): Promise<string> {
  const now = new Date();
  const trackingId = `${taskId}_${now.getTime()}`;
  
  const performanceData: TaskPerformanceFirestore = {
    id: trackingId,
    taskId,
    jobId,
    estimatedDuration: 0, // Will be updated from task data
    actualDuration: 0,
    startTime: Timestamp.fromDate(now),
    endTime: Timestamp.fromDate(now), // Will be updated on completion
    operatorNotes: [],
    issuesEncountered: [],
    qualityResult: {
      id: '',
      taskId,
      inspectionType: 'in_process',
      result: 'pass',
      score: 0,
      inspectedBy: '',
      inspectionDate: now.toISOString()
    },
    efficiencyRating: 0,
    // Only include assignedMachine and operatorId if they have values
    ...(assignedMachine && { assignedMachine }),
    ...(operatorId && { operatorId }),
    as9100dCompliance: false,
    qualityCheckpoints: [],
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp
  };
  
  await setDoc(doc(db, TASK_PERFORMANCE_COLLECTION, trackingId), performanceData);
  
  console.log(`Started tracking task ${taskId} with ID ${trackingId}`);
  return trackingId;
}

/**
 * Complete task tracking when task finishes
 */
export async function completeTaskTracking(
  trackingId: string,
  qualityResult: QualityResult,
  operatorNotes?: string[],
  issuesEncountered?: Issue[],
  lessonsLearned?: string[]
): Promise<void> {
  const now = new Date();
  
  const trackingDoc = await getDoc(doc(db, TASK_PERFORMANCE_COLLECTION, trackingId));
  if (!trackingDoc.exists()) {
    throw new Error(`Task tracking record ${trackingId} not found`);
  }
  
  const trackingData = trackingDoc.data() as TaskPerformanceFirestore;
  const startTime = trackingData.startTime.toDate();
  const actualDuration = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60); // Hours
  
  // Calculate efficiency rating
  const efficiencyRating = calculateEfficiencyRating(
    trackingData.estimatedDuration,
    actualDuration,
    qualityResult.score
  );
  
  const updates: Partial<TaskPerformanceFirestore> = {
    endTime: Timestamp.fromDate(now),
    actualDuration,
    qualityResult,
    efficiencyRating,
    as9100dCompliance: qualityResult.score >= 8, // 8/10 or higher for compliance
    updatedAt: serverTimestamp() as Timestamp
  };
  
  if (operatorNotes) {
    updates.operatorNotes = operatorNotes;
  }
  
  if (issuesEncountered) {
    updates.issuesEncountered = issuesEncountered;
  }
  
  if (lessonsLearned) {
    updates.lessonsLearned = lessonsLearned;
  }
  
  await updateDoc(doc(db, TASK_PERFORMANCE_COLLECTION, trackingId), updates);
  
  console.log(`Completed tracking for ${trackingId} - Duration: ${actualDuration.toFixed(2)}h, Quality: ${qualityResult.score}/10`);
}

/**
 * Add an issue to task tracking
 */
export async function addTaskIssue(
  trackingId: string,
  issue: Issue
): Promise<void> {
  // Save issue to issues collection
  await setDoc(doc(db, ISSUES_COLLECTION, issue.id), {
    ...issue,
    reportedAt: Timestamp.fromDate(new Date(issue.reportedAt)),
    resolvedAt: issue.resolvedAt ? Timestamp.fromDate(new Date(issue.resolvedAt)) : null
  });
  
  // Update task performance record
  const trackingDoc = await getDoc(doc(db, TASK_PERFORMANCE_COLLECTION, trackingId));
  if (trackingDoc.exists()) {
    const currentData = trackingDoc.data() as TaskPerformanceFirestore;
    const updatedIssues = [...currentData.issuesEncountered, issue];
    
    await updateDoc(doc(db, TASK_PERFORMANCE_COLLECTION, trackingId), {
      issuesEncountered: updatedIssues,
      updatedAt: serverTimestamp()
    });
  }
  
  console.log(`Added issue ${issue.id} to task tracking ${trackingId}`);
}

/**
 * Add operator notes during task execution
 */
export async function addOperatorNote(
  trackingId: string,
  note: string,
  operatorId: string
): Promise<void> {
  const timestampedNote = `[${new Date().toISOString()}] ${operatorId}: ${note}`;
  
  const trackingDoc = await getDoc(doc(db, TASK_PERFORMANCE_COLLECTION, trackingId));
  if (trackingDoc.exists()) {
    const currentData = trackingDoc.data() as TaskPerformanceFirestore;
    const updatedNotes = [...currentData.operatorNotes, timestampedNote];
    
    await updateDoc(doc(db, TASK_PERFORMANCE_COLLECTION, trackingId), {
      operatorNotes: updatedNotes,
      updatedAt: serverTimestamp()
    });
  }
  
  console.log(`Added operator note to task tracking ${trackingId}`);
}

/**
 * Record quality checkpoint during task execution
 */
export async function recordQualityCheckpoint(
  trackingId: string,
  qualityResult: QualityResult
): Promise<void> {
  // Save quality result to quality records collection
  await setDoc(doc(db, QUALITY_RECORDS_COLLECTION, qualityResult.id), {
    ...qualityResult,
    inspectionDate: Timestamp.fromDate(new Date(qualityResult.inspectionDate))
  });
  
  // Update task performance record
  const trackingDoc = await getDoc(doc(db, TASK_PERFORMANCE_COLLECTION, trackingId));
  if (trackingDoc.exists()) {
    const currentData = trackingDoc.data() as TaskPerformanceFirestore;
    const updatedCheckpoints = [...currentData.qualityCheckpoints, qualityResult];
    
    await updateDoc(doc(db, TASK_PERFORMANCE_COLLECTION, trackingId), {
      qualityCheckpoints: updatedCheckpoints,
      updatedAt: serverTimestamp()
    });
  }
  
  console.log(`Recorded quality checkpoint for task tracking ${trackingId}: ${qualityResult.result}`);
}

/**
 * Update task estimated duration (from task template)
 */
export async function updateTaskEstimatedDuration(
  trackingId: string,
  estimatedHours: number
): Promise<void> {
  await updateDoc(doc(db, TASK_PERFORMANCE_COLLECTION, trackingId), {
    estimatedDuration: estimatedHours,
    updatedAt: serverTimestamp()
  });
}

// === Task Performance Analysis ===

/**
 * Get task performance data
 */
export async function getTaskPerformance(trackingId: string): Promise<TaskPerformance | null> {
  const docRef = await getDoc(doc(db, TASK_PERFORMANCE_COLLECTION, trackingId));
  if (!docRef.exists()) return null;
  
  return convertTaskPerformanceFromFirestore(docRef.data() as TaskPerformanceFirestore);
}

/**
 * Get all performance data for a job
 */
export async function getJobPerformanceData(jobId: string): Promise<TaskPerformance[]> {
  const q = query(
    collection(db, TASK_PERFORMANCE_COLLECTION),
    where('jobId', '==', jobId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => 
    convertTaskPerformanceFromFirestore(doc.data() as TaskPerformanceFirestore)
  );
}

/**
 * Get performance data for a specific task across all jobs
 */
export async function getTaskTypePerformanceHistory(
  taskTemplateId: string
): Promise<TaskPerformance[]> {
  // This would require additional indexing by task template ID
  // For now, return empty array - to be implemented with proper indexing
  return [];
}

/**
 * Calculate overall job performance metrics
 */
export function calculateJobPerformanceMetrics(performanceData: TaskPerformance[]): {
  totalEstimatedHours: number;
  totalActualHours: number;
  overallEfficiency: number;
  avgQualityScore: number;
  onTimeCompletion: boolean;
  totalIssues: number;
  criticalIssues: number;
} {
  const totalEstimated = performanceData.reduce((sum, p) => sum + p.estimatedDuration, 0);
  const totalActual = performanceData.reduce((sum, p) => sum + p.actualDuration, 0);
  const avgQuality = performanceData.reduce((sum, p) => sum + p.qualityResult.score, 0) / performanceData.length;
  const avgEfficiency = performanceData.reduce((sum, p) => sum + p.efficiencyRating, 0) / performanceData.length;
  
  const allIssues = performanceData.flatMap(p => p.issuesEncountered);
  const criticalIssues = allIssues.filter(issue => issue.severity === 'critical' || issue.severity === 'high');
  
  return {
    totalEstimatedHours: totalEstimated,
    totalActualHours: totalActual,
    overallEfficiency: totalActual > 0 ? (totalEstimated / totalActual) * 100 : 100,
    avgQualityScore: avgQuality || 0,
    onTimeCompletion: totalActual <= totalEstimated * 1.1, // 10% tolerance
    totalIssues: allIssues.length,
    criticalIssues: criticalIssues.length
  };
}

// === Enhanced Task Management Integration ===

/**
 * Enhanced task status update with tracking and auto-archiving
 */
export async function updateTaskStatusWithTracking(
  task: JobTask,
  newStatus: JobTask['status'],
  operatorId?: string,
  machine?: string,
  notes?: string
): Promise<JobTask> {
  const now = new Date().toISOString();
  let trackingId: string | undefined;
  
  // Start tracking when task moves to in_progress
  if (newStatus === 'in_progress' && task.status === 'pending') {
    trackingId = await startTaskTracking(task.id, task.jobId, operatorId, machine);
    
    // Update estimated duration from task data
    if (task.estimatedDurationHours) {
      await updateTaskEstimatedDuration(trackingId, task.estimatedDurationHours);
    }
  }
  
  // Complete tracking when task is completed
  if (newStatus === 'completed' && task.status === 'in_progress') {
    // Find existing tracking record
    const q = query(
      collection(db, TASK_PERFORMANCE_COLLECTION),
      where('taskId', '==', task.id),
      where('jobId', '==', task.jobId)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const trackingDoc = snapshot.docs[0];
      trackingId = trackingDoc.id;
      
      // Create a basic quality result for completion
      const qualityResult: QualityResult = {
        id: `${task.id}_completion_${Date.now()}`,
        taskId: task.id,
        inspectionType: 'final',
        result: 'pass',
        score: 8, // Default good score
        inspectedBy: operatorId || 'system',
        inspectionDate: now,
        notes: notes || 'Task completed successfully'
      };
      
      await completeTaskTracking(
        trackingId,
        qualityResult,
        notes ? [notes] : undefined
      );
    }
    
    // Check if all tasks in the job are completed and auto-archive
    await checkAndAutoArchiveJob(task.jobId, operatorId || 'system');
  }
  
  // Return updated task with tracking information
  const updatedTask: JobTask = {
    ...task,
    status: newStatus,
    updatedAt: now
  };
  
  if (newStatus === 'in_progress') {
    updatedTask.actualStart = now;
    if (operatorId) {
      updatedTask.assignedTo = operatorId;
    }
  }
  
  if (newStatus === 'completed') {
    updatedTask.actualEnd = now;
    if (task.actualStart) {
      const startTime = new Date(task.actualStart).getTime();
      const endTime = new Date(now).getTime();
      updatedTask.actualDurationHours = (endTime - startTime) / (1000 * 60 * 60);
    }
  }
  
  return updatedTask;
}

/**
 * Check if all tasks in a job are completed and auto-archive the job
 */
async function checkAndAutoArchiveJob(jobId: string, operatorId: string): Promise<void> {
  try {
    console.log(`🔍 Checking job completion status for ${jobId}`);
    
    // Get all tasks for this job
    const tasksQuery = query(
      collection(db, 'jobTasks'),
      where('jobId', '==', jobId)
    );
    
    const tasksSnapshot = await getDocs(tasksQuery);
    const allTasks = tasksSnapshot.docs.map(doc => doc.data());
    
    console.log(`📊 Found ${allTasks.length} tasks for job ${jobId}`);
    
    // Check if all tasks are completed
    const completedTasks = allTasks.filter(task => task.status === 'completed');
    const pendingTasks = allTasks.filter(task => task.status === 'pending' || task.status === 'in_progress');
    
    console.log(`✅ Completed tasks: ${completedTasks.length}/${allTasks.length}`);
    console.log(`⏳ Pending tasks: ${pendingTasks.length}`);
    
    if (pendingTasks.length === 0 && allTasks.length > 0) {
      console.log(`🎯 All tasks completed for job ${jobId} - triggering auto-archive`);
      
      // Update job status to completed
      await updateJobStatus(jobId, 'Completed');
      console.log(`📝 Updated job status to Completed for ${jobId}`);
      
             // Auto-archive the completed job
       try {
         // Load job data for archiving
         const jobDoc = await getDoc(doc(db, 'jobs', jobId));
         if (jobDoc.exists()) {
           const job = jobDoc.data();
           
           // Get all tasks and subtasks
           const tasksData = allTasks.map((task: any) => ({
             ...task,
             jobId: jobId
           }));
           
           // Get all subtasks for the job
           const subtasksQuery = query(
             collection(db, 'jobSubtasks'),
             where('jobId', '==', jobId)
           );
           const subtasksSnapshot = await getDocs(subtasksQuery);
           const subtasksData = subtasksSnapshot.docs.map(doc => doc.data());
           
           await archiveCompletedJob(
             job as any,
             tasksData as any,
             subtasksData as any,
             'Auto-archived on job completion',
             operatorId
           );
           console.log(`🗃️ Successfully auto-archived job ${jobId}`);
         } else {
           console.error(`❌ Job ${jobId} not found for archiving`);
         }
       } catch (archiveError) {
         console.error(`❌ Failed to archive job ${jobId}:`, archiveError);
         // Don't throw - let the task completion continue even if archiving fails
       }
    } else {
      console.log(`⏸️ Job ${jobId} not ready for archiving - ${pendingTasks.length} tasks still pending`);
    }
  } catch (error) {
    console.error(`❌ Error checking job completion for ${jobId}:`, error);
    // Don't throw - let the task completion continue even if auto-archiving fails
  }
}

// === Utility Functions ===

/**
 * Calculate efficiency rating based on time and quality
 */
function calculateEfficiencyRating(
  estimatedHours: number, 
  actualHours: number, 
  qualityScore: number
): number {
  if (estimatedHours === 0) return 5; // Default neutral rating
  
  const timeEfficiency = Math.min(estimatedHours / actualHours, 2); // Cap at 2x efficiency
  const qualityFactor = qualityScore / 10; // Quality score factor
  
  // Combined efficiency (50% time, 50% quality)
  const combinedEfficiency = (timeEfficiency * 0.5 + qualityFactor * 0.5) * 10;
  
  return Math.min(Math.max(combinedEfficiency, 1), 10); // Clamp between 1-10
}

/**
 * Convert Firestore data to TypeScript interface
 */
function convertTaskPerformanceFromFirestore(data: TaskPerformanceFirestore): TaskPerformance {
  return {
    ...data,
    startTime: data.startTime.toDate().toISOString(),
    endTime: data.endTime.toDate().toISOString(),
    createdAt: data.createdAt.toDate().toISOString(),
    updatedAt: data.updatedAt.toDate().toISOString()
  };
}

/**
 * Generate unique issue ID
 */
export function generateIssueId(taskId: string, issueType: Issue['type']): string {
  return `${taskId}_${issueType}_${Date.now()}`;
}

/**
 * Generate unique quality result ID
 */
export function generateQualityResultId(taskId: string, inspectionType: QualityResult['inspectionType']): string {
  return `${taskId}_${inspectionType}_${Date.now()}`;
}

// === Manufacturing Form Tracking ===

/**
 * Record completed manufacturing form
 */
export async function recordCompletedForm(
  taskId: string,
  formData: CompletedFormData
): Promise<void> {
  const formId = `${taskId}_${formData.formType}_${Date.now()}`;
  
  await setDoc(doc(db, 'completed_forms', formId), {
    ...formData,
    id: formId,
    completedAt: Timestamp.fromDate(new Date(formData.completedAt))
  });
  
  console.log(`Recorded completed form ${formData.formType} for task ${taskId}`);
}

/**
 * Get all completed forms for a task
 */
export async function getTaskCompletedForms(taskId: string): Promise<CompletedFormData[]> {
  const q = query(
    collection(db, 'completed_forms'),
    where('taskId', '==', taskId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      completedAt: data.completedAt.toDate().toISOString()
    } as CompletedFormData;
  });
} 