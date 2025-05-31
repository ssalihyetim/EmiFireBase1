import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from "firebase/firestore";

export async function POST() {
  try {
    console.log('🔄 Starting schedule sync to manufacturing calendar...');
    
    // 1. Clear existing calendar events of type 'manufacturing'
    const calendarEventsRef = collection(db, 'calendarEvents');
    const existingEventsQuery = query(calendarEventsRef, where('type', '==', 'manufacturing'));
    const existingEventsSnapshot = await getDocs(existingEventsQuery);
    
    console.log(`🗑️ Removing ${existingEventsSnapshot.docs.length} existing manufacturing events...`);
    
    for (const eventDoc of existingEventsSnapshot.docs) {
      await deleteDoc(doc(db, 'calendarEvents', eventDoc.id));
    }
    
    // 2. Fetch all scheduled operations
    const schedulesRef = collection(db, 'schedules');
    const scheduleSnapshot = await getDocs(schedulesRef);
    
    console.log(`📋 Found ${scheduleSnapshot.docs.length} scheduled operations to sync...`);
    
    // 3. Convert schedule entries to calendar events
    const newEvents = [];
    
    for (const scheduleDoc of scheduleSnapshot.docs) {
      const scheduleData = scheduleDoc.data();
      
      // Helper function to safely convert dates
      const convertToISOString = (dateField: any): string => {
        if (!dateField) return new Date().toISOString();
        
        // If it's already a string, return it
        if (typeof dateField === 'string') return dateField;
        
        // If it's a Firestore Timestamp
        if (dateField && typeof dateField.toDate === 'function') {
          return dateField.toDate().toISOString();
        }
        
        // If it's a Date object
        if (dateField instanceof Date) {
          return dateField.toISOString();
        }
        
        // If it's a seconds/nanoseconds object (Firestore timestamp format)
        if (dateField && typeof dateField === 'object' && 'seconds' in dateField) {
          return new Date(dateField.seconds * 1000).toISOString();
        }
        
        // Fallback
        return new Date().toISOString();
      };

      const startTime = convertToISOString(scheduleData.scheduledStartTime || scheduleData.startTime);
      const endTime = convertToISOString(scheduleData.scheduledEndTime || scheduleData.endTime);
      const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60));
      
      const calendarEvent = {
        title: `${scheduleData.partName || scheduleData.process?.name || 'Manufacturing'} - ${scheduleData.machineName}`,
        type: 'manufacturing',
        startTime: startTime,
        endTime: endTime,
        machineId: scheduleData.machineId,
        machineName: scheduleData.machineName || 'Unknown Machine',
        jobId: scheduleData.processInstanceId || scheduleData.jobId,
        description: `Manufacturing operation: ${scheduleData.partName || 'Part'} (Qty: ${scheduleData.quantity || 1})`,
        priority: 'medium',
        status: scheduleData.status === 'completed' ? 'completed' : 
                scheduleData.status === 'in_progress' ? 'in_progress' : 'scheduled',
        estimatedDuration: duration,
        quantity: scheduleData.quantity || 1,
        notes: `Scheduled operation from auto-scheduler`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to calendar events collection
      const calendarEventRef = await addDoc(calendarEventsRef, calendarEvent);
      newEvents.push({ id: calendarEventRef.id, ...calendarEvent });
      
      console.log(`✅ Created calendar event: ${calendarEvent.title}`);
    }
    
    console.log(`🎉 Sync completed! Created ${newEvents.length} calendar events`);
    
    return NextResponse.json({
      success: true,
      message: 'Schedule sync completed successfully',
      eventsCreated: newEvents.length,
      events: newEvents.slice(0, 5), // Return first 5 events as sample
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Schedule sync failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Schedule sync failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  // Status check endpoint
  try {
    const calendarEventsRef = collection(db, 'calendarEvents');
    const calendarEventsSnapshot = await getDocs(calendarEventsRef);
    
    const schedulesRef = collection(db, 'schedules');
    const schedulesSnapshot = await getDocs(schedulesRef);
    
    return NextResponse.json({
      success: true,
      message: 'Sync status check',
      calendarEventsCount: calendarEventsSnapshot.docs.length,
      scheduledOperationsCount: schedulesSnapshot.docs.length,
      lastSyncNeeded: schedulesSnapshot.docs.length > 0 && calendarEventsSnapshot.docs.length === 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to check sync status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 