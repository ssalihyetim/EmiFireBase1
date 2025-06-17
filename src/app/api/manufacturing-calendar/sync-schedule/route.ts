import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from "firebase/firestore";

/**
 * Create daily calendar events for multi-day operations
 */
function createDailyEvents(
  startTime: string, 
  endTime: string, 
  partName: string, 
  machineName: string, 
  baseEvent: any
): any[] {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // Working hours: 8:00 AM to 5:00 PM (9 hours with 1 hour lunch break = 8 working hours)
  const workStartHour = 8;
  const workEndHour = 17;
  const lunchBreakHour = 12; // 12:00 PM lunch break
  
  const events = [];
  let currentDate = new Date(start);
  let dayCounter = 1;
  
  // If operation is within a single day, create one event
  if (start.toDateString() === end.toDateString()) {
    return [{
      ...baseEvent,
      title: `${partName} - ${machineName}`,
      startTime: startTime,
      endTime: endTime,
      notes: `Manufacturing operation (Single day)`
    }];
  }
  
  // Multi-day operation: break into daily events
  while (currentDate <= end) {
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    
    // Skip weekends
    if (isWeekend) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    // Calculate daily start and end times
    let dailyStart, dailyEnd;
    
    if (currentDate.toDateString() === start.toDateString()) {
      // First day: start at actual start time
      dailyStart = new Date(start);
    } else {
      // Subsequent days: start at work hours
      dailyStart = new Date(currentDate);
      dailyStart.setHours(workStartHour, 0, 0, 0);
    }
    
    if (currentDate.toDateString() === end.toDateString()) {
      // Last day: end at actual end time
      dailyEnd = new Date(end);
    } else {
      // Intermediate days: end at work hours
      dailyEnd = new Date(currentDate);
      dailyEnd.setHours(workEndHour, 0, 0, 0);
    }
    
    // Only create event if the daily end time is after the daily start time
    if (dailyEnd > dailyStart) {
      // Calculate total working days for this operation (for proper numbering)
      let totalWorkingDays = 0;
      let checkDate = new Date(start);
      while (checkDate <= end) {
        const isWorkingDay = checkDate.getDay() !== 0 && checkDate.getDay() !== 6; // Not weekend
        if (isWorkingDay) totalWorkingDays++;
        checkDate.setDate(checkDate.getDate() + 1);
      }
      
      // Create daily event
      const dailyEvent = {
        ...baseEvent,
        title: totalWorkingDays > 1 ? `${partName} - ${machineName} (Day ${dayCounter})` : `${partName} - ${machineName}`,
        startTime: dailyStart.toISOString(),
        endTime: dailyEnd.toISOString(),
        notes: totalWorkingDays > 1 
          ? `Manufacturing operation (Day ${dayCounter} of ${totalWorkingDays})` 
          : `Manufacturing operation`
      };
      
      events.push(dailyEvent);
      dayCounter++;
    }
    
    // Break if we've processed the end date
    if (currentDate.toDateString() === end.toDateString()) {
      break;
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return events;
}

/**
 * Get actual part name from job/offer data
 */
async function getPartNameFromJob(processInstanceId: string, offerId: string): Promise<string | null> {
  try {
    console.log(`🔍 Attempting to extract job ID from: ${processInstanceId}`);
    
    // Try multiple patterns to extract job ID
    let jobId = null;
    
    // Pattern 1: jobId-item-item-timestamp_processName_number (most common pattern)
    // Examples: "US79vk4atjm0GuwoYNWJ-item-item-1750060183938_turning_1"
    //          "US79vk4atjm0GuwoYNWJ-item-item-1750060183938_3-axis_milling_2"
    let match = processInstanceId.match(/^(.+?-item-item-\d+)_/);
    if (match) {
      jobId = match[1];
      console.log(`✅ Pattern 1 match: ${jobId}`);
    }
    
    // Pattern 2: Legacy pattern for older job IDs
    if (!jobId) {
      match = processInstanceId.match(/^(.+?)_[a-zA-Z]+_?\d*$/);
      if (match && !match[1].includes('-axis') && !match[1].includes('_milling')) {
        jobId = match[1];
        console.log(`✅ Pattern 2 match: ${jobId}`);
      }
    }
    
    // Pattern 3: Simple process names (e.g., "process_1", "process_2")
    if (!jobId && processInstanceId.startsWith('process_')) {
      console.log(`❌ Simple process name detected: ${processInstanceId}, cannot extract job ID`);
      return null;
    }
    
    if (!jobId) {
      console.log(`❌ No job ID pattern matched for: ${processInstanceId}`);
      return null;
    }
    
    // Try to get job data first
    const jobsRef = collection(db, 'jobs');
    const jobQuery = query(jobsRef, where('id', '==', jobId));
    const jobSnapshot = await getDocs(jobQuery);
    
    if (!jobSnapshot.empty) {
      const jobData = jobSnapshot.docs[0].data();
      return jobData.item?.partName || null;
    }
    
    // Fallback: try to get from order data
    if (offerId) {
      const ordersRef = collection(db, 'orders');
      const orderQuery = query(ordersRef, where('id', '==', offerId));
      const orderSnapshot = await getDocs(orderQuery);
      
      if (!orderSnapshot.empty) {
        const orderData = orderSnapshot.docs[0].data();
        return orderData.item?.partName || null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting part name from job:', error);
    return null;
  }
}

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
    
    // 3. Convert schedule entries to calendar events with dependency awareness
    const newEvents = [];
    let skippedWeekendOperations = 0;
    const scheduleEntries = scheduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sort by operation index and dependencies to maintain proper order
    const sortedEntries = scheduleEntries.sort((a: any, b: any) => {
      // First sort by job/order
      const jobCompare = (a.jobId || '').localeCompare(b.jobId || '');
      if (jobCompare !== 0) return jobCompare;
      
      // Then by operation index
      const aIndex = a.operationIndex || a.process?.operationIndex || 0;
      const bIndex = b.operationIndex || b.process?.operationIndex || 0;
      if (aIndex !== bIndex) return aIndex - bIndex;
      
      // Finally by start time
      const aStart = new Date(a.scheduledStartTime || a.startTime || 0);
      const bStart = new Date(b.scheduledStartTime || b.startTime || 0);
      return aStart.getTime() - bStart.getTime();
    });
    
    for (const scheduleData of sortedEntries) {
      const data = scheduleData as any; // Type assertion for Firestore data
      
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

      const startTime = convertToISOString(data.scheduledStartTime || data.startTime);
      const endTime = convertToISOString(data.scheduledEndTime || data.endTime);
      const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60));
      
      // Check if operation is scheduled on a weekend (0=Sunday, 6=Saturday)
      const startDate = new Date(startTime);
      const dayOfWeek = startDate.getDay();
      const workingDays = [1, 2, 3, 4, 5]; // Monday to Friday
      
      if (!workingDays.includes(dayOfWeek)) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        console.log(`⏭️ Skipping weekend operation: ${data.processName || 'Unknown'} scheduled on ${dayNames[dayOfWeek]} (${startDate.toLocaleDateString()})`);
        skippedWeekendOperations++;
        continue; // Skip this operation
      }
      
      // Get actual part name from job/offer data
      const actualPartName = await getPartNameFromJob(
        data.processInstanceId || data.jobId || '', 
        data.orderId || ''
      );
      
      // Extract operation name from process data
      const operationName = data.processName || data.process?.name || data.partName || 'Unknown Operation';
      
      // Use actual part name if found, otherwise fall back to operation name
      const partName = actualPartName || operationName;
      
      console.log(`🔍 Part name resolution for ${data.processInstanceId}: ${actualPartName ? `✅ ${actualPartName}` : `❌ fallback to ${partName}`}`);
      console.log(`🔧 Operation name: ${operationName}`);
      
      // Create base calendar event data
      const baseEvent = {
        type: 'manufacturing',
        machineId: data.machineId,
        machineName: data.machineName || 'Unknown Machine',
        partName: partName,
        operationName: operationName,
        jobId: data.processInstanceId || data.jobId,
        description: `Manufacturing operation: ${operationName} on ${partName} (Qty: ${data.quantity || 1})`,
        priority: 'medium',
        status: data.status === 'completed' ? 'completed' : 
                data.status === 'in_progress' ? 'in_progress' : 'scheduled',
        estimatedDuration: duration,
        quantity: data.quantity || 1,
        operationIndex: data.operationIndex || data.process?.operationIndex || 0,
        dependencies: data.dependencies || data.process?.dependencies || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create single event (no daily splitting for now)
      const calendarEvent = {
        ...baseEvent,
        title: `${operationName} - ${partName}`,
        startTime: startTime,
        endTime: endTime,
        notes: `Manufacturing operation - Single event`
      };
      
      // Add to calendar events collection
      const calendarEventRef = await addDoc(calendarEventsRef, calendarEvent);
      newEvents.push({ id: calendarEventRef.id, ...calendarEvent });
      
      console.log(`✅ Created calendar event: ${calendarEvent.title} | Start: ${new Date(calendarEvent.startTime).toLocaleString()} | Machine: ${calendarEvent.machineName}`);
    }
    
    console.log(`🎉 Sync completed! Created ${newEvents.length} calendar events`);
    if (skippedWeekendOperations > 0) {
      console.log(`⏭️ Skipped ${skippedWeekendOperations} weekend operations (weekends not supported for manufacturing)`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Schedule sync completed successfully',
      eventsCreated: newEvents.length,
      skippedWeekendOperations: skippedWeekendOperations,
      totalProcessed: scheduleEntries.length,
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