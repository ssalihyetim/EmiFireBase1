import { db } from '../src/lib/firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

async function forceCleanSchedules() {
  console.log('🎯 Force cleaning schedules collection...\n');
  
  try {
    const schedulesRef = collection(db, 'schedules');
    const snapshot = await getDocs(schedulesRef);
    
    console.log(`📊 Found ${snapshot.docs.length} documents in schedules collection`);
    
    if (snapshot.empty) {
      console.log('✅ Collection is already empty');
      return;
    }
    
    // Log first few documents to understand what we're deleting
    console.log('\n📋 Sample documents:');
    snapshot.docs.slice(0, 3).forEach((docSnapshot, index) => {
      const data = docSnapshot.data();
      console.log(`   ${index + 1}. ID: ${docSnapshot.id}`);
      console.log(`      Part: ${data.partName || 'Unknown'}`);
      console.log(`      Machine: ${data.machineName || 'Unknown'}`);
      console.log(`      Status: ${data.status || 'Unknown'}`);
    });
    
    // Force delete all documents
    console.log(`\n🗑️  Deleting ${snapshot.docs.length} documents...`);
    
    const batch = writeBatch(db);
    let batchCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      batch.delete(doc(db, 'schedules', docSnapshot.id));
      batchCount++;
      
      if (batchCount === 500) {
        await batch.commit();
        console.log(`   ✅ Deleted batch of 500 documents`);
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
      console.log(`   ✅ Deleted final batch of ${batchCount} documents`);
    }
    
    console.log(`\n🎉 Successfully deleted ${snapshot.docs.length} schedule entries!`);
    
    // Verify deletion
    const verificationSnapshot = await getDocs(schedulesRef);
    console.log(`\n🔍 Verification: ${verificationSnapshot.docs.length} documents remaining`);
    
  } catch (error) {
    console.error('❌ Error force cleaning schedules:', error);
    throw error;
  }
}

// Run the force cleanup
forceCleanSchedules()
  .then(() => {
    console.log('\n✨ Force cleanup completed successfully!');
    console.log('🔄 Please refresh the Production Schedule page to see changes.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Force cleanup failed:', error);
    process.exit(1);
  }); 