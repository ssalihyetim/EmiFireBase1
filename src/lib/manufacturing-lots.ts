import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import type { Job, JobTask, JobSubtask } from '@/types';
import type { 
  ManufacturingLot, 
  ManufacturingLotFirestore,
  LotCreationResult,
  LotPerformanceUpdate,
  LotSearchCriteria
} from '@/types/archival';
import { getJobPattern } from './job-patterns';
import { createJobFromPattern } from './enhanced-job-creation';

const MANUFACTURING_LOTS_COLLECTION = 'manufacturing_lots';
const JOBS_COLLECTION = 'jobs';

// === Lot Creation ===

/**
 * Create a new manufacturing lot with multiple identical jobs
 */
export async function createManufacturingLot(
  lotData: {
    lotName: string;
    patternId: string;
    partNumber: string;
    quantity: number;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    requestedBy: string;
    targetDeliveryDate: string;
    specialInstructions?: string;
  }
): Promise<LotCreationResult> {
  try {
    console.log(`Creating manufacturing lot: ${lotData.lotName}`);
    
    // Validate the pattern exists
    const pattern = await getJobPattern(lotData.patternId);
    if (!pattern) {
          return {
      success: false,
      errors: [`Pattern ${lotData.patternId} not found`],
      jobsCreated: 0
    };
    }
    
    // Validate lot parameters
    if (lotData.quantity <= 0 || lotData.quantity > 1000) {
      return {
        success: false,
        errors: ['Lot quantity must be between 1 and 1000']
      };
    }
    
    // Generate lot ID
    const lotId = generateLotId(lotData.partNumber, lotData.quantity);
    
    // Create lot record
    const lot: ManufacturingLotFirestore = {
      id: lotId,
      lotName: lotData.lotName,
      lotNumber: generateLotNumber(),
      patternId: lotData.patternId,
      partNumber: lotData.partNumber,
      
      lotSpecification: {
        totalQuantity: lotData.quantity,
        completedQuantity: 0,
        priority: lotData.priority,
        targetDeliveryDate: lotData.targetDeliveryDate,
        specialInstructions: lotData.specialInstructions || ''
      },
      
      qualityInheritance: {
        inheritedFromPattern: lotData.patternId,
        expectedQualityScore: pattern.historicalPerformance.avgQualityScore,
        targetEfficiency: pattern.historicalPerformance.successRate,
        criticalParameters: pattern.frozenProcessData.criticalParameters
      },
      
      performanceTracking: {
        overallProgress: 0,
        avgQualityScore: 0,
        onTimeDeliveryRate: 0,
        defectRate: 0,
        customerSatisfaction: 0
      },
      
      jobIds: [], // Will be populated as jobs are created
      
      status: 'planning',
      createdBy: lotData.requestedBy,
      createdAt: serverTimestamp() as Timestamp,
      lastUpdated: serverTimestamp() as Timestamp
    };
    
    // Save lot to database
    await setDoc(doc(db, MANUFACTURING_LOTS_COLLECTION, lotId), lot);
    
    console.log(`Successfully created lot ${lotId}`);
    
    return {
      success: true,
      lotId,
      lotNumber: lot.lotNumber,
      message: `Created manufacturing lot ${lotData.lotName} with ${lotData.quantity} units`
    };
    
  } catch (error) {
    console.error('Error creating manufacturing lot:', error);
    
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown lot creation error']
    };
  }
}

/**
 * Create jobs for a manufacturing lot
 */
export async function createLotJobs(
  lotId: string,
  overrides?: {
    customDeliveryDates?: string[];
    specialInstructions?: string[];
    assignedOperators?: string[];
  }
): Promise<{
  success: boolean;
  jobIds: string[];
  errors?: string[];
}> {
  try {
    const lotDoc = await getDoc(doc(db, MANUFACTURING_LOTS_COLLECTION, lotId));
    if (!lotDoc.exists()) {
      return {
        success: false,
        jobIds: [],
        errors: ['Manufacturing lot not found']
      };
    }
    
    const lot = convertLotFromFirestore(lotDoc.data() as ManufacturingLotFirestore);
    
    // Get the pattern
    const pattern = await getJobPattern(lot.patternId);
    if (!pattern) {
      return {
        success: false,
        jobIds: [],
        errors: ['Pattern not found for lot']
      };
    }
    
    const createdJobIds: string[] = [];
    const errors: string[] = [];
    
    // Create jobs for the lot
    for (let i = 0; i < lot.lotSpecification.totalQuantity; i++) {
      try {
        const jobNumber = i + 1;
        const jobName = `${lot.lotName} - Unit ${jobNumber}`;
        
        // Create job from pattern
        const jobResult = await createJobFromPattern(
          pattern.id,
          {
            customJobName: jobName,
            quantity: 1,
            priority: lot.lotSpecification.priority,
            targetDeliveryDate: overrides?.customDeliveryDates?.[i] || lot.lotSpecification.targetDeliveryDate,
            specialInstructions: overrides?.specialInstructions?.[i] || lot.lotSpecification.specialInstructions,
            assignedOperator: overrides?.assignedOperators?.[i]
          }
        );
        
        if (jobResult.success && jobResult.jobId) {
          createdJobIds.push(jobResult.jobId);
        } else {
          errors.push(`Failed to create job ${jobNumber}: ${jobResult.errors?.join(', ')}`);
        }
        
      } catch (error) {
        errors.push(`Error creating job ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Update lot with job IDs
    if (createdJobIds.length > 0) {
      await updateDoc(doc(db, MANUFACTURING_LOTS_COLLECTION, lotId), {
        jobIds: createdJobIds,
        status: 'in_progress',
        lastUpdated: serverTimestamp()
      });
    }
    
    return {
      success: createdJobIds.length > 0,
      jobIds: createdJobIds,
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    console.error('Error creating lot jobs:', error);
    
    return {
      success: false,
      jobIds: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// === Lot Management ===

/**
 * Get a manufacturing lot by ID
 */
export async function getManufacturingLot(lotId: string): Promise<ManufacturingLot | null> {
  try {
    const docRef = await getDoc(doc(db, MANUFACTURING_LOTS_COLLECTION, lotId));
    if (!docRef.exists()) return null;
    
    return convertLotFromFirestore(docRef.data() as ManufacturingLotFirestore);
  } catch (error) {
    console.error('Error retrieving manufacturing lot:', error);
    return null;
  }
}

/**
 * Update lot performance based on completed jobs
 */
export async function updateLotPerformance(
  lotId: string,
  update: LotPerformanceUpdate
): Promise<void> {
  try {
    const lotDoc = await getDoc(doc(db, MANUFACTURING_LOTS_COLLECTION, lotId));
    if (!lotDoc.exists()) {
      throw new Error(`Manufacturing lot ${lotId} not found`);
    }
    
    const lot = lotDoc.data() as ManufacturingLotFirestore;
    
    // Calculate new performance metrics
    const totalCompleted = lot.lotSpecification.completedQuantity + (update.completedUnits || 0);
    const progressPercent = (totalCompleted / lot.lotSpecification.totalQuantity) * 100;
    
    // Update quality score (weighted average)
    let newAvgQuality = lot.performanceTracking.avgQualityScore;
    if (update.qualityScore && totalCompleted > 0) {
      const currentTotal = lot.performanceTracking.avgQualityScore * lot.lotSpecification.completedQuantity;
      const newTotal = currentTotal + (update.qualityScore * (update.completedUnits || 1));
      newAvgQuality = newTotal / totalCompleted;
    }
    
    // Calculate on-time delivery rate
    let onTimeRate = lot.performanceTracking.onTimeDeliveryRate;
    if (update.onTimeDelivery !== undefined && totalCompleted > 0) {
      const currentOnTime = (lot.performanceTracking.onTimeDeliveryRate / 100) * lot.lotSpecification.completedQuantity;
      const newOnTime = currentOnTime + (update.onTimeDelivery ? (update.completedUnits || 1) : 0);
      onTimeRate = (newOnTime / totalCompleted) * 100;
    }
    
    // Update defect rate
    let defectRate = lot.performanceTracking.defectRate;
    if (update.defectedUnits !== undefined && totalCompleted > 0) {
      const currentDefects = (lot.performanceTracking.defectRate / 100) * lot.lotSpecification.completedQuantity;
      const newDefects = currentDefects + (update.defectedUnits || 0);
      defectRate = (newDefects / totalCompleted) * 100;
    }
    
    // Determine new status
    let newStatus = lot.status;
    if (progressPercent >= 100) {
      newStatus = 'completed';
    } else if (progressPercent > 0) {
      newStatus = 'in_progress';
    }
    
    // Update the lot
    const updates: Partial<ManufacturingLotFirestore> = {
      'lotSpecification.completedQuantity': totalCompleted,
      'performanceTracking.overallProgress': progressPercent,
      'performanceTracking.avgQualityScore': newAvgQuality,
      'performanceTracking.onTimeDeliveryRate': onTimeRate,
      'performanceTracking.defectRate': defectRate,
      status: newStatus,
      lastUpdated: serverTimestamp() as Timestamp
    };
    
    if (update.customerSatisfaction) {
      updates['performanceTracking.customerSatisfaction'] = update.customerSatisfaction;
    }
    
    await updateDoc(doc(db, MANUFACTURING_LOTS_COLLECTION, lotId), updates);
    
    console.log(`Updated lot ${lotId} performance: ${progressPercent.toFixed(1)}% complete`);
    
  } catch (error) {
    console.error('Error updating lot performance:', error);
    throw error;
  }
}

/**
 * Search manufacturing lots
 */
export async function searchManufacturingLots(
  criteria: LotSearchCriteria,
  maxResults: number = 50
): Promise<ManufacturingLot[]> {
  try {
    let q = collection(db, MANUFACTURING_LOTS_COLLECTION);
    const constraints = [];
    
    // Build query constraints
    if (criteria.partNumber) {
      constraints.push(where('partNumber', '==', criteria.partNumber));
    }
    
    if (criteria.patternId) {
      constraints.push(where('patternId', '==', criteria.patternId));
    }
    
    if (criteria.status && criteria.status.length > 0) {
      constraints.push(where('status', 'in', criteria.status));
    }
    
    if (criteria.priority && criteria.priority.length > 0) {
      constraints.push(where('lotSpecification.priority', 'in', criteria.priority));
    }
    
    // Add ordering and limit
    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(maxResults));
    
    const querySnapshot = await getDocs(query(q, ...constraints));
    
    return querySnapshot.docs.map(doc => 
      convertLotFromFirestore(doc.data() as ManufacturingLotFirestore)
    );
    
  } catch (error) {
    console.error('Error searching manufacturing lots:', error);
    return [];
  }
}

/**
 * Get active lots (planning or in_progress)
 */
export async function getActiveLots(): Promise<ManufacturingLot[]> {
  return searchManufacturingLots({ 
    status: ['planning', 'in_progress'] 
  });
}

/**
 * Get lot performance summary
 */
export async function getLotPerformanceSummary(): Promise<{
  totalLots: number;
  activeLots: number;
  completedLots: number;
  avgQuality: number;
  avgDeliveryRate: number;
  totalUnitsProduced: number;
}> {
  try {
    const allLots = await searchManufacturingLots({}, 1000);
    
    const activeLots = allLots.filter(lot => 
      lot.status === 'planning' || lot.status === 'in_progress'
    );
    
    const completedLots = allLots.filter(lot => lot.status === 'completed');
    
    const avgQuality = allLots.length > 0
      ? allLots.reduce((sum, lot) => sum + lot.performanceTracking.avgQualityScore, 0) / allLots.length
      : 0;
    
    const avgDeliveryRate = allLots.length > 0
      ? allLots.reduce((sum, lot) => sum + lot.performanceTracking.onTimeDeliveryRate, 0) / allLots.length
      : 0;
    
    const totalUnitsProduced = allLots.reduce((sum, lot) => 
      sum + lot.lotSpecification.completedQuantity, 0
    );
    
    return {
      totalLots: allLots.length,
      activeLots: activeLots.length,
      completedLots: completedLots.length,
      avgQuality,
      avgDeliveryRate,
      totalUnitsProduced
    };
    
  } catch (error) {
    console.error('Error calculating lot performance summary:', error);
    return {
      totalLots: 0,
      activeLots: 0,
      completedLots: 0,
      avgQuality: 0,
      avgDeliveryRate: 0,
      totalUnitsProduced: 0
    };
  }
}

// === Utility Functions ===

/**
 * Generate unique lot ID
 */
function generateLotId(partNumber: string, quantity: number): string {
  const cleanPartNumber = partNumber.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = Date.now();
  
  return `lot_${cleanPartNumber}_qty${quantity}_${timestamp}`.toLowerCase();
}

/**
 * Generate lot number for tracking
 */
function generateLotNumber(): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `LOT-${year}${month}-${randomNum}`;
}

/**
 * Convert Firestore data to TypeScript interface
 */
function convertLotFromFirestore(data: ManufacturingLotFirestore): ManufacturingLot {
  return {
    ...data,
    createdAt: data.createdAt.toDate().toISOString(),
    lastUpdated: data.lastUpdated.toDate().toISOString()
  };
}

// === Lot Analytics ===

/**
 * Calculate lot success rate by pattern
 */
export async function getLotSuccessRateByPattern(): Promise<Array<{
  patternId: string;
  patternName: string;
  totalLots: number;
  successfulLots: number;
  successRate: number;
  avgQuality: number;
}>> {
  try {
    const allLots = await searchManufacturingLots({}, 1000);
    
    // Group by pattern
    const patternMap = new Map<string, {
      patternName: string;
      lots: ManufacturingLot[];
    }>();
    
    allLots.forEach(lot => {
      if (!patternMap.has(lot.patternId)) {
        patternMap.set(lot.patternId, {
          patternName: lot.lotName.split(' - ')[0] || lot.patternId,
          lots: []
        });
      }
      patternMap.get(lot.patternId)!.lots.push(lot);
    });
    
    // Calculate success rates
    return Array.from(patternMap.entries()).map(([patternId, data]) => {
      const completedLots = data.lots.filter(lot => lot.status === 'completed');
      const successfulLots = completedLots.filter(lot => 
        lot.performanceTracking.avgQualityScore >= 8 && 
        lot.performanceTracking.defectRate <= 5
      );
      
      const avgQuality = completedLots.length > 0
        ? completedLots.reduce((sum, lot) => sum + lot.performanceTracking.avgQualityScore, 0) / completedLots.length
        : 0;
      
      return {
        patternId,
        patternName: data.patternName,
        totalLots: data.lots.length,
        successfulLots: successfulLots.length,
        successRate: completedLots.length > 0 ? (successfulLots.length / completedLots.length) * 100 : 0,
        avgQuality
      };
    });
    
  } catch (error) {
    console.error('Error calculating lot success rates:', error);
    return [];
  }
}

// === Lot Number Generation ===

/**
 * Generate the next lot number for a given part
 */
export async function getNextLotNumber(partNumber: string): Promise<number> {
  try {
    console.log(`🔢 Getting next lot number for part: ${partNumber}`);
    
    // Query all lots for this part number
    const lotsQuery = query(
      collection(db, MANUFACTURING_LOTS_COLLECTION),
      where('partNumber', '==', partNumber),
      orderBy('lotNumber', 'desc'),
      limit(1)
    );
    
    const lotsSnapshot = await getDocs(lotsQuery);
    
    if (lotsSnapshot.empty) {
      console.log(`📦 No existing lots found for ${partNumber}, starting with lot 1`);
      return 1;
    }
    
    const latestLot = lotsSnapshot.docs[0].data();
    const nextLotNumber = latestLot.lotNumber + 1;
    
    console.log(`📦 Latest lot for ${partNumber}: ${latestLot.lotNumber}, next: ${nextLotNumber}`);
    return nextLotNumber;
    
  } catch (error) {
    console.error('Error getting next lot number:', error);
    return 1; // Fallback to lot 1
  }
}

/**
 * Create lot info for a new job
 */
export async function createLotInfo(
  jobId: string,
  partNumber: string,
  orderId: string
): Promise<LotInfo> {
  try {
    const lotNumber = await getNextLotNumber(partNumber);
    const lotId = `${partNumber}_LOT_${lotNumber}_${Date.now()}`;
    
    const lotInfo: LotInfo = {
      lotNumber,
      lotId,
      partNumber,
      totalLotsForPart: lotNumber, // Will be updated when other lots are created
      createdAt: new Date().toISOString()
    };
    
    // Store lot info in dedicated collection
    await setDoc(doc(db, MANUFACTURING_LOTS_COLLECTION, lotId), {
      ...lotInfo,
      jobId,
      orderId,
      status: 'in_progress',
      createdAt: serverTimestamp() as Timestamp
    });
    
    console.log(`📦 Created lot info: ${lotId} (Lot ${lotNumber}) for part ${partNumber}`);
    return lotInfo;
    
  } catch (error) {
    console.error('Error creating lot info:', error);
    throw error;
  }
}

/**
 * Update lot info when job status changes
 */
export async function updateLotStatus(
  lotId: string,
  status: 'in_progress' | 'completed' | 'archived',
  additionalData?: {
    completedAt?: string;
    archivedAt?: string;
    archiveId?: string;
  }
): Promise<void> {
  try {
    const updateData: any = {
      status,
      lastUpdated: serverTimestamp() as Timestamp
    };
    
    if (additionalData?.completedAt) {
      updateData.completedAt = additionalData.completedAt;
    }
    
    if (additionalData?.archivedAt) {
      updateData.archivedAt = additionalData.archivedAt;
      updateData.archiveId = additionalData.archiveId;
    }
    
    await updateDoc(doc(db, MANUFACTURING_LOTS_COLLECTION, lotId), updateData);
    console.log(`📦 Updated lot ${lotId} status to: ${status}`);
    
  } catch (error) {
    console.error('Error updating lot status:', error);
    throw error;
  }
}

/**
 * Get all lots for a specific part number
 */
export async function getLotsForPart(partNumber: string): Promise<any[]> {
  try {
    const lotsQuery = query(
      collection(db, MANUFACTURING_LOTS_COLLECTION),
      where('partNumber', '==', partNumber),
      orderBy('lotNumber', 'asc')
    );
    
    const lotsSnapshot = await getDocs(lotsQuery);
    return lotsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      lastUpdated: doc.data().lastUpdated?.toDate?.()?.toISOString() || doc.data().lastUpdated
    }));
    
  } catch (error) {
    console.error('Error getting lots for part:', error);
    return [];
  }
}

/**
 * Get lot info by lot ID
 */
export async function getLotInfo(lotId: string): Promise<any | null> {
  try {
    const lotDoc = await getDoc(doc(db, MANUFACTURING_LOTS_COLLECTION, lotId));
    
    if (!lotDoc.exists()) {
      return null;
    }
    
    const data = lotDoc.data();
    return {
      id: lotDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || data.lastUpdated
    };
    
  } catch (error) {
    console.error('Error getting lot info:', error);
    return null;
  }
}

/**
 * Update total lots count for a part (called when new lots are created)
 */
export async function updateTotalLotsForPart(partNumber: string): Promise<void> {
  try {
    const lots = await getLotsForPart(partNumber);
    const totalLots = lots.length;
    
    // Update all lots for this part with the new total
    const updatePromises = lots.map(lot => 
      updateDoc(doc(db, MANUFACTURING_LOTS_COLLECTION, lot.id), {
        totalLotsForPart: totalLots
      })
    );
    
    await Promise.all(updatePromises);
    console.log(`📦 Updated total lots count to ${totalLots} for part ${partNumber}`);
    
  } catch (error) {
    console.error('Error updating total lots count:', error);
  }
}

// === Job Integration Functions ===

/**
 * Assign lot info to a job when it's created
 */
export async function assignLotToJob(job: Job): Promise<Job> {
  try {
    const partNumber = job.item.partName;
    console.log(`📦 Assigning lot to job ${job.id} for part ${partNumber}`);
    
    // Create lot info
    const lotInfo = await createLotInfo(job.id, partNumber, job.orderId);
    
    // Update the job with lot info
    const updatedJob: Job = {
      ...job,
      lotInfo
    };
    
    // Update total lots count
    await updateTotalLotsForPart(partNumber);
    
    return updatedJob;
    
  } catch (error) {
    console.error('Error assigning lot to job:', error);
    return job; // Return original job if lot assignment fails
  }
}

/**
 * Mark lot as completed when job is completed
 */
export async function completeLot(job: Job): Promise<void> {
  if (!job.lotInfo) {
    console.warn(`⚠️ No lot info found for job ${job.id}, cannot mark lot as completed`);
    return;
  }
  
  try {
    await updateLotStatus(job.lotInfo.lotId, 'completed', {
      completedAt: new Date().toISOString()
    });
    
    console.log(`✅ Marked lot ${job.lotInfo.lotId} as completed`);
    
  } catch (error) {
    console.error('Error marking lot as completed:', error);
  }
}

/**
 * Mark lot as archived when job is archived
 */
export async function archiveLot(job: Job, archiveId: string): Promise<void> {
  if (!job.lotInfo) {
    console.warn(`⚠️ No lot info found for job ${job.id}, cannot mark lot as archived`);
    return;
  }
  
  try {
    await updateLotStatus(job.lotInfo.lotId, 'archived', {
      archivedAt: new Date().toISOString(),
      archiveId
    });
    
    console.log(`🗄️ Marked lot ${job.lotInfo.lotId} as archived with ID ${archiveId}`);
    
  } catch (error) {
    console.error('Error marking lot as archived:', error);
  }
}

// === Display Helpers ===

/**
 * Generate display name for a job with lot info
 */
export function getJobDisplayName(job: Job): string {
  if (!job.lotInfo) {
    return job.item.partName;
  }
  
  return `${job.item.partName} (Lot ${job.lotInfo.lotNumber})`;
}

/**
 * Get lot summary for a part number
 */
export async function getLotSummary(partNumber: string): Promise<{
  totalLots: number;
  inProgress: number;
  completed: number;
  archived: number;
  lots: any[];
}> {
  try {
    const lots = await getLotsForPart(partNumber);
    
    return {
      totalLots: lots.length,
      inProgress: lots.filter(lot => lot.status === 'in_progress').length,
      completed: lots.filter(lot => lot.status === 'completed').length,
      archived: lots.filter(lot => lot.status === 'archived').length,
      lots
    };
    
  } catch (error) {
    console.error('Error getting lot summary:', error);
    return {
      totalLots: 0,
      inProgress: 0,
      completed: 0,
      archived: 0,
      lots: []
    };
  }
} 