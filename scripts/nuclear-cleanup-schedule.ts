import { db } from '../src/lib/firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch, query, where } from 'firebase/firestore';

async function nuclearCleanupSchedule() {
  console.log('💥 NUCLEAR CLEANUP: Removing ALL schedule-related data...\n');
  
  // All possible collections that might contain schedule data
  const allPossibleCollections = [
    'schedules',
    'scheduleEntries', 
    'schedule_entries',
    'productionSchedule',
    'production_schedule',
    'machineSchedule',
    'machine_schedule',
    'operationSchedule',
    'operation_schedule',
    'scheduledOperations',
    'scheduled_operations',
    'calendarEvents',
    'calendar_events',
    'manufacturingSchedule',
    'manufacturing_schedule'
  ];
  
  let totalDeleted = 0;
  
  for (const collectionName of allPossibleCollections) {
    try {
      console.log(`🎯 Targeting collection: ${collectionName}`);
      const snapshot = await getDocs(collection(db, collectionName));
      
      if (snapshot.empty) {
        console.log(`   ✅ Collection ${collectionName} is empty`);
        continue;
      }
      
      console.log(`   🔥 Found ${snapshot.docs.length} documents in ${collectionName}`);
      
      // Log sample documents
      if (snapshot.docs.length > 0) {
        const sampleDoc = snapshot.docs[0].data();
        console.log(`   📄 Sample doc:`, {
          id: snapshot.docs[0].id,
          partName: sampleDoc.partName,
          machineName: sampleDoc.machineName,
          status: sampleDoc.status
        });
      }
      
      // Delete all documents in batches
      const batch = writeBatch(db);
      let batchCount = 0;
      
      for (const docSnapshot of snapshot.docs) {
        batch.delete(doc(db, collectionName, docSnapshot.id));
        batchCount++;
        
        if (batchCount === 500) {
          await batch.commit();
          console.log(`   🗑️  Deleted batch of 500 documents from ${collectionName}`);
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
        console.log(`   🗑️  Deleted final batch of ${batchCount} documents from ${collectionName}`);
      }
      
      totalDeleted += snapshot.docs.length;
      console.log(`   ✅ CLEARED ${snapshot.docs.length} documents from ${collectionName}`);
      
    } catch (error) {
      console.error(`   ❌ Error processing ${collectionName}:`, error);
    }
  }
  
  // Also clean any job-related schedule fields
  try {
    console.log('\n🧹 Cleaning job-related schedule fields...');
    
    const jobsSnapshot = await getDocs(collection(db, 'jobs'));
    const jobTasksSnapshot = await getDocs(collection(db, 'jobTasks'));
    const processInstancesSnapshot = await getDocs(collection(db, 'processInstances'));
    
    let cleanupCount = 0;
    
    // Clean jobs
    if (!jobsSnapshot.empty) {
      const batch = writeBatch(db);
      jobsSnapshot.docs.forEach(jobDoc => {
        const data = jobDoc.data();
        const cleanData = { ...data };
        delete cleanData.scheduledStartTime;
        delete cleanData.scheduledEndTime;
        delete cleanData.assignedMachine;
        delete cleanData.scheduleEntryId;
        if (data.status === 'scheduled') cleanData.status = 'pending';
        
        batch.update(doc(db, 'jobs', jobDoc.id), cleanData);
        cleanupCount++;
      });
      await batch.commit();
    }
    
    // Clean job tasks
    if (!jobTasksSnapshot.empty) {
      const batch = writeBatch(db);
      jobTasksSnapshot.docs.forEach(taskDoc => {
        const data = taskDoc.data();
        const cleanData = { ...data };
        delete cleanData.scheduledMachineId;
        delete cleanData.scheduledMachineName;
        delete cleanData.scheduledStartTime;
        delete cleanData.scheduledEndTime;
        delete cleanData.scheduleEntryId;
        if (data.status === 'scheduled' || data.status === 'ready') cleanData.status = 'pending';
        
        batch.update(doc(db, 'jobTasks', taskDoc.id), cleanData);
        cleanupCount++;
      });
      await batch.commit();
    }
    
    console.log(`   ✅ Cleaned ${cleanupCount} job-related documents`);
    
  } catch (error) {
    console.error('❌ Error cleaning job fields:', error);
  }
  
  console.log(`\n💥 NUCLEAR CLEANUP COMPLETED!`);
  console.log(`🎯 Total documents deleted: ${totalDeleted}`);
  console.log(`🧹 Additional cleanup operations performed`);
  console.log(`✨ System is now completely clean and ready!`);
}

// Run the nuclear cleanup
nuclearCleanupSchedule()
  .then(() => {
    console.log('\n🚀 Nuclear cleanup completed successfully!');
    console.log('🔄 Please hard refresh your browser to clear cache.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💣 Nuclear cleanup failed:', error);
    process.exit(1);
  }); 