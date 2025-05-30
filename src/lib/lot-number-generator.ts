import { format } from 'date-fns';
import { collection, addDoc, query, where, orderBy, limit, getDocs, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { GeneratedLotNumber, LotNumberConfig } from '@/types/manufacturing-templates';

// Default lot number configuration
const DEFAULT_LOT_CONFIG: LotNumberConfig = {
  prefix: 'RM',
  dateFormat: 'YYYYMMDD',
  sequenceLength: 3,
  separator: '-',
  includeShift: true,
  customSuffix: ''
};

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
      materialType,
      sequence,
      isUsed: false
    };

    await addDoc(collection(db, 'generated_lot_numbers'), generatedLot);

    return lotNumber;
  } catch (error) {
    console.error('Error generating lot number:', error);
    throw new Error('Failed to generate lot number');
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
    // Fallback to timestamp-based sequence
    return Math.floor(Date.now() / 1000) % 1000;
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