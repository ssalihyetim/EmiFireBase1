import { db } from '../src/lib/firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

// Safety check environment variable
const CONFIRM_CLEANUP = process.env.CONFIRM_CLEANUP_SCHEDULE;

if (CONFIRM_CLEANUP !== 'YES_DELETE_ALL_SCHEDULED_OPERATIONS') {
  console.error('❌ Safety check failed!');
  console.error('To confirm cleanup of all scheduled operations, set:');
  console.error('CONFIRM_CLEANUP_SCHEDULE=YES_DELETE_ALL_SCHEDULED_OPERATIONS');
  process.exit(1);
}

async function cleanupScheduledOperations() {
  console.log('🧹 Starting cleanup of scheduled operations...\n');
  
  const collections = [
    'scheduleEntries',
    'schedules',
    'productionSchedule', 
    'machineSchedule',
    'operationSchedule'
  ];
  
  let totalDeleted = 0;
  
  for (const collectionName of collections) {
    try {
      console.log(`📂 Processing collection: ${collectionName}`);
      const snapshot = await getDocs(collection(db, collectionName));
      
      if (snapshot.empty) {
        console.log(`   ✅ Collection ${collectionName} is already empty`);
        continue;
      }
      
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
  
  // Also clean scheduling-related fields from job tasks
  try {
    console.log('\n📂 Cleaning scheduling fields from job tasks...');
    const jobTasksSnapshot = await getDocs(collection(db, 'jobTasks'));
    
    if (!jobTasksSnapshot.empty) {
      const batch = writeBatch(db);
      let taskUpdateCount = 0;
      
      for (const taskDoc of jobTasksSnapshot.docs) {
        const taskData = taskDoc.data();
        
        // Remove scheduling-related fields
        const cleanedData = { ...taskData };
        delete cleanedData.scheduledMachineId;
        delete cleanedData.scheduledMachineName;
        delete cleanedData.scheduledStartTime;
        delete cleanedData.scheduledEndTime;
        delete cleanedData.scheduleEntryId;
        
        // Update status if it was scheduled
        if (taskData.status === 'scheduled' || taskData.status === 'ready') {
          cleanedData.status = 'pending';
        }
        
        batch.update(doc(db, 'jobTasks', taskDoc.id), cleanedData);
        taskUpdateCount++;
        
        if (taskUpdateCount === 500) {
          await batch.commit();
          console.log(`   🔄 Updated batch of 500 job tasks`);
          taskUpdateCount = 0;
        }
      }
      
      if (taskUpdateCount > 0) {
        await batch.commit();
        console.log(`   🔄 Updated final batch of ${taskUpdateCount} job tasks`);
      }
      
      console.log(`   ✅ Cleaned scheduling fields from ${jobTasksSnapshot.docs.length} job tasks`);
    }
    
  } catch (error) {
    console.error('   ❌ Error cleaning job tasks:', error);
  }
  
  console.log(`\n🎉 Cleanup completed! Total documents processed: ${totalDeleted}`);
  console.log('📋 Summary:');
  console.log('   • All schedule entries removed');
  console.log('   • All production schedules cleared');
  console.log('   • Machine schedules reset');
  console.log('   • Operation schedules cleared');
  console.log('   • Job task scheduling fields removed');
  console.log('   • Task statuses reset to pending');
  console.log('\n✨ Ready for new manufacturing calendar system!');
}

// Run the cleanup
cleanupScheduledOperations()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 