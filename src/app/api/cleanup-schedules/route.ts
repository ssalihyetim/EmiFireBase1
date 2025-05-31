import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

export async function DELETE() {
  try {
    console.log('🎯 API Cleanup: Starting schedule deletion...');
    
    // Target all possible schedule collections
    const collectionsToClean = [
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
      'calendar_events'
    ];
    
    let totalDeleted = 0;
    const results = [];
    
    for (const collectionName of collectionsToClean) {
      try {
        console.log(`📂 Processing collection: ${collectionName}`);
        const snapshot = await getDocs(collection(db, collectionName));
        
        if (snapshot.empty) {
          console.log(`   ✅ Collection ${collectionName} is empty`);
          results.push({ collection: collectionName, deleted: 0, status: 'empty' });
          continue;
        }
        
        console.log(`   🔥 Found ${snapshot.docs.length} documents in ${collectionName}`);
        
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
        results.push({ 
          collection: collectionName, 
          deleted: snapshot.docs.length, 
          status: 'cleaned' 
        });
        
        console.log(`   ✅ CLEARED ${snapshot.docs.length} documents from ${collectionName}`);
        
      } catch (error) {
        console.error(`   ❌ Error processing ${collectionName}:`, error);
        results.push({ 
          collection: collectionName, 
          deleted: 0, 
          status: 'error', 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    console.log(`\n🎉 API Cleanup completed! Total deleted: ${totalDeleted}`);
    
    return NextResponse.json({
      success: true,
      message: 'Schedule cleanup completed successfully',
      totalDeleted,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ API Cleanup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Schedule cleanup failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  // Allow checking status via GET request
  try {
    const schedulesRef = collection(db, "schedules");
    const snapshot = await getDocs(schedulesRef);
    
    return NextResponse.json({
      success: true,
      message: 'Schedule status check',
      schedulesCount: snapshot.docs.length,
      sampleEntries: snapshot.docs.slice(0, 3).map(doc => ({
        id: doc.id,
        partName: doc.data().partName,
        machineName: doc.data().machineName,
        status: doc.data().status
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to check schedule status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 