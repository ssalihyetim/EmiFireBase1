import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, getDocs, query, where } from "firebase/firestore";

export async function POST() {
  try {
    console.log('🧹 Cleaning existing test calendar events...');
    
    // Clear existing test calendar events
    const calendarRef = collection(db, 'calendarEvents');
    const existingEvents = await getDocs(query(calendarRef, where('notes', '==', 'Test operation from API')));
    
    for (const doc of existingEvents.docs) {
      await deleteDoc(doc.ref);
    }
    
    console.log(`✅ Cleared ${existingEvents.docs.length} existing test events`);
    
    console.log('📦 Creating test calendar events with part names...');
    
    // Create test calendar events with proper part names (using current dates)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const testEvents = [
      {
        title: 'Bearing Housing - CNC Mill 1',
        partName: 'Bearing Housing',
        type: 'manufacturing',
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0).toISOString(),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0).toISOString(),
        machineId: 'machine-mill-1',
        machineName: 'CNC Mill 1',
        jobId: 'job-001',
        description: 'Manufacturing operation: Bearing Housing (Qty: 10)',
        priority: 'medium',
        status: 'scheduled',
        estimatedDuration: 240,
        quantity: 10,
        operationIndex: 1,
        dependencies: [],
        notes: 'Test operation from API',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        title: 'Shaft Assembly - Lathe 2',
        partName: 'Shaft Assembly',
        type: 'manufacturing',
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0).toISOString(),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0).toISOString(),
        machineId: 'machine-lathe-2',
        machineName: 'Lathe 2',
        jobId: 'job-002',
        description: 'Manufacturing operation: Shaft Assembly (Qty: 5)',
        priority: 'high',
        status: 'scheduled',
        estimatedDuration: 240,
        quantity: 5,
        operationIndex: 1,
        dependencies: [],
        notes: 'Test operation from API',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        title: 'Cover Plate - 5-Axis Mill',
        partName: 'Cover Plate',
        type: 'manufacturing',
        startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 8, 0).toISOString(),
        endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 16, 0).toISOString(),
        machineId: 'machine-5axis-1',
        machineName: '5-Axis Mill',
        jobId: 'job-003',
        description: 'Manufacturing operation: Cover Plate (Qty: 25)',
        priority: 'medium',
        status: 'scheduled',
        estimatedDuration: 480,
        quantity: 25,
        operationIndex: 1,
        dependencies: [],
        notes: 'Test operation from API',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        title: 'Flange Connector - CNC Mill 1',
        partName: 'Flange Connector',
        type: 'manufacturing',
        startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 0).toISOString(),
        endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 15, 0).toISOString(),
        machineId: 'machine-mill-1',
        machineName: 'CNC Mill 1',
        jobId: 'job-004',
        description: 'Manufacturing operation: Flange Connector (Qty: 15)',
        priority: 'low',
        status: 'scheduled',
        estimatedDuration: 360,
        quantity: 15,
        operationIndex: 1,
        dependencies: [],
        notes: 'Test operation from API',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    const createdEvents = [];
    for (const eventData of testEvents) {
      const docRef = await addDoc(calendarRef, eventData);
      createdEvents.push({ id: docRef.id, ...eventData });
      console.log(`✅ Created: ${eventData.partName} - ${eventData.machineName}`);
    }
    
    console.log(`🎉 Successfully created ${createdEvents.length} test calendar events!`);
    
    return NextResponse.json({
      success: true,
      message: 'Test calendar data created successfully',
      eventsCreated: createdEvents.length,
      events: createdEvents.map(e => ({
        id: e.id,
        partName: e.partName,
        machineName: e.machineName,
        quantity: e.quantity,
        startTime: e.startTime
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create test data',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 