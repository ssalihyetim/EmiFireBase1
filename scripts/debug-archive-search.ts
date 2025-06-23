import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getPartArchiveHistory, searchJobArchives, calculateArchiveStatistics } from '../src/lib/job-archival';

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

async function debugArchiveSearch() {
  console.log('🔍 Archive Search Debug Test');
  console.log('============================');
  
  try {
    // Test 1: Search for 1606P specifically
    console.log('1. Testing search for 1606P...');
    const archives1606P = await getPartArchiveHistory('1606P');
    console.log(`   Found ${archives1606P.length} archives for 1606P`);
    
    if (archives1606P.length > 0) {
      console.log('   Archive details:');
      archives1606P.forEach((archive, index) => {
        console.log(`     ${index + 1}. ${archive.jobSnapshot.item.partName} - ${archive.archiveType} - ${archive.archiveDate}`);
      });
    }
    
    // Test 2: Search for 1506P specifically
    console.log('');
    console.log('2. Testing search for 1506P...');
    const archives1506P = await getPartArchiveHistory('1506P');
    console.log(`   Found ${archives1506P.length} archives for 1506P`);
    
    if (archives1506P.length > 0) {
      console.log('   Archive details:');
      archives1506P.forEach((archive, index) => {
        console.log(`     ${index + 1}. ${archive.jobSnapshot.item.partName} - ${archive.archiveType} - ${archive.archiveDate}`);
      });
    }
    
    // Test 3: Search for BTDK1 (known working)
    console.log('');
    console.log('3. Testing search for BTDK1 (known working)...');
    const archivesBTDK1 = await getPartArchiveHistory('BTDK1');
    console.log(`   Found ${archivesBTDK1.length} archives for BTDK1`);
    
    if (archivesBTDK1.length > 0) {
      console.log('   Archive details:');
      archivesBTDK1.forEach((archive, index) => {
        console.log(`     ${index + 1}. ${archive.jobSnapshot.item.partName} - ${archive.archiveType} - ${archive.archiveDate}`);
      });
    }
    
    // Test 4: Get overall statistics
    console.log('');
    console.log('4. Testing overall archive statistics...');
    const stats = await calculateArchiveStatistics();
    console.log(`   Total archives: ${stats.totalArchives}`);
    console.log(`   Average quality: ${stats.avgQualityScore.toFixed(1)}`);
    console.log(`   Top performing parts:`);
    stats.topPerformingParts.slice(0, 5).forEach((part, index) => {
      console.log(`     ${index + 1}. ${part.partNumber} - ${part.avgQuality.toFixed(1)} quality, ${part.totalJobs} jobs`);
    });
    
    // Test 5: Search with different criteria
    console.log('');
    console.log('5. Testing broad search...');
    const broadSearch = await searchJobArchives({}, 10);
    console.log(`   Found ${broadSearch.length} archives in broad search`);
    
    if (broadSearch.length > 0) {
      console.log('   Part names in broad search:');
      const partNames = broadSearch.map(a => a.jobSnapshot.item.partName);
      const uniqueParts = [...new Set(partNames)];
      uniqueParts.forEach((partName, index) => {
        const count = partNames.filter(p => p === partName).length;
        console.log(`     ${index + 1}. ${partName} (${count} jobs)`);
      });
    }
    
    // Test 6: Check if there are any archived records at all
    console.log('');
    console.log('6. Testing any archived records...');
    const anyArchives = await searchJobArchives({ archiveType: ['completed', 'quality_failure', 'pattern_creation'] }, 50);
    console.log(`   Found ${anyArchives.length} total archived records`);
    
    console.log('');
    console.log('🎯 Debug Summary:');
    console.log(`   - 1606P archives: ${archives1606P.length}`);
    console.log(`   - 1506P archives: ${archives1506P.length}`);
    console.log(`   - BTDK1 archives: ${archivesBTDK1.length}`);
    console.log(`   - Total archives: ${stats.totalArchives}`);
    console.log(`   - Broad search results: ${broadSearch.length}`);
    
    if (archives1606P.length === 0 && archives1506P.length === 0) {
      console.log('');
      console.log('❌ ISSUE CONFIRMED: 1506P and 1606P not found in archive search');
      console.log('💡 This explains why Archive Intelligence shows empty results');
      console.log('');
      console.log('📋 Possible causes:');
      console.log('   1. Jobs were never archived (most likely)');
      console.log('   2. Part names have different case sensitivity');
      console.log('   3. Firestore security rules preventing access');
      console.log('   4. Data in temp files but not in live database');
    }
    
  } catch (error) {
    console.error('❌ Error in archive search debug:', error);
  }
}

// Run the debug
debugArchiveSearch(); 