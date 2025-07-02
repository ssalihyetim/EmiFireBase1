import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import type { JobTask } from '@/types';
import type { QualityResult } from '@/types/archival';
import type { ManufacturingProcessData } from '@/components/quality/ManufacturingProcessCompletionDialog';
import { 
  completeTaskTracking, 
  updateTaskEstimatedDuration 
} from './task-tracking';
import { updateTaskInFirestore } from './firebase-tasks';

// Enhanced manufacturing completion record
export interface EnhancedManufacturingRecord {
  id: string;
  taskId: string;
  jobId: string;
  
  // Timing data
  setupStartTime: string;
  setupEndTime: string;
  processEndTime: string;
  actualSetupTimeMinutes: number;
  actualProcessTimeMinutes: number;
  averageCycleTimeMinutes: number;
  
  // Production data
  inputQuantity: number;
  outputQuantity: number;
  scrapQuantity: number;
  reworkQuantity: number;
  yieldPercentage: number;
  
  // Operator data
  operatorId: string;
  machineUsed: string;
  toolsUsed: string[];
  
  // Process notes
  setupNotes?: string;
  processNotes?: string;
  issuesEncountered?: string;
  
  // Performance metrics
  setupEfficiency: number; // Actual vs estimated setup time
  cycleTimeEfficiency: number; // Actual vs estimated cycle time
  qualityEfficiency: number; // Good parts / total parts
  
  // Quality result reference
  qualityResultId: string;
  
  // Archive metadata
  archivedForCompliance: boolean;
  retentionRequired: boolean;
  as9100dClause?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface EnhancedManufacturingRecordFirestore extends Omit<EnhancedManufacturingRecord, 'setupStartTime' | 'setupEndTime' | 'processEndTime' | 'createdAt' | 'updatedAt'> {
  setupStartTime: Timestamp;
  setupEndTime: Timestamp;
  processEndTime: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const ENHANCED_MANUFACTURING_RECORDS_COLLECTION = 'enhanced_manufacturing_records';

/**
 * Complete a manufacturing task with enhanced data capture
 */
export async function completeManufacturingTaskWithEnhancedData(
  task: JobTask,
  qualityResult: QualityResult,
  manufacturingData: ManufacturingProcessData,
  operatorNotes?: string[]
): Promise<{ 
  success: boolean; 
  recordId?: string; 
  errors?: string[] 
}> {
  try {
    // Helper function to remove undefined values from objects
    function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
      const sanitized = { ...obj };
      Object.keys(sanitized).forEach(key => {
        if (sanitized[key] === undefined) {
          delete sanitized[key];
        } else if (Array.isArray(sanitized[key]) && sanitized[key].length === 0) {
          delete sanitized[key]; // Remove empty arrays too
        }
      });
      return sanitized;
    }
    
    const now = new Date().toISOString();
    const recordId = `mfg_record_${task.id}_${Date.now()}`;
    
    // Sanitize quality result to remove undefined values
    const sanitizedQualityResult = sanitizeForFirestore(qualityResult);
    
    // Create enhanced manufacturing record
    const enhancedRecord: EnhancedManufacturingRecord = {
      id: recordId,
      taskId: task.id,
      jobId: task.jobId,
      
      // Copy all manufacturing data
      ...manufacturingData,
      
      // Quality result reference
      qualityResultId: sanitizedQualityResult.id,
      
      // Archive metadata
      archivedForCompliance: true,
      retentionRequired: true,
      as9100dClause: task.as9100dClause,
      
      createdAt: now,
      updatedAt: now
    };
    
    // Convert to Firestore format
    const firestoreRecord: EnhancedManufacturingRecordFirestore = {
      ...enhancedRecord,
      setupStartTime: Timestamp.fromDate(new Date(manufacturingData.setupStartTime)),
      setupEndTime: Timestamp.fromDate(new Date(manufacturingData.setupEndTime)),
      processEndTime: Timestamp.fromDate(new Date(manufacturingData.processEndTime)),
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    };
    
    // Save enhanced manufacturing record
    await setDoc(doc(db, ENHANCED_MANUFACTURING_RECORDS_COLLECTION, recordId), firestoreRecord);
    
    // Find existing tracking record first
    const { getDocs, query, where } = await import('firebase/firestore');
    const q = query(
      collection(db, 'task_performance'),
      where('taskId', '==', task.id),
      where('jobId', '==', task.jobId)
    );
    
    const snapshot = await getDocs(q);
    let trackingId: string;
    
    if (!snapshot.empty) {
      // Use existing tracking record
      trackingId = snapshot.docs[0].id;
      console.log(`Found existing tracking record: ${trackingId}`);
    } else {
      // Create new tracking record if none exists
      console.log(`No tracking record found for task ${task.id}, creating new one`);
      const { startTaskTracking, updateTaskEstimatedDuration } = await import('./task-tracking');
      trackingId = await startTaskTracking(task.id, task.jobId, manufacturingData.operatorId);
      
      // Update estimated duration from task data
      if (task.estimatedDurationHours) {
        await updateTaskEstimatedDuration(trackingId, task.estimatedDurationHours);
      }
    }
    
    // Complete task tracking with sanitized quality result
    await completeTaskTracking(
      trackingId, // Use the actual tracking record ID
      sanitizedQualityResult,
      operatorNotes
    );
    
    // Update task with completion data
    const updatedTask: JobTask = {
      ...task,
      status: 'completed',
      actualEnd: manufacturingData.processEndTime,
      actualStart: task.actualStart || manufacturingData.setupStartTime,
      actualDurationHours: (manufacturingData.actualSetupTimeMinutes + manufacturingData.actualProcessTimeMinutes) / 60,
      updatedAt: now,
      
      // Add enhanced manufacturing data to task
      setupTimeMinutes: manufacturingData.actualSetupTimeMinutes,
      cycleTimeMinutes: manufacturingData.averageCycleTimeMinutes,
      assignedTo: manufacturingData.operatorId,
      scheduledMachineId: manufacturingData.machineUsed
    };
    
    // Update task in Firestore
    await updateTaskInFirestore(updatedTask);
    
    console.log(`✅ Enhanced manufacturing completion recorded: ${recordId}`);
    console.log(`   - Setup Time: ${manufacturingData.actualSetupTimeMinutes} min (${manufacturingData.setupEfficiency}% efficiency)`);
    console.log(`   - Process Time: ${manufacturingData.actualProcessTimeMinutes} min`);
    console.log(`   - Cycle Time: ${manufacturingData.averageCycleTimeMinutes} min (${manufacturingData.cycleTimeEfficiency}% efficiency)`);
    console.log(`   - Yield: ${manufacturingData.outputQuantity}/${manufacturingData.inputQuantity} parts (${manufacturingData.yieldPercentage}%)`);
    console.log(`   - Quality Score: ${qualityResult.score}/10`);
    
    return {
      success: true,
      recordId
    };
    
  } catch (error) {
    console.error('Error completing manufacturing task with enhanced data:', error);
    
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Get enhanced manufacturing records for a job
 */
export async function getJobEnhancedManufacturingRecords(jobId: string): Promise<EnhancedManufacturingRecord[]> {
  try {
    const { getDocs, query, where } = await import('firebase/firestore');
    
    const q = query(
      collection(db, ENHANCED_MANUFACTURING_RECORDS_COLLECTION),
      where('jobId', '==', jobId)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as EnhancedManufacturingRecordFirestore;
      return convertEnhancedRecordFromFirestore(data);
    });
    
  } catch (error) {
    console.error('Error getting enhanced manufacturing records:', error);
    return [];
  }
}

/**
 * Get enhanced manufacturing records for a specific task
 */
export async function getTaskEnhancedManufacturingRecord(taskId: string): Promise<EnhancedManufacturingRecord | null> {
  try {
    const { getDocs, query, where } = await import('firebase/firestore');
    
    const q = query(
      collection(db, ENHANCED_MANUFACTURING_RECORDS_COLLECTION),
      where('taskId', '==', taskId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const data = snapshot.docs[0].data() as EnhancedManufacturingRecordFirestore;
    return convertEnhancedRecordFromFirestore(data);
    
  } catch (error) {
    console.error('Error getting enhanced manufacturing record for task:', error);
    return null;
  }
}

/**
 * Calculate manufacturing performance metrics from enhanced records
 */
export function calculateManufacturingPerformanceMetrics(records: EnhancedManufacturingRecord[]): {
  avgSetupEfficiency: number;
  avgCycleTimeEfficiency: number;
  avgYield: number;
  totalPartsProduced: number;
  totalPartsInput: number;
  totalSetupTime: number;
  totalProcessTime: number;
  avgQualityEfficiency: number;
  overallEfficiency: number;
} {
  if (records.length === 0) {
    return {
      avgSetupEfficiency: 0,
      avgCycleTimeEfficiency: 0,
      avgYield: 0,
      totalPartsProduced: 0,
      totalPartsInput: 0,
      totalSetupTime: 0,
      totalProcessTime: 0,
      avgQualityEfficiency: 0,
      overallEfficiency: 0
    };
  }
  
  const totals = records.reduce((acc, record) => ({
    setupEfficiency: acc.setupEfficiency + record.setupEfficiency,
    cycleTimeEfficiency: acc.cycleTimeEfficiency + record.cycleTimeEfficiency,
    yieldPercentage: acc.yieldPercentage + record.yieldPercentage,
    partsProduced: acc.partsProduced + record.outputQuantity,
    partsInput: acc.partsInput + record.inputQuantity,
    setupTime: acc.setupTime + record.actualSetupTimeMinutes,
    processTime: acc.processTime + record.actualProcessTimeMinutes,
    qualityEfficiency: acc.qualityEfficiency + record.qualityEfficiency
  }), {
    setupEfficiency: 0,
    cycleTimeEfficiency: 0,
    yieldPercentage: 0,
    partsProduced: 0,
    partsInput: 0,
    setupTime: 0,
    processTime: 0,
    qualityEfficiency: 0
  });
  
  const count = records.length;
  
  const avgSetupEfficiency = Math.round(totals.setupEfficiency / count);
  const avgCycleTimeEfficiency = Math.round(totals.cycleTimeEfficiency / count);
  const avgYield = Math.round(totals.yieldPercentage / count);
  const avgQualityEfficiency = Math.round(totals.qualityEfficiency / count);
  
  // Overall efficiency is weighted average of setup, cycle time, and quality efficiency
  const overallEfficiency = Math.round(
    (avgSetupEfficiency * 0.3 + avgCycleTimeEfficiency * 0.4 + avgQualityEfficiency * 0.3)
  );
  
  return {
    avgSetupEfficiency,
    avgCycleTimeEfficiency,
    avgYield,
    totalPartsProduced: totals.partsProduced,
    totalPartsInput: totals.partsInput,
    totalSetupTime: totals.setupTime,
    totalProcessTime: totals.processTime,
    avgQualityEfficiency,
    overallEfficiency
  };
}

/**
 * Generate manufacturing summary report for archival
 */
export function generateManufacturingSummaryForArchive(records: EnhancedManufacturingRecord[]): {
  summary: string;
  metrics: ReturnType<typeof calculateManufacturingPerformanceMetrics>;
  recommendations: string[];
  lessonsLearned: string[];
} {
  const metrics = calculateManufacturingPerformanceMetrics(records);
  
  // Generate recommendations based on performance
  const recommendations: string[] = [];
  const lessonsLearned: string[] = [];
  
  if (metrics.avgSetupEfficiency < 80) {
    recommendations.push('Review setup procedures and consider setup time optimization');
    lessonsLearned.push(`Setup efficiency was ${metrics.avgSetupEfficiency}% - consider standardizing setup procedures`);
  }
  
  if (metrics.avgCycleTimeEfficiency < 90) {
    recommendations.push('Analyze cycle time variations and optimize cutting parameters');
    lessonsLearned.push(`Cycle time efficiency was ${metrics.avgCycleTimeEfficiency}% - review actual vs estimated times`);
  }
  
  if (metrics.avgYield < 95) {
    recommendations.push('Investigate scrap/rework causes and implement preventive measures');
    lessonsLearned.push(`Yield was ${metrics.avgYield}% - analyze quality issues and improve processes`);
  }
  
  // Positive learnings
  if (metrics.avgSetupEfficiency >= 95) {
    lessonsLearned.push('Excellent setup efficiency achieved - setup procedures are well optimized');
  }
  
  if (metrics.avgYield >= 98) {
    lessonsLearned.push('Outstanding yield achieved - quality processes are performing well');
  }
  
  const summary = `Manufacturing completed with ${metrics.overallEfficiency}% overall efficiency. ` +
    `Produced ${metrics.totalPartsProduced}/${metrics.totalPartsInput} parts (${metrics.avgYield}% yield) ` +
    `with ${Math.round(metrics.totalSetupTime + metrics.totalProcessTime)} minutes total time. ` +
    `Setup efficiency: ${metrics.avgSetupEfficiency}%, Cycle time efficiency: ${metrics.avgCycleTimeEfficiency}%.`;
  
  return {
    summary,
    metrics,
    recommendations,
    lessonsLearned
  };
}

/**
 * Convert enhanced manufacturing record from Firestore format
 */
function convertEnhancedRecordFromFirestore(data: EnhancedManufacturingRecordFirestore): EnhancedManufacturingRecord {
  return {
    ...data,
    setupStartTime: data.setupStartTime.toDate().toISOString(),
    setupEndTime: data.setupEndTime.toDate().toISOString(),
    processEndTime: data.processEndTime.toDate().toISOString(),
    createdAt: data.createdAt.toDate().toISOString(),
    updatedAt: data.updatedAt.toDate().toISOString()
  };
}

/**
 * Get manufacturing performance trends for a part
 */
export async function getPartManufacturingTrends(partName: string, limit: number = 10): Promise<{
  setupTimeTrend: Array<{ date: string; time: number; efficiency: number }>;
  cycleTimeTrend: Array<{ date: string; time: number; efficiency: number }>;
  yieldTrend: Array<{ date: string; yield: number }>;
  averageMetrics: ReturnType<typeof calculateManufacturingPerformanceMetrics>;
}> {
  try {
    // This would require additional indexing in a real implementation
    // For now, return structure showing what data would be available
    
    const setupTimeTrend: Array<{ date: string; time: number; efficiency: number }> = [];
    const cycleTimeTrend: Array<{ date: string; time: number; efficiency: number }> = [];
    const yieldTrend: Array<{ date: string; yield: number }> = [];
    
    // In a real implementation, this would query the archives for historical data
    // and calculate trends over time for the specific part
    
    return {
      setupTimeTrend,
      cycleTimeTrend,
      yieldTrend,
      averageMetrics: calculateManufacturingPerformanceMetrics([])
    };
    
  } catch (error) {
    console.error('Error getting manufacturing trends:', error);
    return {
      setupTimeTrend: [],
      cycleTimeTrend: [],
      yieldTrend: [],
      averageMetrics: calculateManufacturingPerformanceMetrics([])
    };
  }
}