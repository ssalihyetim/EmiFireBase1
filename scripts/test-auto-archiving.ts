import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { updateTaskStatusWithTracking } from '../src/lib/task-tracking';
import { searchJobArchives, getPartArchiveHistory } from '../src/lib/job-archival';

// Initialize Firebase (reuse existing app if available)
function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  
  return initializeApp(firebaseConfig);
}

async function testAutoArchiving() {
  console.log('🧪 Testing Auto-Archiving System');
  console.log('==================================');
  
  try {
    getFirebaseApp();
    
    // Test 1: Search for 1606P archives BEFORE any new archiving
    console.log('\n1. Testing archive search for 1606P (before)...');
    const archivesBefore = await getPartArchiveHistory('1606P');
    console.log(`   Found ${archivesBefore.length} archives for 1606P before test`);
    
    // Test 2: Check current completed jobs
    console.log('\n2. Checking current completed jobs...');
    const db = getFirestore();
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('status', '==', 'Completed')
    );
    
    const jobsSnapshot = await getDocs(jobsQuery);
    const completedJobs = jobsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`   Found ${completedJobs.length} completed jobs`);
    completedJobs.forEach((job: any, index) => {
      console.log(`     ${index + 1}. ${job.item?.partName || 'Unknown'} (${job.id})`);
    });
    
    // Test 3: Test archive search for parts we know exist
    console.log('\n3. Testing archive search for various parts...');
    const partsToTest = ['1606P', '1506P', 'BTDK1', '3005'];
    
    for (const partName of partsToTest) {
      try {
        const archives = await getPartArchiveHistory(partName);
        console.log(`   ${partName}: ${archives.length} archives found`);
        if (archives.length > 0) {
          console.log(`     First archive: ${archives[0].originalJobId} (${archives[0].archiveDate})`);
        }
      } catch (error) {
        console.log(`   ${partName}: Error - ${error}`);
      }
    }
    
    // Test 4: Test broad archive search
    console.log('\n4. Testing broad archive search...');
    const allArchives = await searchJobArchives({}, 20);
    console.log(`   Found ${allArchives.length} total archives`);
    
    const partCounts: Record<string, number> = {};
    allArchives.forEach(archive => {
      const partName = archive.jobSnapshot.item.partName;
      partCounts[partName] = (partCounts[partName] || 0) + 1;
    });
    
    console.log('   Archives by part:');
    Object.entries(partCounts).forEach(([part, count]) => {
      console.log(`     ${part}: ${count} archives`);
    });
    
    console.log('\n✅ Auto-archiving test completed successfully');
    
  } catch (error) {
    console.error('\n❌ Auto-archiving test failed:', error);
  }
}

// Run the test
testAutoArchiving(); 