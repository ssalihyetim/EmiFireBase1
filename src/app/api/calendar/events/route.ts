import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { events } = await request.json();
    
    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid events array' },
        { status: 400 }
      );
    }

    console.log(`📅 Creating ${events.length} calendar events...`);
    
    const calendarEventsRef = collection(db, 'calendarEvents');
    const createdEvents = [];
    
    for (const event of events) {
      try {
        const calendarEvent = {
          type: event.type || 'job',
          title: event.title,
          description: event.description || '',
          startTime: Timestamp.fromDate(new Date(event.startTime)),
          endTime: Timestamp.fromDate(new Date(event.endTime)),
          machineId: event.machineId || null,
          operatorId: event.operatorId || null,
          jobId: event.jobId || null,
          taskId: event.taskId || null,
          status: event.status || 'scheduled',
          priority: event.priority || 'medium',
          color: event.color || '#3b82f6',
          isRecurring: false,
          location: null,
          attendees: [],
          notes: event.notes || '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        
        const docRef = await addDoc(calendarEventsRef, calendarEvent);
        createdEvents.push({ id: docRef.id, ...calendarEvent });
        
        console.log(`✅ Created calendar event: ${event.title}`);
      } catch (eventError) {
        console.error(`❌ Failed to create event "${event.title}":`, eventError);
      }
    }
    
    console.log(`🎉 Successfully created ${createdEvents.length}/${events.length} calendar events`);
    
    return NextResponse.json({
      success: true,
      eventsCreated: createdEvents.length,
      totalRequested: events.length,
      events: createdEvents,
      message: `Created ${createdEvents.length} calendar events`
    });
    
  } catch (error) {
    console.error('❌ Calendar events creation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create calendar events',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 