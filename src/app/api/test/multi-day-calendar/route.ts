import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, getDocs, query, where } from "firebase/firestore";

export async function POST() {
  try {
    console.log('🧪 Creating test multi-day manufacturing operations...');
    
    // 1. Clean up existing test data
    const schedulesRef = collection(db, 'schedules');
    const calendarRef = collection(db, 'calendarEvents');
    
    // Remove existing test schedules
    const testSchedulesQuery = query(schedulesRef, where('notes', '==', 'Multi-day test operation'));
    const testSchedulesSnapshot = await getDocs(testSchedulesQuery);
    
    for (const doc of testSchedulesSnapshot.docs) {
      await deleteDoc(doc.ref);
    }
    
    // Remove existing test calendar events
    const testEventsQuery = query(calendarRef, where('notes', 'array-contains', 'Multi-day test'));
    const testEventsSnapshot = await getDocs(testEventsQuery);
    
    for (const doc of testEventsSnapshot.docs) {
      await deleteDoc(doc.ref);
    }
    
    console.log('🧹 Cleaned up existing test data');
    
    // 2. Create sample multi-day operations
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // Start at 9 AM tomorrow
    
    const testOperations = [
      {
        partName: "Test Gear Housing",
        machineName: "CNC Mill #1",
        machineId: "test-mill-1",
        durationHours: 18, // 18 hours = spans ~2.5 working days
        processName: "3-Axis Milling"
      },
      {
        partName: "Test Shaft Component", 
        machineName: "Lathe #2",
        machineId: "test-lathe-2",
        durationHours: 32, // 32 hours = spans ~4 working days
        processName: "Turning"
      },
      {
        partName: "Test Bracket",
        machineName: "4-Axis Mill",
        machineId: "test-4axis-1", 
        durationHours: 6, // 6 hours = single day
        processName: "4-Axis Milling"
      }
    ];
    
    const createdSchedules = [];
    let currentStart = new Date(tomorrow);
    
    for (let i = 0; i < testOperations.length; i++) {
      const operation = testOperations[i];
      
      // Calculate end time based on working hours (8 hours per day)
      const workingMinutesPerDay = 8 * 60; // 8 working hours per day
      const totalMinutes = operation.durationHours * 60;
      const workingDays = Math.ceil(totalMinutes / workingMinutesPerDay);
      
      // Calculate actual end time considering weekends
      const endTime = new Date(currentStart);
      let minutesRemaining = totalMinutes;
      let currentDay = new Date(currentStart);
      
      while (minutesRemaining > 0) {
        // Skip weekends
        if (currentDay.getDay() === 0 || currentDay.getDay() === 6) {
          currentDay.setDate(currentDay.getDate() + 1);
          continue;
        }
        
        const minutesThisDay = Math.min(minutesRemaining, workingMinutesPerDay);
        minutesRemaining -= minutesThisDay;
        
        if (minutesRemaining > 0) {
          currentDay.setDate(currentDay.getDate() + 1);
        } else {
          // Set the end time for the last day
          endTime.setTime(currentDay.getTime());
          const endHour = Math.floor(minutesThisDay / 60) + currentStart.getHours();
          const endMinute = (minutesThisDay % 60) + currentStart.getMinutes();
          endTime.setHours(endHour, endMinute, 0, 0);
        }
      }
      
      // Create schedule entry
      const scheduleEntry = {
        processInstanceId: `test-process-${i + 1}`,
        processName: operation.processName,
        partName: operation.partName,
        machineName: operation.machineName,
        machineId: operation.machineId,
        scheduledStartTime: currentStart.toISOString(),
        scheduledEndTime: endTime.toISOString(),
        startTime: currentStart.toISOString(),
        endTime: endTime.toISOString(),
        status: 'scheduled',
        quantity: 1,
        operationIndex: i + 1,
        jobId: `test-job-${i + 1}`,
        orderId: `test-order-${i + 1}`,
        notes: 'Multi-day test operation',
        estimatedDuration: totalMinutes,
        actualDurationHours: operation.durationHours,
        workingDaysSpanned: workingDays,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to database
      const scheduleRef = await addDoc(schedulesRef, scheduleEntry);
      createdSchedules.push({ id: scheduleRef.id, ...scheduleEntry });
      
      console.log(`✅ Created test operation: ${operation.partName} | ${operation.durationHours}h | ${workingDays} working days`);
      
      // Move start time for next operation (stagger them)
      currentStart.setHours(currentStart.getHours() + 2);
    }
    
    console.log(`🎉 Created ${createdSchedules.length} test manufacturing operations`);
    
    // 3. Now sync these to calendar (call the sync endpoint)
    const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9004'}/api/manufacturing-calendar/sync-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const syncResult = await syncResponse.json();
    
    return NextResponse.json({
      success: true,
      message: 'Multi-day test operations created and synced to calendar',
      operationsCreated: createdSchedules.length,
      schedules: createdSchedules,
      syncResult: syncResult,
      instructions: 'Check the manufacturing calendar to see multi-day operations displayed as daily events',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error creating test multi-day operations:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create test operations',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Multi-day calendar test endpoint',
    usage: 'POST to this endpoint to create test multi-day manufacturing operations',
    description: 'This will create sample operations that span multiple days and sync them to the calendar to test daily event splitting'
  });
} 