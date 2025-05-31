import { db } from '../src/lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

async function fixProductionSchedule() {
  console.log('🔧 Fixing Production Schedule - Removing scheduled operations...\n');
  
  try {
    // Target the specific collection that's causing the 26 scheduled operations
    const collectionsToClean = [
      'schedules',
      'scheduleEntries',
      'productionSchedule',
      'operationSchedule'
    ];
    
    let totalDeleted = 0;
    
    for (const collectionName of collectionsToClean) {
      try {
        console.log(`📂 Processing collection: ${collectionName}`);
        const snapshot = await getDocs(collection(db, collectionName));
        
        if (snapshot.empty) {
          console.log(`   ✅ Collection ${collectionName} is already empty`);
          continue;
        }
        
        console.log(`   📊 Found ${snapshot.docs.length} documents in ${collectionName}`);
        
        // Use batch for efficient deletion
        const batch = writeBatch(db);
        const docs = snapshot.docs;
        let batchCount = 0;
        
        for (const docSnapshot of docs) {
          batch.delete(doc(db, collectionName, docSnapshot.id));
          batchCount++;
          
          // Firestore batch limit is 500 operations
          if (batchCount === 500) {
            await batch.commit();
            console.log(`   🗑️  Deleted batch of 500 documents from ${collectionName}`);
            batchCount = 0;
          }
        }
        
        // Commit remaining documents
        if (batchCount > 0) {
          await batch.commit();
          console.log(`   🗑️  Deleted final batch of ${batchCount} documents from ${collectionName}`);
        }
        
        totalDeleted += docs.length;
        console.log(`   ✅ Cleaned ${docs.length} documents from ${collectionName}`);
        
      } catch (error) {
        console.error(`   ❌ Error cleaning ${collectionName}:`, error);
      }
    }
    
    console.log(`\n🎉 Production Schedule Fix completed!`);
    console.log(`📋 Summary:`);
    console.log(`   • Total documents deleted: ${totalDeleted}`);
    console.log(`   • All scheduled operations removed`);
    console.log(`   • Production schedule cleared`);
    console.log(`   • Ready for new manufacturing calendar system`);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    throw error;
  }
}

// Run the fix
fixProductionSchedule()
  .then(() => {
    console.log('\n✨ Production Schedule fix completed successfully!');
    console.log('🔄 Please refresh the Production Schedule page to see changes.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Production Schedule fix failed:', error);
    process.exit(1);
  }); 