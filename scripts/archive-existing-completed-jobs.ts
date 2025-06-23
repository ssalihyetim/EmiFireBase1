import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { archiveCompletedJob, batchArchiveJobs } from '../src/lib/job-archival';
import { loadJobTasks } from '../src/lib/firebase-tasks';
import type { Job, JobTask } from '../src/types';

// Initialize Firebase app only if it doesn't exist
function getFirebaseApp() {
  if (getApps().length === 0) {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    if (!firebaseConfig.projectId) {
      throw new Error('Firebase Project ID is not set. Please check your environment variables.');
    }
    
    return initializeApp(firebaseConfig);
  } else {
    return getApp();
  }
}

const app = getFirebaseApp();
const db = getFirestore(app);

interface JobWithTasks {
  job: Job;
  tasks: JobTask[];
  subtasks: any[];
}

async function findCompletedJobs(): Promise<Job[]> {
  console.log('🔍 Searching for completed jobs...');
  
  try {
    // Query for completed jobs
    const jobsRef = collection(db, 'jobs');
    const q = query(jobsRef, where('status', '==', 'Completed'));
    const snapshot = await getDocs(q);
    
    const completedJobs: Job[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      completedJobs.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        dueDate: data.dueDate?.toDate?.()?.toISOString()?.split('T')[0] || data.dueDate,
      } as Job);
    });
    
    console.log(`📊 Found ${completedJobs.length} completed jobs`);
    
    // If no completed jobs in 'jobs' collection, try to find completed orders
    if (completedJobs.length === 0) {
      console.log('🔍 No completed jobs found, checking orders collection...');
      
      // Check orders collection for completed orders
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(ordersRef, where('status', '==', 'Completed'));
      const ordersSnapshot = await getDocs(ordersQuery);
      
      console.log(`📊 Found ${ordersSnapshot.docs.length} completed orders`);
      
      // Convert completed orders to jobs for archiving
      ordersSnapshot.docs.forEach(orderDoc => {
        const orderData = orderDoc.data();
        if (orderData.items && orderData.items.length > 0) {
          orderData.items.forEach((item: any, index: number) => {
            const jobId = `${orderDoc.id}-item-${index}`;
            completedJobs.push({
              id: jobId,
              orderId: orderDoc.id,
              orderNumber: orderData.orderNumber,
              clientName: orderData.clientName,
              item: item,
              status: 'Completed',
              createdAt: orderData.createdAt?.toDate?.()?.toISOString() || orderData.createdAt,
              updatedAt: orderData.updatedAt?.toDate?.()?.toISOString() || orderData.updatedAt,
              dueDate: orderData.dueDate?.toDate?.()?.toISOString()?.split('T')[0] || orderData.dueDate,
            } as Job);
          });
        }
      });
      
      console.log(`📊 Converted ${completedJobs.length} order items to jobs for archiving`);
    }
    
    return completedJobs;
    
  } catch (error) {
    console.error('❌ Error finding completed jobs:', error);
    return [];
  }
}

async function loadJobTasksAndSubtasks(jobId: string): Promise<{ tasks: JobTask[]; subtasks: any[] }> {
  try {
    const tasks = await loadJobTasks(jobId);
    // For now, subtasks are empty - could be loaded from tasks if needed
    const subtasks: any[] = [];
    
    return { tasks, subtasks };
  } catch (error) {
    console.warn(`⚠️ Could not load tasks for job ${jobId}:`, error);
    return { tasks: [], subtasks: [] };
  }
}

async function archiveExistingCompletedJobs() {
  console.log('🗄️ Starting Archive Process for Existing Completed Jobs');
  console.log('=====================================================');
  
  try {
    // Step 1: Find all completed jobs
    const completedJobs = await findCompletedJobs();
    
    if (completedJobs.length === 0) {
      console.log('✅ No completed jobs found to archive');
      return;
    }
    
    // Step 2: Process jobs with their tasks
    console.log('📋 Loading tasks for each completed job...');
    const jobsWithTasks: JobWithTasks[] = [];
    
    for (const job of completedJobs) {
      console.log(`   Loading tasks for ${job.item.partName} (${job.id})`);
      const { tasks, subtasks } = await loadJobTasksAndSubtasks(job.id);
      
      jobsWithTasks.push({
        job,
        tasks,
        subtasks
      });
    }
    
    // Step 3: Batch archive all jobs
    console.log(`🗄️ Archiving ${jobsWithTasks.length} completed jobs...`);
    
    const jobsData = jobsWithTasks.map(({ job, tasks, subtasks }) => ({
      job,
      tasks,
      subtasks
    }));
    
    const batchResult = await batchArchiveJobs(jobsData, 'Migration - Archive Existing Completed Jobs');
    
    // Step 4: Report results
    console.log('');
    console.log('📊 Archive Results:');
    console.log(`   ✅ Successfully archived: ${batchResult.successful.length} jobs`);
    console.log(`   ❌ Failed to archive: ${batchResult.failed.length} jobs`);
    console.log(`   📋 Total processed: ${batchResult.totalProcessed} jobs`);
    
    if (batchResult.successful.length > 0) {
      console.log('');
      console.log('✅ Successfully Archived Jobs:');
      for (const jobId of batchResult.successful) {
        const job = completedJobs.find(j => j.id === jobId);
        console.log(`   • ${job?.item.partName || 'Unknown'} (${jobId})`);
      }
    }
    
    if (batchResult.failed.length > 0) {
      console.log('');
      console.log('❌ Failed Archive Jobs:');
      for (const failure of batchResult.failed) {
        console.log(`   • ${failure.jobId}: ${failure.error}`);
      }
    }
    
    console.log('');
    console.log('🎯 Archive Migration Complete!');
    console.log('Now 1506P and 1606P should be searchable in Archive Intelligence.');
    
  } catch (error) {
    console.error('❌ Fatal error in archive process:', error);
  }
}

// Run the archival process
archiveExistingCompletedJobs(); 