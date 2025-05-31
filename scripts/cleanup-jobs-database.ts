// Script to clean up all jobs and job-related data from the database
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  writeBatch,
  query,
  limit
} from 'firebase/firestore';

// Firebase config - update with your config
const firebaseConfig = {
  // Add your Firebase config here
  // This should match your main Firebase config
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTIONS_TO_CLEAN = [
  'jobTasks',
  'jobSubtasks',
  'routingSheets',
  'setupSheets',
  'toolLists',
  'scheduleEntries',
  'processInstances'
];

async function deleteCollection(collectionName: string): Promise<number> {
  console.log(`Starting cleanup of ${collectionName} collection...`);
  
  let deletedCount = 0;
  let hasMore = true;

  while (hasMore) {
    const q = query(collection(db, collectionName), limit(500));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    // Use batch operations for efficiency
    const batch = writeBatch(db);
    
    snapshot.docs.forEach((docSnapshot) => {
      batch.delete(docSnapshot.ref);
      deletedCount++;
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.docs.length} documents from ${collectionName}`);
  }

  console.log(`✅ Completed cleanup of ${collectionName}: ${deletedCount} documents deleted`);
  return deletedCount;
}

async function cleanupJobsDatabase(): Promise<void> {
  console.log('🧹 Starting comprehensive jobs database cleanup...');
  console.log('This will remove ALL job-related data from the database.');
  console.log('Make sure you have backups if needed!\n');

  const startTime = Date.now();
  let totalDeleted = 0;

  try {
    // Clean up all job-related collections
    for (const collectionName of COLLECTIONS_TO_CLEAN) {
      try {
        const deleted = await deleteCollection(collectionName);
        totalDeleted += deleted;
        console.log();
      } catch (error) {
        console.error(`❌ Error cleaning ${collectionName}:`, error);
        // Continue with other collections even if one fails
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    
    console.log('🎉 Database cleanup completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Total documents deleted: ${totalDeleted}`);
    console.log(`   - Time taken: ${duration.toFixed(2)} seconds`);
    console.log(`   - Collections cleaned: ${COLLECTIONS_TO_CLEAN.length}`);
    console.log('\n✨ Database is now clean and ready for the new order-based workflow!');
    
  } catch (error) {
    console.error('❌ Critical error during cleanup:', error);
    throw error;
  }
}

// Safety check function
function confirmCleanup(): boolean {
  const confirmation = process.env.CONFIRM_CLEANUP;
  if (confirmation !== 'YES_DELETE_ALL_JOBS') {
    console.log('❌ Safety check failed!');
    console.log('To run this script, set environment variable:');
    console.log('CONFIRM_CLEANUP=YES_DELETE_ALL_JOBS');
    console.log('\nThis prevents accidental data deletion.');
    return false;
  }
  return true;
}

// Main execution
async function main() {
  if (!confirmCleanup()) {
    process.exit(1);
  }

  try {
    await cleanupJobsDatabase();
    console.log('✅ Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { cleanupJobsDatabase }; 