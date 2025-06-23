import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

// Firebase config (replace with your actual config)
const firebaseConfig = {
  // Add your config here - check firebase.ts for the actual config
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugArchiveData() {
  try {
    console.log('🔍 Debugging Archive Data');
    console.log('========================');
    
    // Get all archive documents
    const archivesRef = collection(db, 'job_archives');
    const q = query(archivesRef, orderBy('archiveDate', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    
    console.log(`📊 Total archives found: ${snapshot.docs.length}`);
    console.log('');
    
    if (snapshot.docs.length === 0) {
      console.log('❌ No archive documents found!');
      console.log('The archive search is failing because there are no archived jobs in the database.');
      console.log('');
      console.log('Solutions:');
      console.log('1. Complete some jobs to generate archive data');
      console.log('2. Run the test script to create mock completed jobs');
      console.log('3. Manually archive existing completed jobs');
      return;
    }
    
    // Analyze each archive
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const jobSnapshot = data.jobSnapshot;
      const partName = jobSnapshot?.item?.partName;
      
      console.log(`📄 Archive #${index + 1}: ${doc.id}`);
      console.log(`   Part Name: "${partName}"`);
      console.log(`   Original Job ID: ${data.originalJobId}`);
      console.log(`   Archive Type: ${data.archiveType}`);
      console.log(`   Archive Date: ${data.archiveDate?.toDate?.()?.toISOString() || data.archiveDate}`);
      console.log(`   Quality Score: ${data.performanceData?.qualityScore || 'N/A'}`);
      console.log('');
    });
    
    // Analyze part name patterns
    const partNames = snapshot.docs.map(doc => doc.data().jobSnapshot?.item?.partName).filter(Boolean);
    const uniquePartNames = [...new Set(partNames)];
    
    console.log('📋 Part Names in Archives:');
    uniquePartNames.forEach(partName => {
      const count = partNames.filter(p => p === partName).length;
      console.log(`   "${partName}" (${count} jobs)`);
    });
    console.log('');
    
    // Test specific searches
    console.log('🔍 Testing specific part searches:');
    console.log('');
    
    // Test search for "1606P"
    const search1606P = snapshot.docs.filter(doc => {
      const partName = doc.data().jobSnapshot?.item?.partName;
      return partName === '1606P';
    });
    console.log(`   "1606P" exact match: ${search1606P.length} results`);
    
    // Test search for "BTDK1"
    const searchBTDK1 = snapshot.docs.filter(doc => {
      const partName = doc.data().jobSnapshot?.item?.partName;
      return partName === 'BTDK1';
    });
    console.log(`   "BTDK1" exact match: ${searchBTDK1.length} results`);
    
    // Test partial matches
    const search1606Partial = snapshot.docs.filter(doc => {
      const partName = doc.data().jobSnapshot?.item?.partName;
      return partName?.includes('1606');
    });
    console.log(`   "1606" partial match: ${search1606Partial.length} results`);
    
    const searchBTDKPartial = snapshot.docs.filter(doc => {
      const partName = doc.data().jobSnapshot?.item?.partName;
      return partName?.includes('BTDK');
    });
    console.log(`   "BTDK" partial match: ${searchBTDKPartial.length} results`);
    
    console.log('');
    console.log('✅ Archive data analysis complete!');
    
  } catch (error) {
    console.error('❌ Error debugging archive data:', error);
  }
}

// Run the debug
debugArchiveData(); 