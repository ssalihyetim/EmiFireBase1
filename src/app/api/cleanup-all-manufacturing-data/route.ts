import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

export async function POST() {
  try {
    console.log('🧹 Starting comprehensive manufacturing data cleanup...');
    
    let totalDeleted = 0;
    
    // 1. Clean up calendar events
    console.log('🗑️ Cleaning calendar events...');
    const calendarEventsRef = collection(db, 'calendarEvents');
    const calendarSnapshot = await getDocs(calendarEventsRef);
    
    for (const eventDoc of calendarSnapshot.docs) {
      await deleteDoc(doc(db, 'calendarEvents', eventDoc.id));
      totalDeleted++;
    }
    console.log(`✅ Deleted ${calendarSnapshot.docs.length} calendar events`);
    
    // 2. Clean up schedules
    console.log('🗑️ Cleaning schedules...');
    const schedulesRef = collection(db, 'schedules');
    const schedulesSnapshot = await getDocs(schedulesRef);
    
    for (const scheduleDoc of schedulesSnapshot.docs) {
      await deleteDoc(doc(db, 'schedules', scheduleDoc.id));
      totalDeleted++;
    }
    console.log(`✅ Deleted ${schedulesSnapshot.docs.length} schedule entries`);
    
    // 3. Clean up jobs (in case any remain)
    console.log('🗑️ Cleaning jobs...');
    const jobsRef = collection(db, 'jobs');
    const jobsSnapshot = await getDocs(jobsRef);
    
    for (const jobDoc of jobsSnapshot.docs) {
      await deleteDoc(doc(db, 'jobs', jobDoc.id));
      totalDeleted++;
    }
    console.log(`✅ Deleted ${jobsSnapshot.docs.length} jobs`);
    
    // 4. Clean up job tasks (missing from original implementation)
    console.log('🗑️ Cleaning job tasks...');
    const jobTasksRef = collection(db, 'jobTasks');
    const jobTasksSnapshot = await getDocs(jobTasksRef);
    
    for (const taskDoc of jobTasksSnapshot.docs) {
      await deleteDoc(doc(db, 'jobTasks', taskDoc.id));
      totalDeleted++;
    }
    console.log(`✅ Deleted ${jobTasksSnapshot.docs.length} job tasks`);

    // 5. Clean up job subtasks (if any)
    console.log('🗑️ Cleaning job subtasks...');
    const subtasksRef = collection(db, 'jobSubtasks');
    const subtasksSnapshot = await getDocs(subtasksRef);
    
    for (const subtaskDoc of subtasksSnapshot.docs) {
      await deleteDoc(doc(db, 'jobSubtasks', subtaskDoc.id));
      totalDeleted++;
    }
    console.log(`✅ Deleted ${subtasksSnapshot.docs.length} job subtasks`);
    
    console.log(`🎉 Cleanup completed! Total documents deleted: ${totalDeleted}`);
    
    return NextResponse.json({
      success: true,
      message: 'All manufacturing data cleaned up successfully',
      deletedCounts: {
        calendarEvents: calendarSnapshot.docs.length,
        schedules: schedulesSnapshot.docs.length,
        jobs: jobsSnapshot.docs.length,
        jobTasks: jobTasksSnapshot.docs.length,
        jobSubtasks: subtasksSnapshot.docs.length,
        total: totalDeleted
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 