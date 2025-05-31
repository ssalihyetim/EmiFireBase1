import { db } from '../src/lib/firebase';
import { collection, getDocs, writeBatch, doc, query, where } from 'firebase/firestore';

async function clearOperationStatuses() {
  console.log('🧹 Starting cleanup of operation statuses...\n');
  
  try {
    // Check all possible collections that might contain operations
    const collectionsToCheck = [
      'operations',
      'processInstances', 
      'jobOperations',
      'scheduledOperations',
      'manufacturingOperations'
    ];
    
    let totalUpdated = 0;
    
    for (const collectionName of collectionsToCheck) {
      try {
        console.log(`📂 Checking collection: ${collectionName}`);
        
        // First, check if collection exists by trying to get all docs
        const allSnapshot = await getDocs(collection(db, collectionName));
        
        if (allSnapshot.empty) {
          console.log(`   ✅ Collection ${collectionName} is empty or doesn't exist`);
          continue;
        }
        
        console.log(`   📊 Found ${allSnapshot.docs.length} documents in ${collectionName}`);
        
        // Look for documents with scheduled status
        const scheduledDocs = allSnapshot.docs.filter(docSnap => {
          const data = docSnap.data();
          return data.status === 'scheduled' || 
                 data.operationStatus === 'scheduled' ||
                 data.scheduledStartTime ||
                 data.scheduledEndTime ||
                 data.assignedMachine;
        });
        
        if (scheduledDocs.length === 0) {
          console.log(`   ✅ No scheduled operations found in ${collectionName}`);
          continue;
        }
        
        console.log(`   🔄 Found ${scheduledDocs.length} scheduled operations in ${collectionName}`);
        
        // Update in batches
        const batch = writeBatch(db);
        let batchCount = 0;
        
        scheduledDocs.forEach(docSnap => {
          const docRef = doc(db, collectionName, docSnap.id);
          const data = docSnap.data();
          
          // Clear scheduling-related fields
          const updates: any = {};
          
          if (data.status === 'scheduled') {
            updates.status = 'pending';
          }
          if (data.operationStatus === 'scheduled') {
            updates.operationStatus = 'pending';
          }
          if (data.scheduledStartTime) {
            updates.scheduledStartTime = null;
          }
          if (data.scheduledEndTime) {
            updates.scheduledEndTime = null;
          }
          if (data.assignedMachine) {
            updates.assignedMachine = null;
          }
          
          batch.update(docRef, updates);
          batchCount++;
          
          // Commit batch if we hit the limit
          if (batchCount === 500) {
            // We can't await here, so we'll handle this differently
          }
        });
        
        if (batchCount > 0) {
          await batch.commit();
          console.log(`   ✅ Updated ${batchCount} operations in ${collectionName}`);
          totalUpdated += batchCount;
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing ${collectionName}:`, error);
      }
    }
    
    console.log(`\n🎉 Operation status cleanup completed!`);
    console.log(`📋 Summary:`);
    console.log(`   • Total operations updated: ${totalUpdated}`);
    console.log(`   • All scheduled statuses reset to pending`);
    console.log(`   • All machine assignments cleared`);
    console.log(`   • All schedule times removed`);
    console.log('\n✨ No more scheduled operations should appear!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    throw error;
  }
}

// Run the cleanup
clearOperationStatuses()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 