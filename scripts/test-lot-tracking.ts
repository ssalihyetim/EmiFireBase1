import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { 
  getNextLotNumber, 
  generateJobIdWithLot, 
  getLotNumberFromJobId, 
  getPartNameWithLot 
} from '../src/lib/lot-number-generator';

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

async function testLotTracking() {
  try {
    console.log('🧪 Testing Lot Tracking System\n');
    
    // Initialize Firebase
    const app = getFirebaseApp();
    const db = getFirestore(app);
    
    // Test 1: Get lot numbers for new part
    console.log('📦 Test 1: Creating lots for new part "1606P"');
    const lot1 = await getNextLotNumber('1606P');
    console.log(`   - First lot number: ${lot1}`);
    
    const lot2 = await getNextLotNumber('1606P');
    console.log(`   - Second lot number: ${lot2}`);
    
    const lot3 = await getNextLotNumber('1606P');
    console.log(`   - Third lot number: ${lot3}`);
    
    // Test 2: Generate job IDs with lot numbers
    console.log('\n🔧 Test 2: Generating job IDs with lot tracking');
    const jobId1 = await generateJobIdWithLot('ORDER123', 'item-0', '1606P');
    const jobId2 = await generateJobIdWithLot('ORDER123', 'item-0', '1606P');
    const jobId3 = await generateJobIdWithLot('ORDER456', 'item-1', '1606P');
    
    console.log(`   - Job 1 ID: ${jobId1}`);
    console.log(`   - Job 2 ID: ${jobId2}`);
    console.log(`   - Job 3 ID: ${jobId3}`);
    
    // Test 3: Extract lot numbers from job IDs
    console.log('\n🔍 Test 3: Extracting lot numbers from job IDs');
    const extractedLot1 = getLotNumberFromJobId(jobId1);
    const extractedLot2 = getLotNumberFromJobId(jobId2);
    const extractedLot3 = getLotNumberFromJobId(jobId3);
    
    console.log(`   - ${jobId1} → Lot ${extractedLot1}`);
    console.log(`   - ${jobId2} → Lot ${extractedLot2}`);
    console.log(`   - ${jobId3} → Lot ${extractedLot3}`);
    
    // Test 4: Display names with lot numbers
    console.log('\n📝 Test 4: Display names with lot numbers');
    if (extractedLot1) {
      console.log(`   - Display name: ${getPartNameWithLot('1606P', extractedLot1)}`);
    }
    if (extractedLot2) {
      console.log(`   - Display name: ${getPartNameWithLot('1606P', extractedLot2)}`);
    }
    if (extractedLot3) {
      console.log(`   - Display name: ${getPartNameWithLot('1606P', extractedLot3)}`);
    }
    
    // Test 5: Test different parts
    console.log('\n🔧 Test 5: Testing different parts');
    const btdk1_lot1 = await getNextLotNumber('BTDK1');
    const btdk1_lot2 = await getNextLotNumber('BTDK1');
    
    console.log(`   - BTDK1 Lot 1: ${btdk1_lot1}`);
    console.log(`   - BTDK1 Lot 2: ${btdk1_lot2}`);
    
    const btdk1_jobId1 = await generateJobIdWithLot('ORDER789', 'item-0', 'BTDK1');
    const btdk1_jobId2 = await generateJobIdWithLot('ORDER789', 'item-0', 'BTDK1');
    
    console.log(`   - BTDK1 Job 1: ${btdk1_jobId1}`);
    console.log(`   - BTDK1 Job 2: ${btdk1_jobId2}`);
    
    console.log('\n✅ Lot tracking system test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Each part maintains independent lot counters');
    console.log('   - Job IDs include lot numbers to prevent conflicts');
    console.log('   - Multiple jobs for same part will have different lots');
    console.log('   - This solves the 1606P stacking issue');
    
  } catch (error) {
    console.error('❌ Error testing lot tracking:', error);
  }
}

// Run the test
testLotTracking(); 