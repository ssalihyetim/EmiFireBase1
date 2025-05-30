import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import type { JobTask, JobSubtask, JobTaskFirestore, JobSubtaskFirestore } from '@/types';

const TASKS_COLLECTION = 'jobTasks';
const SUBTASKS_COLLECTION = 'jobSubtasks';

// === Utility Functions ===

/**
 * Remove undefined values from an object recursively
 * Firestore doesn't support undefined values, so we need to clean the data
 */
function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item)).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
        cleaned[key] = removeUndefinedValues(obj[key]);
      }
    }
    return cleaned;
  }
  
  return obj;
}

// === Type Conversion Helpers ===

export function taskToFirestore(task: JobTask): JobTaskFirestore {
  const firestoreTask: any = {
    id: task.id,
    jobId: task.jobId,
    templateId: task.templateId,
    name: task.name,
    description: task.description,
    type: task.type,
    status: task.status,
    priority: task.priority,
    category: task.category,
    createdAt: Timestamp.fromDate(new Date(task.createdAt)),
    updatedAt: Timestamp.fromDate(new Date(task.updatedAt))
  };

  // Only add optional fields if they have values
  if (task.assignedTo !== undefined) firestoreTask.assignedTo = task.assignedTo;
  if (task.assignedBy !== undefined) firestoreTask.assignedBy = task.assignedBy;
  if (task.estimatedStart !== undefined) firestoreTask.estimatedStart = Timestamp.fromDate(new Date(task.estimatedStart));
  if (task.estimatedEnd !== undefined) firestoreTask.estimatedEnd = Timestamp.fromDate(new Date(task.estimatedEnd));
  if (task.actualStart !== undefined) firestoreTask.actualStart = Timestamp.fromDate(new Date(task.actualStart));
  if (task.actualEnd !== undefined) firestoreTask.actualEnd = Timestamp.fromDate(new Date(task.actualEnd));
  if (task.estimatedDurationHours !== undefined) firestoreTask.estimatedDurationHours = task.estimatedDurationHours;
  if (task.actualDurationHours !== undefined) firestoreTask.actualDurationHours = task.actualDurationHours;
  if (task.dependencies !== undefined) firestoreTask.dependencies = task.dependencies;
  if (task.as9100dClause !== undefined) firestoreTask.as9100dClause = task.as9100dClause;
  if (task.notes !== undefined) firestoreTask.notes = task.notes;
  if (task.attachments !== undefined) firestoreTask.attachments = task.attachments;

  // Clean any remaining undefined values as a safety measure
  return removeUndefinedValues(firestoreTask) as JobTaskFirestore;
}

export function taskFromFirestore(firestoreTask: JobTaskFirestore): JobTask {
  // Helper function to safely convert timestamps
  const safeToDateString = (timestamp: any): string => {
    if (!timestamp) {
      return new Date().toISOString(); // Fallback to current time
    }
    
    // If it's already a string, return it
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    
    // If it's a Firestore Timestamp
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    
    // If it's a Date object
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    
    // If it has seconds and nanoseconds (Firestore Timestamp-like)
    if (timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000).toISOString();
    }
    
    // Fallback - try to parse as date
    try {
      return new Date(timestamp).toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  return {
    id: firestoreTask.id,
    jobId: firestoreTask.jobId,
    templateId: firestoreTask.templateId,
    name: firestoreTask.name,
    description: firestoreTask.description,
    type: firestoreTask.type,
    status: firestoreTask.status,
    priority: firestoreTask.priority,
    category: firestoreTask.category,
    assignedTo: firestoreTask.assignedTo,
    assignedBy: firestoreTask.assignedBy,
    estimatedStart: firestoreTask.estimatedStart ? safeToDateString(firestoreTask.estimatedStart) : undefined,
    estimatedEnd: firestoreTask.estimatedEnd ? safeToDateString(firestoreTask.estimatedEnd) : undefined,
    actualStart: firestoreTask.actualStart ? safeToDateString(firestoreTask.actualStart) : undefined,
    actualEnd: firestoreTask.actualEnd ? safeToDateString(firestoreTask.actualEnd) : undefined,
    estimatedDurationHours: firestoreTask.estimatedDurationHours,
    actualDurationHours: firestoreTask.actualDurationHours,
    subtasks: [], // Subtasks are loaded separately and populated by the calling function
    dependencies: firestoreTask.dependencies,
    as9100dClause: firestoreTask.as9100dClause,
    notes: firestoreTask.notes,
    attachments: firestoreTask.attachments,
    createdAt: safeToDateString(firestoreTask.createdAt),
    updatedAt: safeToDateString(firestoreTask.updatedAt)
  };
}

export function subtaskToFirestore(subtask: JobSubtask): JobSubtaskFirestore {
  const firestoreSubtask: any = {
    id: subtask.id,
    taskId: subtask.taskId,
    jobId: subtask.jobId,
    templateId: subtask.templateId,
    name: subtask.name,
    description: subtask.description,
    status: subtask.status,
    category: subtask.category,
    isPrintable: subtask.isPrintable,
    hasCheckbox: subtask.hasCheckbox,
    isChecked: subtask.isChecked,
    createdAt: Timestamp.fromDate(new Date(subtask.createdAt)),
    updatedAt: Timestamp.fromDate(new Date(subtask.updatedAt))
  };

  // Only add optional fields if they have values
  if (subtask.qualityTemplateId !== undefined) firestoreSubtask.qualityTemplateId = subtask.qualityTemplateId;
  if (subtask.instructions !== undefined) firestoreSubtask.instructions = subtask.instructions;
  if (subtask.estimatedDurationMinutes !== undefined) firestoreSubtask.estimatedDurationMinutes = subtask.estimatedDurationMinutes;
  if (subtask.actualDurationMinutes !== undefined) firestoreSubtask.actualDurationMinutes = subtask.actualDurationMinutes;
  if (subtask.completedBy !== undefined) firestoreSubtask.completedBy = subtask.completedBy;
  if (subtask.completedAt !== undefined) firestoreSubtask.completedAt = Timestamp.fromDate(new Date(subtask.completedAt));
  if (subtask.verifiedBy !== undefined) firestoreSubtask.verifiedBy = subtask.verifiedBy;
  if (subtask.verifiedAt !== undefined) firestoreSubtask.verifiedAt = Timestamp.fromDate(new Date(subtask.verifiedAt));
  if (subtask.notes !== undefined) firestoreSubtask.notes = subtask.notes;
  if (subtask.attachments !== undefined) firestoreSubtask.attachments = subtask.attachments;
  if (subtask.requiredDocuments !== undefined) firestoreSubtask.requiredDocuments = subtask.requiredDocuments;
  if (subtask.as9100dClause !== undefined) firestoreSubtask.as9100dClause = subtask.as9100dClause;

  // Clean any remaining undefined values as a safety measure
  return removeUndefinedValues(firestoreSubtask) as JobSubtaskFirestore;
}

export function subtaskFromFirestore(firestoreSubtask: JobSubtaskFirestore): JobSubtask {
  // Helper function to safely convert timestamps
  const safeToDateString = (timestamp: any): string => {
    if (!timestamp) {
      return new Date().toISOString(); // Fallback to current time
    }
    
    // If it's already a string, return it
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    
    // If it's a Firestore Timestamp
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    
    // If it's a Date object
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    
    // If it has seconds and nanoseconds (Firestore Timestamp-like)
    if (timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000).toISOString();
    }
    
    // Fallback - try to parse as date
    try {
      return new Date(timestamp).toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  return {
    id: firestoreSubtask.id,
    taskId: firestoreSubtask.taskId,
    jobId: firestoreSubtask.jobId,
    templateId: firestoreSubtask.templateId,
    name: firestoreSubtask.name,
    description: firestoreSubtask.description,
    status: firestoreSubtask.status,
    category: firestoreSubtask.category,
    qualityTemplateId: firestoreSubtask.qualityTemplateId,
    isPrintable: firestoreSubtask.isPrintable,
    hasCheckbox: firestoreSubtask.hasCheckbox,
    isChecked: firestoreSubtask.isChecked,
    instructions: firestoreSubtask.instructions,
    estimatedDurationMinutes: firestoreSubtask.estimatedDurationMinutes,
    actualDurationMinutes: firestoreSubtask.actualDurationMinutes,
    completedBy: firestoreSubtask.completedBy,
    completedAt: firestoreSubtask.completedAt ? safeToDateString(firestoreSubtask.completedAt) : undefined,
    verifiedBy: firestoreSubtask.verifiedBy,
    verifiedAt: firestoreSubtask.verifiedAt ? safeToDateString(firestoreSubtask.verifiedAt) : undefined,
    notes: firestoreSubtask.notes,
    attachments: firestoreSubtask.attachments,
    requiredDocuments: firestoreSubtask.requiredDocuments,
    as9100dClause: firestoreSubtask.as9100dClause,
    createdAt: safeToDateString(firestoreSubtask.createdAt),
    updatedAt: safeToDateString(firestoreSubtask.updatedAt)
  };
}

// === Firebase CRUD Operations ===

export async function saveJobTasks(jobId: string, tasks: JobTask[]): Promise<void> {
  try {
    console.log('Starting to save tasks for job:', jobId, 'Number of tasks:', tasks.length);
    
    // Validate inputs
    if (!jobId) {
      throw new Error('Job ID is required');
    }
    if (!tasks || tasks.length === 0) {
      throw new Error('No tasks provided to save');
    }
    
    // Validate Firebase connection
    if (!db) {
      throw new Error('Firebase database not initialized');
    }
    
    const savePromises: Promise<void>[] = [];

    for (const task of tasks) {
      console.log('Processing task:', task.id, 'with', task.subtasks.length, 'subtasks');
      
      try {
        const taskData = taskToFirestore(task);
        console.log('Converted task data for:', task.id);
        console.log('Task data sample:', {
          id: taskData.id,
          name: taskData.name,
          hasUndefinedValues: JSON.stringify(taskData).includes('undefined')
        });
        
        // Validate no undefined values in task data
        const taskDataString = JSON.stringify(taskData);
        if (taskDataString.includes('undefined')) {
          console.error('WARNING: Task data contains undefined values:', taskData);
          throw new Error(`Task ${task.id} contains undefined values`);
        }
        
        const taskDocRef = doc(db, TASKS_COLLECTION, task.id);
        savePromises.push(setDoc(taskDocRef, taskData));

        for (const subtask of task.subtasks) {
          try {
            const subtaskData = subtaskToFirestore(subtask);
            console.log('Converted subtask data for:', subtask.id);
            
            // Validate no undefined values in subtask data
            const subtaskDataString = JSON.stringify(subtaskData);
            if (subtaskDataString.includes('undefined')) {
              console.error('WARNING: Subtask data contains undefined values:', subtaskData);
              throw new Error(`Subtask ${subtask.id} contains undefined values`);
            }
            
            const subtaskDocRef = doc(db, SUBTASKS_COLLECTION, subtask.id);
            savePromises.push(setDoc(subtaskDocRef, subtaskData));
          } catch (subtaskError) {
            console.error('Error converting subtask:', subtask.id, subtaskError);
            console.error('Original subtask data:', subtask);
            throw subtaskError;
          }
        }
      } catch (taskError) {
        console.error('Error processing task:', task.id, taskError);
        console.error('Original task data:', task);
        throw taskError;
      }
    }

    console.log('All data converted and validated, saving', savePromises.length, 'documents to Firestore');
    await Promise.all(savePromises);
    console.log('Successfully saved all tasks and subtasks to Firebase');
  } catch (error) {
    console.error('Failed to save job tasks:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Failed to save tasks to database: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function loadJobTasks(jobId: string): Promise<JobTask[]> {
  try {
    const tasksQuery = query(
      collection(db, TASKS_COLLECTION),
      where('jobId', '==', jobId)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    
    if (tasksSnapshot.empty) {
      return [];
    }

    const subtasksQuery = query(
      collection(db, SUBTASKS_COLLECTION),
      where('jobId', '==', jobId)
    );
    const subtasksSnapshot = await getDocs(subtasksQuery);

    const subtasksByTaskId: Record<string, JobSubtask[]> = {};
    
    // Process subtasks with individual error handling
    subtasksSnapshot.docs.forEach(doc => {
      try {
        const subtaskData = doc.data() as JobSubtaskFirestore;
        console.log('Processing subtask:', doc.id, 'with createdAt type:', typeof subtaskData.createdAt);
        
        const subtask = subtaskFromFirestore(subtaskData);
        if (!subtasksByTaskId[subtask.taskId]) {
          subtasksByTaskId[subtask.taskId] = [];
        }
        subtasksByTaskId[subtask.taskId].push(subtask);
      } catch (subtaskError) {
        console.error('Failed to process subtask:', doc.id, subtaskError);
        console.error('Subtask data:', doc.data());
        // Continue processing other subtasks instead of failing completely
      }
    });

    const tasks: JobTask[] = [];
    
    // Process tasks with individual error handling
    tasksSnapshot.docs.forEach(doc => {
      try {
        const taskData = doc.data() as JobTaskFirestore;
        console.log('Processing task:', doc.id, 'with createdAt type:', typeof taskData.createdAt);
        
        const task = taskFromFirestore(taskData);
        const processedTask = {
          ...task,
          subtasks: subtasksByTaskId[task.id] || []
        };
        tasks.push(processedTask);
      } catch (taskError) {
        console.error('Failed to process task:', doc.id, taskError);
        console.error('Task data:', doc.data());
        // Continue processing other tasks instead of failing completely
      }
    });

    tasks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return tasks;
  } catch (error) {
    console.error('Failed to load job tasks:', error);
    throw new Error('Failed to load tasks from database');
  }
}

export async function updateTaskInFirestore(task: JobTask): Promise<void> {
  try {
    const taskData = taskToFirestore(task);
    const taskDocRef = doc(db, TASKS_COLLECTION, task.id);
    
    // First check if document exists
    const docSnap = await getDoc(taskDocRef);
    
    if (docSnap.exists()) {
      // Document exists, use updateDoc
      await updateDoc(taskDocRef, { 
        ...taskData,
        updatedAt: serverTimestamp()
      });
    } else {
      // Document doesn't exist, create it with setDoc
      console.log('Task document does not exist, creating new document:', task.id);
      await setDoc(taskDocRef, {
        ...taskData,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Failed to update/create task:', error);
    throw new Error('Failed to update task in database');
  }
}

export async function updateSubtaskInFirestore(subtask: JobSubtask): Promise<void> {
  try {
    const subtaskData = subtaskToFirestore(subtask);
    const subtaskDocRef = doc(db, SUBTASKS_COLLECTION, subtask.id);
    
    // First check if document exists
    const docSnap = await getDoc(subtaskDocRef);
    
    if (docSnap.exists()) {
      // Document exists, use updateDoc
      await updateDoc(subtaskDocRef, {
        ...subtaskData,
        updatedAt: serverTimestamp()
      });
    } else {
      // Document doesn't exist, create it with setDoc
      console.log('Subtask document does not exist, creating new document:', subtask.id);
      await setDoc(subtaskDocRef, {
        ...subtaskData,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Failed to update/create subtask:', error);
    throw new Error('Failed to update subtask in database');
  }
}

export async function jobHasTasks(jobId: string): Promise<boolean> {
  try {
    const tasksQuery = query(
      collection(db, TASKS_COLLECTION),
      where('jobId', '==', jobId)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    return !tasksSnapshot.empty;
  } catch (error) {
    console.error('Failed to check if job has tasks:', error);
    return false;
  }
}

// === Data Validation and Cleanup Utilities ===

/**
 * Check if a Firestore document has valid timestamps
 */
function hasValidTimestamps(data: any): boolean {
  const timestampFields = ['createdAt', 'updatedAt', 'completedAt', 'verifiedAt', 'estimatedStart', 'estimatedEnd', 'actualStart', 'actualEnd'];
  
  return timestampFields.every(field => {
    const value = data[field];
    if (!value) return true; // Optional fields are okay to be missing
    
    // Check if it's a proper Firestore Timestamp
    return value && typeof value.toDate === 'function';
  });
}

/**
 * Check if a job has corrupted timestamp data that needs cleanup
 */
export async function hasCorruptedTimestamps(jobId: string): Promise<boolean> {
  try {
    const tasksQuery = query(
      collection(db, TASKS_COLLECTION),
      where('jobId', '==', jobId)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    
    // Check tasks for corrupted timestamps
    for (const doc of tasksSnapshot.docs) {
      if (!hasValidTimestamps(doc.data())) {
        return true;
      }
    }
    
    const subtasksQuery = query(
      collection(db, SUBTASKS_COLLECTION),
      where('jobId', '==', jobId)
    );
    const subtasksSnapshot = await getDocs(subtasksQuery);
    
    // Check subtasks for corrupted timestamps
    for (const doc of subtasksSnapshot.docs) {
      if (!hasValidTimestamps(doc.data())) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for corrupted timestamps:', error);
    return false;
  }
}

/**
 * Clean up corrupted timestamp data in Firestore
 * This function should be called manually when data corruption is detected
 */
export async function cleanupCorruptedTimestamps(jobId?: string): Promise<void> {
  try {
    console.log('Starting timestamp cleanup process...');
    
    // Query tasks (optionally filtered by jobId)
    const tasksQuery = jobId 
      ? query(collection(db, TASKS_COLLECTION), where('jobId', '==', jobId))
      : collection(db, TASKS_COLLECTION);
    
    const tasksSnapshot = await getDocs(tasksQuery);
    
    const fixPromises: Promise<void>[] = [];
    
    // Check and fix tasks
    tasksSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      if (!hasValidTimestamps(data)) {
        console.log('Found corrupted task:', doc.id);
        
        // Fix the corrupted timestamps
        const fixedData: any = { ...data };
        
        // Fix timestamp fields
        ['createdAt', 'updatedAt', 'estimatedStart', 'estimatedEnd', 'actualStart', 'actualEnd'].forEach(field => {
          if (fixedData[field] && typeof fixedData[field] !== 'object') {
            // Convert string/invalid timestamps to proper Firestore Timestamps
            try {
              const dateValue = new Date(fixedData[field]);
              if (!isNaN(dateValue.getTime())) {
                fixedData[field] = Timestamp.fromDate(dateValue);
              } else {
                // Use current time as fallback
                fixedData[field] = field.includes('created') ? Timestamp.now() : null;
              }
            } catch {
              fixedData[field] = field.includes('created') ? Timestamp.now() : null;
            }
          }
        });
        
        // Update the document
        fixPromises.push(setDoc(doc.ref, fixedData));
      }
    });
    
    // Query and fix subtasks (optionally filtered by jobId)
    const subtasksQuery = jobId 
      ? query(collection(db, SUBTASKS_COLLECTION), where('jobId', '==', jobId))
      : collection(db, SUBTASKS_COLLECTION);
    
    const subtasksSnapshot = await getDocs(subtasksQuery);
    
    subtasksSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      if (!hasValidTimestamps(data)) {
        console.log('Found corrupted subtask:', doc.id);
        
        // Fix the corrupted timestamps
        const fixedData: any = { ...data };
        
        // Fix timestamp fields
        ['createdAt', 'updatedAt', 'completedAt', 'verifiedAt'].forEach(field => {
          if (fixedData[field] && typeof fixedData[field] !== 'object') {
            // Convert string/invalid timestamps to proper Firestore Timestamps
            try {
              const dateValue = new Date(fixedData[field]);
              if (!isNaN(dateValue.getTime())) {
                fixedData[field] = Timestamp.fromDate(dateValue);
              } else {
                // Use current time as fallback for required fields
                fixedData[field] = field.includes('created') ? Timestamp.now() : null;
              }
            } catch {
              fixedData[field] = field.includes('created') ? Timestamp.now() : null;
            }
          }
        });
        
        // Update the document
        fixPromises.push(setDoc(doc.ref, fixedData));
      }
    });
    
    // Execute all fixes
    await Promise.all(fixPromises);
    
    console.log(`Successfully cleaned up ${fixPromises.length} corrupted documents`);
  } catch (error) {
    console.error('Failed to cleanup corrupted timestamps:', error);
    throw new Error('Failed to cleanup corrupted data');
  }
} 