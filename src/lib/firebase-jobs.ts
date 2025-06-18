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
  deleteDoc,
  writeBatch
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
    console.log(`🗑️ Starting cascade deletion for job: ${jobId}`);
    
    // All collections that might contain job-related data
    const relatedCollections = [
      'jobTasks',
      'jobSubtasks', 
      'processInstances',
      'schedules',
      'calendarEvents',
      'routingSheets',
      'setupSheets',
      'toolLists'
    ];
    
    let totalDeleted = 0;
    
    // Delete from each related collection
    for (const collectionName of relatedCollections) {
      try {
        console.log(`  🔍 Checking ${collectionName} for job ${jobId}...`);
        
        let querySnapshot;
        
        // Different collections use different field names to reference jobs
        if (collectionName === 'calendarEvents') {
          // Calendar events might use jobId field that contains the job ID
          // Since Firestore doesn't support "contains" queries, we need to get all and filter
          const allEventsSnapshot = await getDocs(collection(db, collectionName));
          const matchingDocs = allEventsSnapshot.docs.filter(doc => {
            const data = doc.data();
            const eventJobId = data.jobId || '';
            // Check if the calendar event's jobId contains our jobId as a prefix
            return eventJobId.includes(jobId);
          });
          querySnapshot = { docs: matchingDocs, empty: matchingDocs.length === 0 };
        } else if (collectionName === 'schedules') {
          // Schedules might use jobId or processInstanceId that contains the jobId
          const q1 = query(collection(db, collectionName), where('jobId', '==', jobId));
          const q2 = query(collection(db, collectionName), where('processInstanceId', '>=', jobId), where('processInstanceId', '<=', jobId + '\uf8ff'));
          
          const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
          
          // Combine results and remove duplicates
          const allDocs = [...snapshot1.docs, ...snapshot2.docs];
          const uniqueDocs = allDocs.filter((doc, index, self) => 
            index === self.findIndex(d => d.id === doc.id)
          );
          
          querySnapshot = { docs: uniqueDocs };
        } else if (collectionName === 'processInstances') {
          // ProcessInstances might have IDs that start with jobId
          const q = query(collection(db, collectionName), where('__name__', '>=', jobId), where('__name__', '<=', jobId + '\uf8ff'));
          querySnapshot = await getDocs(q);
          
          // Also check by offerId field if it exists
          try {
            const q2 = query(collection(db, collectionName), where('offerId', '==', jobId));
            const snapshot2 = await getDocs(q2);
            querySnapshot.docs.push(...snapshot2.docs);
          } catch (e) {
            // Field might not exist, ignore
          }
        } else {
          // For other collections, try common field names
          const possibleFields = ['jobId', 'job_id', 'parentJobId'];
          let found = false;
          
          for (const fieldName of possibleFields) {
            try {
              const q = query(collection(db, collectionName), where(fieldName, '==', jobId));
              querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                found = true;
                break;
              }
            } catch (e) {
              // Field doesn't exist, try next one
              continue;
            }
          }
          
          if (!found) {
            console.log(`    ⚠️ No field found for ${collectionName}, skipping`);
            continue;
          }
        }
        
        if (querySnapshot && !querySnapshot.empty) {
          console.log(`    🗑️ Found ${querySnapshot.docs.length} documents in ${collectionName}`);
          
          // Use batch delete for efficiency
          const batch = writeBatch(db);
          let batchCount = 0;
          
          for (const docSnapshot of querySnapshot.docs) {
            batch.delete(docSnapshot.ref);
            batchCount++;
            totalDeleted++;
            
            // Firestore batch limit is 500 operations
            if (batchCount >= 500) {
              await batch.commit();
              console.log(`    ✅ Deleted batch of ${batchCount} documents from ${collectionName}`);
              batchCount = 0;
            }
          }
          
          // Commit remaining documents
          if (batchCount > 0) {
            await batch.commit();
            console.log(`    ✅ Deleted final batch of ${batchCount} documents from ${collectionName}`);
          }
        } else {
          console.log(`    ✅ No documents found in ${collectionName}`);
        }
        
      } catch (error) {
        console.error(`    ❌ Error cleaning ${collectionName}:`, error);
        // Continue with other collections even if one fails
      }
    }
    
    // Finally, delete the job document itself
    console.log(`  🗑️ Deleting main job document...`);
    const jobDocRef = doc(db, JOBS_COLLECTION, jobId);
    await deleteDoc(jobDocRef);
    totalDeleted++;
    
    console.log(`✅ Cascade deletion completed for job ${jobId}`);
    console.log(`📊 Total documents deleted: ${totalDeleted}`);
    
  } catch (error) {
    console.error('❌ Failed to delete job:', error);
    throw new Error('Failed to delete job and related data from database');
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