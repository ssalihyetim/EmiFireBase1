import { db } from '../src/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function debugScheduledOperations() {
  console.log('🔍 Debugging: Finding source of 26 scheduled operations...\n');
  
  try {
    // Check all possible sources
    const collectionsToCheck = [
      'schedules',
      'scheduleEntries', 
      'operations',
      'processInstances',
      'jobOperations',
      'jobs',
      'jobTasks',
      'jobSubtasks'
    ];
    
    for (const collectionName of collectionsToCheck) {
      try {
        console.log(`\n📂 Checking collection: ${collectionName}`);
        
        // Get all documents
        const allSnapshot = await getDocs(collection(db, collectionName));
        console.log(`   📊 Total documents: ${allSnapshot.docs.length}`);
        
        if (allSnapshot.empty) {
          console.log(`   ✅ Collection ${collectionName} is empty`);
          continue;
        }
        
        // Look for scheduled status
        let scheduledCount = 0;
        let scheduledDocs: any[] = [];
        
        allSnapshot.docs.forEach(doc => {
          const data = doc.data();
          
          // Check for various scheduled indicators
          if (data.status === 'scheduled' || 
              data.operationStatus === 'scheduled' ||
              data.scheduledStartTime ||
              data.scheduledEndTime ||
              data.assignedMachine ||
              data.machineName) {
            scheduledCount++;
            scheduledDocs.push({
              id: doc.id,
              status: data.status,
              operationStatus: data.operationStatus,
              scheduledStartTime: data.scheduledStartTime,
              scheduledEndTime: data.scheduledEndTime,
              assignedMachine: data.assignedMachine,
              machineName: data.machineName,
              partName: data.partName,
              baseProcessName: data.baseProcessName,
              displayName: data.displayName,
              quantity: data.quantity
            });
          }
        });
        
        if (scheduledCount > 0) {
          console.log(`   🔍 Found ${scheduledCount} scheduled items in ${collectionName}:`);
          scheduledDocs.slice(0, 3).forEach((item, index) => {
            console.log(`     ${index + 1}. ID: ${item.id}`);
            console.log(`        Name: ${item.partName || item.displayName || item.baseProcessName || 'Unknown'}`);
            console.log(`        Status: ${item.status || item.operationStatus || 'N/A'}`);
            console.log(`        Machine: ${item.machineName || item.assignedMachine || 'N/A'}`);
            console.log(`        Start: ${item.scheduledStartTime || 'N/A'}`);
          });
          if (scheduledDocs.length > 3) {
            console.log(`     ... and ${scheduledDocs.length - 3} more`);
          }
        } else {
          console.log(`   ✅ No scheduled items found in ${collectionName}`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error checking ${collectionName}:`, error);
      }
    }
    
    console.log('\n🎯 Debug Summary:');
    console.log('Look for collections with scheduled items above.');
    console.log('The one with ~26 items is likely the source of the Production Schedule data.');
    
  } catch (error) {
    console.error('❌ Debug script failed:', error);
    throw error;
  }
}

// Run the debug
debugScheduledOperations()
  .then(() => {
    console.log('\n✨ Debug completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }); 