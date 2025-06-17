import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

export async function GET() {
  try {
    console.log('🔍 Debugging calendar events in database...');
    
    // Get all calendar events
    const calendarRef = collection(db, 'calendarEvents');
    const calendarQuery = query(calendarRef, orderBy('startTime', 'asc'));
    const snapshot = await getDocs(calendarQuery);
    
    console.log(`📊 Found ${snapshot.docs.length} total calendar events in database`);
    
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        partName: data.partName,
        type: data.type,
        startTime: data.startTime,
        endTime: data.endTime,
        machineName: data.machineName,
        machineId: data.machineId,
        quantity: data.quantity,
        notes: data.notes
      };
    });
    
    // Group by date (safely)
    const eventsByDate = events.reduce((acc, event) => {
      const parsedDate = safeDateParse(event.startTime);
      const dateKey = parsedDate && !isNaN(parsedDate.getTime()) 
        ? parsedDate.toDateString() 
        : 'Invalid Date';
      
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push({
        ...event,
        parsedStartTime: parsedDate ? parsedDate.toISOString() : 'Invalid',
        originalStartTime: event.startTime
      });
      return acc;
    }, {} as Record<string, any[]>);
    
    // Group by machine
    const eventsByMachine = events.reduce((acc, event) => {
      const machine = event.machineName || 'Unknown';
      if (!acc[machine]) acc[machine] = [];
      acc[machine].push(event);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Helper function to safely parse dates
    const safeDateParse = (dateValue: any): Date | null => {
      if (!dateValue) return null;
      
      try {
        // If it's already a Date object
        if (dateValue instanceof Date) return dateValue;
        
        // If it's a string
        if (typeof dateValue === 'string') return new Date(dateValue);
        
        // If it's a Firestore Timestamp
        if (dateValue && typeof dateValue.toDate === 'function') {
          return dateValue.toDate();
        }
        
        // If it's a seconds/nanoseconds object
        if (dateValue && typeof dateValue === 'object' && 'seconds' in dateValue) {
          return new Date(dateValue.seconds * 1000);
        }
        
        return null;
      } catch (error) {
        console.error('Error parsing date:', dateValue, error);
        return null;
      }
    };
    
    // Get valid dates for range calculation
    const validDates = events
      .map(e => safeDateParse(e.startTime))
      .filter(date => date && !isNaN(date.getTime()))
      .map(date => date!.getTime());
    
    // Statistics
    const stats = {
      totalEvents: events.length,
      eventsWithPartName: events.filter(e => e.partName).length,
      eventsWithTitleOnly: events.filter(e => !e.partName && e.title).length,
      manufacturingEvents: events.filter(e => e.type === 'manufacturing').length,
      testEvents: events.filter(e => e.notes?.includes('Test operation')).length,
      uniqueMachines: Object.keys(eventsByMachine).length,
      validDates: validDates.length,
      invalidDates: events.length - validDates.length,
      dateRange: validDates.length > 0 ? {
        earliest: new Date(Math.min(...validDates)).toISOString(),
        latest: new Date(Math.max(...validDates)).toISOString()
      } : null
    };
    
    return NextResponse.json({
      success: true,
      message: 'Calendar events debug information',
      stats,
      eventsByDate,
      eventsByMachine,
      allEvents: events,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error debugging calendar events:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to debug calendar events',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 