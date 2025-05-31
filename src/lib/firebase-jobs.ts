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
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import type { Job } from '@/types';

const JOBS_COLLECTION = 'jobs';

// === Type Conversion Helpers ===

interface JobFirestore {
  id: string;
  orderId: string;
  orderNumber: string;
  clientName: string;
  item: any; // OfferItem
  status: string;
  dueDate?: Timestamp | null;
  priority?: string;
  specialInstructions?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function jobToFirestore(job: Job): JobFirestore {
  const firestoreJob: any = {
    id: job.id,
    orderId: job.orderId,
    orderNumber: job.orderNumber,
    clientName: job.clientName,
    item: job.item,
    status: job.status,
    createdAt: job.createdAt ? Timestamp.fromDate(new Date(job.createdAt)) : Timestamp.now(),
    updatedAt: job.updatedAt ? Timestamp.fromDate(new Date(job.updatedAt)) : Timestamp.now()
  };

  // Add optional fields if they exist
  if (job.dueDate) {
    firestoreJob.dueDate = Timestamp.fromDate(new Date(job.dueDate));
  }
  if (job.priority) {
    firestoreJob.priority = job.priority;
  }
  if (job.specialInstructions) {
    firestoreJob.specialInstructions = job.specialInstructions;
  }

  return firestoreJob as JobFirestore;
}

function jobFromFirestore(data: JobFirestore): Job {
  const job: Job = {
    id: data.id,
    orderId: data.orderId,
    orderNumber: data.orderNumber,
    clientName: data.clientName,
    item: data.item,
    status: data.status as any,
    createdAt: data.createdAt?.toDate().toISOString(),
    updatedAt: data.updatedAt?.toDate().toISOString()
  };

  // Add optional fields if they exist
  if (data.dueDate) {
    job.dueDate = data.dueDate.toDate().toISOString().split('T')[0];
  }
  if (data.priority) {
    job.priority = data.priority as any;
  }
  if (data.specialInstructions) {
    job.specialInstructions = data.specialInstructions;
  }

  return job;
}

// === CRUD Operations ===

export async function saveJob(job: Job): Promise<void> {
  try {
    const jobData = jobToFirestore(job);
    const jobDocRef = doc(db, JOBS_COLLECTION, job.id);
    
    await setDoc(jobDocRef, jobData);
    console.log('Successfully saved job:', job.id);
  } catch (error) {
    console.error('Failed to save job:', error);
    throw new Error('Failed to save job to database');
  }
}

export async function createJob(job: Job): Promise<string> {
  try {
    const jobData = jobToFirestore(job);
    const jobDocRef = doc(db, JOBS_COLLECTION, job.id);
    
    await setDoc(jobDocRef, jobData);
    console.log('Successfully created job:', job.id);
    return job.id;
  } catch (error) {
    console.error('Failed to create job:', error);
    throw new Error('Failed to create job in database');
  }
}

export async function loadJob(jobId: string): Promise<Job | null> {
  try {
    const jobDocRef = doc(db, JOBS_COLLECTION, jobId);
    const docSnap = await getDoc(jobDocRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as JobFirestore;
      return jobFromFirestore(data);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to load job:', error);
    throw new Error('Failed to load job from database');
  }
}

export async function loadAllJobs(): Promise<Job[]> {
  try {
    const jobsSnapshot = await getDocs(collection(db, JOBS_COLLECTION));
    
    const jobs: Job[] = [];
    jobsSnapshot.docs.forEach(doc => {
      try {
        const data = doc.data() as JobFirestore;
        const job = jobFromFirestore(data);
        jobs.push(job);
      } catch (error) {
        console.error('Failed to process job:', doc.id, error);
        // Continue processing other jobs
      }
    });
    
    return jobs.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  } catch (error) {
    console.error('Failed to load jobs:', error);
    throw new Error('Failed to load jobs from database');
  }
}

export async function updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
  try {
    const jobDocRef = doc(db, JOBS_COLLECTION, jobId);
    
    // Convert updates to Firestore format
    const firestoreUpdates: any = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    // Handle date fields
    if (updates.dueDate) {
      firestoreUpdates.dueDate = Timestamp.fromDate(new Date(updates.dueDate));
    }
    
    await updateDoc(jobDocRef, firestoreUpdates);
    console.log('Successfully updated job:', jobId);
  } catch (error) {
    console.error('Failed to update job:', error);
    throw new Error('Failed to update job in database');
  }
}

export async function deleteJob(jobId: string): Promise<void> {
  try {
    const jobDocRef = doc(db, JOBS_COLLECTION, jobId);
    await deleteDoc(jobDocRef);
    console.log('Successfully deleted job:', jobId);
  } catch (error) {
    console.error('Failed to delete job:', error);
    throw new Error('Failed to delete job from database');
  }
}

export async function getJobsByOrder(orderId: string): Promise<Job[]> {
  try {
    const q = query(
      collection(db, JOBS_COLLECTION),
      where('orderId', '==', orderId)
    );
    
    const querySnapshot = await getDocs(q);
    const jobs: Job[] = [];
    
    querySnapshot.docs.forEach(doc => {
      try {
        const data = doc.data() as JobFirestore;
        const job = jobFromFirestore(data);
        jobs.push(job);
      } catch (error) {
        console.error('Failed to process job:', doc.id, error);
      }
    });
    
    return jobs;
  } catch (error) {
    console.error('Failed to load jobs by order:', error);
    throw new Error('Failed to load jobs by order from database');
  }
}

export async function jobExists(jobId: string): Promise<boolean> {
  try {
    const jobDocRef = doc(db, JOBS_COLLECTION, jobId);
    const docSnap = await getDoc(jobDocRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Failed to check if job exists:', error);
    return false;
  }
} 