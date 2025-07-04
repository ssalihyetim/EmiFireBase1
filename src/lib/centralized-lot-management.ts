import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { generateLotNumber as baseLotGenerator } from './lot-number-generator';

// Collection for storing job-specific lot number mappings
const JOB_LOT_MAPPINGS_COLLECTION = 'job_lot_mappings';

/**
 * Interface for job lot mapping
 */
export interface JobLotMapping {
  jobId: string;
  lotNumber: string;
  partNumber: string;
  partName: string;
  orderId: string;
  createdAt: string;
  lastUpdated: string;
  // Track which components have used this lot number
  usageHistory: {
    component: 'job_creation' | 'traceability_task' | 'routing_sheet' | 'material_approval';
    timestamp: string;
    notes?: string;
  }[];
}

/**
 * Generate an aligned lot number based on job ID lot number
 * This creates a formatted lot number using the job's sequential lot number
 */
function generateAlignedLotNumber(
  jobId: string,
  orderId: string,
  partNumber: string,
  sequentialLotNumber?: number
): string {
  // Extract lot number from job ID if not provided
  const jobInfo = extractJobInfoFromId(jobId);
  const lotSequence = sequentialLotNumber || jobInfo?.lotNumber || 1;
  
  // Create aligned lot number format: PART-ORDER-LOT-SEQUENCE
  // Example: 1606P-AERO001-LOT-001
  const orderCode = orderId.replace(/[^A-Z0-9]/g, '').slice(-6); // Last 6 chars of order
  const partCode = partNumber.replace(/[^A-Z0-9]/g, '').slice(0, 6); // First 6 chars of part
  const sequenceStr = lotSequence.toString().padStart(3, '0');
  
  return `${partCode}-${orderCode}-LOT-${sequenceStr}`;
}

/**
 * Get or create a consistent lot number for a job
 * This is the SINGLE SOURCE OF TRUTH for lot numbers
 * 
 * ENHANCED: Now aligns with job ID lot numbers for consistency
 */
export async function getJobLotNumber(
  jobId: string, 
  partNumber: string, 
  partName: string, 
  orderId: string,
  component: 'job_creation' | 'traceability_task' | 'routing_sheet' | 'material_approval'
): Promise<string> {
  // Extract job info from ID if parameters are missing or default
  const jobInfo = extractJobInfoFromId(jobId);
  const resolvedOrderId = orderId !== 'unknown-order' ? orderId : (jobInfo?.orderId || 'unknown-order');
  const resolvedPartNumber = partNumber !== 'PART' ? partNumber : (jobInfo?.orderId?.split('-')[0] || 'PART');
  const resolvedPartName = partName !== 'Unknown Part' ? partName : resolvedPartNumber;
  
  try {
    // First, check if this job already has a lot number assigned
    const mappingDocRef = doc(db, JOB_LOT_MAPPINGS_COLLECTION, jobId);
    const mappingDoc = await getDoc(mappingDocRef);
    
    if (mappingDoc.exists()) {
      const mapping = mappingDoc.data() as JobLotMapping;
      
      // Record this component's usage
      await updateDoc(mappingDocRef, {
        usageHistory: [
          ...mapping.usageHistory,
          {
            component,
            timestamp: new Date().toISOString(),
            notes: `Lot number retrieved by ${component}`
          }
        ],
        lastUpdated: new Date().toISOString()
      });
      
      console.log(`📋 Retrieved existing lot number ${mapping.lotNumber} for job ${jobId} (used by ${component})`);
      return mapping.lotNumber;
    }
    
    // Generate aligned lot number based on job ID
    let alignedLotNumber: string;
    
    if (jobInfo?.lotNumber) {
      // Job ID contains lot number - use it for alignment
      alignedLotNumber = generateAlignedLotNumber(
        jobId, 
        resolvedOrderId, 
        resolvedPartNumber, 
        jobInfo.lotNumber
      );
      console.log(`🎯 Generated aligned lot number from job ID: ${alignedLotNumber} (sequence: ${jobInfo.lotNumber})`);
    } else {
      // Job ID doesn't contain lot number - generate aligned lot number
      alignedLotNumber = await baseLotGenerator(
        jobId,
        'job-task-lot',
        resolvedPartNumber,
        'Set Traceability & Lot Number'
      );
      console.log(`📋 Generated aligned lot number: ${alignedLotNumber}`);
    }
    
    // Create the mapping record
    const lotMapping: JobLotMapping = {
      jobId,
      lotNumber: alignedLotNumber,
      partNumber: resolvedPartNumber,
      partName: resolvedPartName,
      orderId: resolvedOrderId,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      usageHistory: [
        {
          component,
          timestamp: new Date().toISOString(),
          notes: `Initial lot number generation by ${component}${jobInfo?.lotNumber ? ` (aligned with job lot ${jobInfo.lotNumber})` : ''}`
        }
      ]
    };
    
    // Save the mapping
    await setDoc(mappingDocRef, lotMapping);
    
    console.log(`📋 Created lot mapping: ${jobId} → ${alignedLotNumber} (created by ${component})`);
    return alignedLotNumber;
    
  } catch (error) {
    console.error('Error getting job lot number:', error);
    
    // Fallback: Generate aligned lot number offline
    if (jobInfo?.lotNumber) {
      const fallbackAligned = generateAlignedLotNumber(
        jobId, 
        resolvedOrderId, 
        resolvedPartNumber, 
        jobInfo.lotNumber
      );
      console.warn(`Using fallback aligned lot number: ${fallbackAligned}`);
      return fallbackAligned;
    }
    
    // Ultimate fallback: Simple lot number
    const fallbackLot = `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    console.warn(`Using ultimate fallback lot number: ${fallbackLot}`);
    return fallbackLot;
  }
}

/**
 * Update lot number usage when a component uses it
 */
export async function recordLotNumberUsage(
  jobId: string,
  component: 'job_creation' | 'traceability_task' | 'routing_sheet' | 'material_approval',
  notes?: string
): Promise<void> {
  try {
    const mappingDocRef = doc(db, JOB_LOT_MAPPINGS_COLLECTION, jobId);
    const mappingDoc = await getDoc(mappingDocRef);
    
    if (mappingDoc.exists()) {
      const mapping = mappingDoc.data() as JobLotMapping;
      
      await updateDoc(mappingDocRef, {
        usageHistory: [
          ...mapping.usageHistory,
          {
            component,
            timestamp: new Date().toISOString(),
            notes: notes || `Lot number used by ${component}`
          }
        ],
        lastUpdated: new Date().toISOString()
      });
      
      console.log(`📝 Recorded lot number usage by ${component} for job ${jobId}`);
    }
  } catch (error) {
    console.error('Error recording lot number usage:', error);
  }
}

/**
 * Get lot number mapping information for a job (for debugging/audit)
 */
export async function getJobLotMapping(jobId: string): Promise<JobLotMapping | null> {
  try {
    const mappingDocRef = doc(db, JOB_LOT_MAPPINGS_COLLECTION, jobId);
    const mappingDoc = await getDoc(mappingDocRef);
    
    if (mappingDoc.exists()) {
      return mappingDoc.data() as JobLotMapping;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting job lot mapping:', error);
    return null;
  }
}

/**
 * Get all lot mappings for debugging/admin purposes
 */
export async function getAllJobLotMappings(): Promise<JobLotMapping[]> {
  try {
    const mappingsQuery = query(collection(db, JOB_LOT_MAPPINGS_COLLECTION));
    const mappingsSnapshot = await getDocs(mappingsQuery);
    
    return mappingsSnapshot.docs.map(doc => doc.data() as JobLotMapping);
  } catch (error) {
    console.error('Error getting all job lot mappings:', error);
    return [];
  }
}

/**
 * Extract job information from job ID (if using lot-based job IDs)
 */
export function extractJobInfoFromId(jobId: string): {
  orderId?: string;
  itemId?: string;
  lotNumber?: number;
} | null {
  // Handle lot-based job IDs: "orderId-item-itemId-lot-lotNumber"
  const lotMatch = jobId.match(/^(.+)-item-(.+)-lot-(\d+)$/);
  if (lotMatch) {
    return {
      orderId: lotMatch[1],
      itemId: lotMatch[2],
      lotNumber: parseInt(lotMatch[3], 10)
    };
  }
  
  // Handle clean simple job IDs: "orderId-item-itemId"
  const cleanSimpleMatch = jobId.match(/^(.+)-item-(.+)$/);
  if (cleanSimpleMatch) {
    return {
      orderId: cleanSimpleMatch[1],
      itemId: cleanSimpleMatch[2]
    };
  }
  
  return null;
}

/**
 * Get aligned lot number display format for UI
 * Converts internal lot number to human-readable format
 */
export function getAlignedLotDisplayName(jobId: string, partName: string): string {
  const jobInfo = extractJobInfoFromId(jobId);
  if (jobInfo?.lotNumber) {
    return `${partName} (Lot ${jobInfo.lotNumber})`;
  }
  return partName;
}

 