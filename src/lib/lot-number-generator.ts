import { format } from 'date-fns';
import { collection, addDoc, query, where, orderBy, limit, getDocs, updateDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { GeneratedLotNumber, LotNumberConfig } from '@/types/manufacturing-templates';
import type { Job } from '@/types';

// Default lot number configuration
const DEFAULT_LOT_CONFIG: LotNumberConfig = {
  prefix: 'RM',
  dateFormat: 'YYYYMMDD',
  sequenceLength: 3,
  separator: '-',
  includeShift: true,
  customSuffix: ''
};

const LOT_COUNTERS_COLLECTION = 'lot_counters';

/**
 * Generate lot number based on configuration
 */
export async function generateLotNumber(
  jobId: string,
  taskId: string,
  materialType: string,
  taskName: string,
  config: Partial<LotNumberConfig> = {}
): Promise<string> {
  const lotConfig = { ...DEFAULT_LOT_CONFIG, ...config };
  
  try {
    // Get current date formatted
    const now = new Date();
    let dateStr = '';
    
    switch (lotConfig.dateFormat) {
      case 'YYYYMMDD':
        dateStr = format(now, 'yyyyMMdd');
        break;
      case 'YYMMDD':
        dateStr = format(now, 'yyMMdd');
        break;
      case 'MMDDYY':
        dateStr = format(now, 'MMddyy');
        break;
    }

    // Get current shift if enabled
    let shiftCode = '';
    if (lotConfig.includeShift) {
      const hour = now.getHours();
      if (hour >= 6 && hour < 14) shiftCode = 'A'; // Day shift
      else if (hour >= 14 && hour < 22) shiftCode = 'B'; // Evening shift
      else shiftCode = 'C'; // Night shift
    }

    // Get next sequence number for this task name and date
    const sequence = await getNextSequenceNumber(taskName, dateStr);
    const sequenceStr = sequence.toString().padStart(lotConfig.sequenceLength, '0');

    // Build lot number
    const parts = [
      lotConfig.prefix,
      dateStr,
      shiftCode,
      sequenceStr
    ].filter(Boolean);
    
    if (lotConfig.customSuffix) {
      parts.push(lotConfig.customSuffix);
    }

    const lotNumber = parts.join(lotConfig.separator);

    // Save the generated lot number to Firebase
    const generatedLot: Omit<GeneratedLotNumber, 'id'> = {
      lotNumber,
      generatedAt: now.toISOString(),
      jobId,
      taskId,
      taskName,
      materialType,
      sequence,
      isUsed: false
    };

    await addDoc(collection(db, 'generated_lot_numbers'), generatedLot);

    return lotNumber;
  } catch (error) {
    console.error('Error generating lot number:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate lot number: ${error.message}`);
    } else {
      throw new Error('Failed to generate lot number: Unknown error occurred');
    }
  }
}

/**
 * Get next sequence number for a task name on a specific date
 */
async function getNextSequenceNumber(taskName: string, dateStr: string): Promise<number> {
  try {
    // Query for existing lot numbers for this task name and date
    const q = query(
      collection(db, 'generated_lot_numbers'),
      where('taskName', '==', taskName),
      where('generatedAt', '>=', dateStr + 'T00:00:00.000Z'),
      where('generatedAt', '<=', dateStr + 'T23:59:59.999Z'),
      orderBy('sequence', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return 1; // First lot number for this task today
    }

    const lastDoc = querySnapshot.docs[0];
    const lastSequence = lastDoc.data().sequence || 0;
    return lastSequence + 1;
  } catch (error) {
    console.error('Error getting next sequence number:', error);
    console.warn('Using timestamp-based fallback sequence number');
    // Fallback to timestamp-based sequence (ensure it's between 1-999)
    const fallbackSequence = Math.floor(Date.now() / 1000) % 999 + 1;
    return fallbackSequence;
  }
}

/**
 * Generate lot numbers for multiple tasks with same name
 */
export async function generateLotNumbersForSameTasks(
  tasks: Array<{ id: string; name: string; jobId: string; materialType?: string }>,
  config: Partial<LotNumberConfig> = {}
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  
  // Group tasks by name
  const tasksByName = tasks.reduce((acc, task) => {
    if (!acc[task.name]) {
      acc[task.name] = [];
    }
    acc[task.name].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);

  // Generate lot numbers for each group
  for (const [taskName, taskGroup] of Object.entries(tasksByName)) {
    for (const task of taskGroup) {
      try {
        const lotNumber = await generateLotNumber(
          task.jobId,
          task.id,
          task.materialType || 'Unknown',
          taskName,
          config
        );
        result[task.id] = lotNumber;
      } catch (error) {
        console.error(`Error generating lot number for task ${task.id}:`, error);
        result[task.id] = `ERROR-${task.id.slice(-6)}`;
      }
    }
  }

  return result;
}

/**
 * Mark lot number as used
 */
export async function markLotNumberAsUsed(lotNumber: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'generated_lot_numbers'),
      where('lotNumber', '==', lotNumber),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      await updateDoc(doc.ref, { isUsed: true });
    }
  } catch (error) {
    console.error('Error marking lot number as used:', error);
  }
}

/**
 * Validate lot number format
 */
export function validateLotNumber(lotNumber: string, config: Partial<LotNumberConfig> = {}): boolean {
  const lotConfig = { ...DEFAULT_LOT_CONFIG, ...config };
  
  const parts = lotNumber.split(lotConfig.separator);
  
  // Check minimum parts (prefix + date + sequence)
  if (parts.length < 3) return false;
  
  // Check prefix
  if (parts[0] !== lotConfig.prefix) return false;
  
  // Check date format
  const datePattern = lotConfig.dateFormat === 'YYYYMMDD' ? /^\d{8}$/ : 
                     lotConfig.dateFormat === 'YYMMDD' ? /^\d{6}$/ : /^\d{6}$/;
  if (!datePattern.test(parts[1])) return false;
  
  // Check sequence number
  const sequenceIndex = lotConfig.includeShift ? 3 : 2;
  if (parts.length <= sequenceIndex) return false;
  
  const sequence = parts[sequenceIndex];
  if (!/^\d+$/.test(sequence)) return false;
  
  return true;
}

/**
 * Parse lot number into components
 */
export function parseLotNumber(lotNumber: string, config: Partial<LotNumberConfig> = {}): {
  prefix: string;
  date: string;
  shift?: string;
  sequence: number;
  suffix?: string;
} | null {
  if (!validateLotNumber(lotNumber, config)) {
    return null;
  }
  
  const lotConfig = { ...DEFAULT_LOT_CONFIG, ...config };
  const parts = lotNumber.split(lotConfig.separator);
  
  const result = {
    prefix: parts[0],
    date: parts[1],
    shift: lotConfig.includeShift ? parts[2] : undefined,
    sequence: parseInt(parts[lotConfig.includeShift ? 3 : 2], 10),
    suffix: parts.length > (lotConfig.includeShift ? 4 : 3) ? parts[lotConfig.includeShift ? 4 : 3] : undefined
  };
  
  return result;
}

/**
 * Get next lot number for a specific part, with optional order-based grouping
 * Enhanced for aerospace manufacturing where multiple lots can exist within same order
 */
export async function getNextLotNumber(partNumber: string, orderId?: string): Promise<number> {
  try {
    const counterKey = orderId ? `${partNumber}-${orderId}` : partNumber;
    
    const counterDocRef = doc(db, LOT_COUNTERS_COLLECTION, counterKey);
    const counterDoc = await getDoc(counterDocRef);
    
    let currentLot = 1;
    
    if (counterDoc.exists()) {
      currentLot = (counterDoc.data().currentLot || 0) + 1;
    }
    
    // Update the counter
    await setDoc(counterDocRef, {
      partNumber,
      orderId: orderId || null,
      currentLot,
      lastUpdated: serverTimestamp(),
      updatedAt: new Date().toISOString()
    });
    
    console.log(`📊 Generated lot number ${currentLot} for part ${partNumber}${orderId ? ` in order ${orderId}` : ''}`);
    return currentLot;
    
  } catch (error) {
    console.error('Error getting next lot number:', error);
    // Fallback to timestamp-based lot number
    const fallbackLot = Math.floor(Date.now() / 1000) % 999 + 1;
    console.warn(`Using fallback lot number: ${fallbackLot}`);
    return fallbackLot;
  }
}

/**
 * Generate job ID with lot number, supporting order-based lot tracking
 * Enhanced for aerospace: multiple lots per order are properly differentiated
 */
export async function generateJobIdWithLot(
  orderId: string,
  itemId: string,
  partNumber: string,
  useOrderBasedLots: boolean = true
): Promise<string> {
  try {
    // For aerospace manufacturing, use order-based lot tracking
    const lotNumber = useOrderBasedLots 
      ? await getNextLotNumber(partNumber, orderId)
      : await getNextLotNumber(partNumber);
    
    const jobId = `${orderId}-item-${itemId}-lot-${lotNumber}`;
    console.log(`🆔 Generated job ID: ${jobId} (lot ${lotNumber} for ${partNumber})`);
    return jobId;
  } catch (error) {
    console.error('Error generating job ID with lot:', error);
    // Fallback to simple ID
    return `${orderId}-item-${itemId}`;
  }
}

/**
 * Extract lot number from job ID
 */
export function getLotNumberFromJobId(jobId: string): number | null {
  const match = jobId.match(/-lot-(\d+)$/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Get part name with lot number for display
 */
export function getPartNameWithLot(partName: string, lotNumber: number): string {
  return `${partName} (Lot ${lotNumber})`;
}

/**
 * Get all jobs for a part (all lots)
 */
export async function getJobsForPart(partNumber: string): Promise<Job[]> {
  try {
    // This would require querying jobs collection - for now return empty
    // In a real implementation, you'd query the jobs collection
    return [];
  } catch (error) {
    console.error('Error getting jobs for part:', error);
    return [];
  }
}

/**
 * Get all lots for a specific part within an order
 * Useful for aerospace manufacturing to see all lots in an order
 */
export async function getLotsForPartInOrder(partNumber: string, orderId: string): Promise<Job[]> {
  try {
    const q = query(
      collection(db, 'jobs'),
      where('item.partName', '==', partNumber),
      where('orderId', '==', orderId)
    );
    
    const querySnapshot = await getDocs(q);
    const jobs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Job[];
    
    // Sort by lot number if available
    return jobs.sort((a, b) => {
      const lotA = a.lotInfo?.lotNumber || 0;
      const lotB = b.lotInfo?.lotNumber || 0;
      return lotA - lotB;
    });
  } catch (error) {
    console.error('Error getting lots for part in order:', error);
    return [];
  }
}

/**
 * Get lot statistics for a part across all orders
 * Provides insights for aerospace manufacturing planning
 */
export async function getLotStatisticsForPart(partNumber: string): Promise<{
  totalLots: number;
  lotsPerOrder: Record<string, number>;
  averageLotsPerOrder: number;
  maxLotsInSingleOrder: number;
}> {
  try {
    const jobs = await getJobsForPart(partNumber);
    
    const lotsPerOrder: Record<string, number> = {};
    
    jobs.forEach(job => {
      const orderId = job.orderId || 'unknown';
      lotsPerOrder[orderId] = (lotsPerOrder[orderId] || 0) + 1;
    });
    
    const orderCounts = Object.values(lotsPerOrder);
    const averageLotsPerOrder = orderCounts.length > 0 
      ? orderCounts.reduce((sum, count) => sum + count, 0) / orderCounts.length 
      : 0;
    
    const maxLotsInSingleOrder = orderCounts.length > 0 ? Math.max(...orderCounts) : 0;
    
    return {
      totalLots: jobs.length,
      lotsPerOrder,
      averageLotsPerOrder,
      maxLotsInSingleOrder
    };
  } catch (error) {
    console.error('Error getting lot statistics:', error);
    return {
      totalLots: 0,
      lotsPerOrder: {},
      averageLotsPerOrder: 0,
      maxLotsInSingleOrder: 0
    };
  }
} 