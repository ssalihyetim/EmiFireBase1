import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch, query, where } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Safety check
    if (body.confirmCleanup !== 'YES_DELETE_ALL_JOBS') {
      return NextResponse.json(
        { error: 'Safety confirmation required' },
        { status: 400 }
      );
    }

    console.log('🧹 Starting cleanup of jobs database...');
    
    const collections = [
      'jobs',
      'jobTasks', 
      'jobSubtasks',
      'routingSheets',
      'setupSheets',
      'toolLists',
      'scheduleEntries',
      'processInstances'
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

    // Also clean any scheduled operation status from other collections
    try {
      console.log('\n📂 Cleaning scheduled operation statuses...');
      
      // Clear any operations with scheduled status (from job operations pages)
      const operationsQuery = query(
        collection(db, 'operations'),
        where('status', '==', 'scheduled')
      );
      const operationsSnapshot = await getDocs(operationsQuery);
      
      if (!operationsSnapshot.empty) {
        const batch = writeBatch(db);
        operationsSnapshot.docs.forEach(operationDoc => {
          const operationRef = doc(db, 'operations', operationDoc.id);
          batch.update(operationRef, { 
            status: 'pending',
            scheduledStartTime: null,
            scheduledEndTime: null,
            assignedMachine: null
          });
        });
        await batch.commit();
        console.log(`   🔄 Reset ${operationsSnapshot.docs.length} operation statuses`);
      }
      
    } catch (error) {
      console.error('   ❌ Error cleaning operation statuses:', error);
    }
    
    console.log(`\n🎉 Cleanup completed! Total documents processed: ${totalDeleted}`);
    
    return NextResponse.json({
      success: true,
      message: 'Database cleanup completed successfully',
      deletedCount: totalDeleted,
      collectionsProcessed: collections.length
    });
    
  } catch (error) {
    console.error('Database cleanup failed:', error);
    return NextResponse.json(
      { error: 'Database cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 