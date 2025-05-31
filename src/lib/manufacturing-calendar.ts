import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  writeBatch 
} from 'firebase/firestore';
import type { 
  CalendarEvent, 
  CalendarEventType, 
  DayView, 
  WeekView, 
  MachineCalendarData, 
  TimeSlot, 
  WeeklyStats, 
  CalendarFilter, 
  CalendarSettings, 
  EventForm, 
  ConflictDetection, 
  CalendarConflict, 
  DragDropEvent 
} from '@/types/manufacturing-calendar';
import type { Machine } from '@/types/planning';

// === Calendar Event Management ===

export async function createCalendarEvent(eventData: EventForm): Promise<string> {
  try {
    const now = new Date().toISOString();
    
    const calendarEvent: Omit<CalendarEvent, 'id'> = {
      title: eventData.title,
      type: eventData.type,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      machineId: eventData.machineId,
      operatorId: eventData.operatorId,
      jobId: eventData.jobId,
      taskId: eventData.taskId,
      description: eventData.description,
      priority: eventData.priority,
      status: 'scheduled',
      notes: eventData.notes,
      estimatedDuration: calculateDuration(eventData.startTime, eventData.endTime),
      createdAt: now,
      updatedAt: now
    };
    
    // Add machine name if machineId provided
    if (eventData.machineId) {
      const machine = await getMachineById(eventData.machineId);
      if (machine) {
        calendarEvent.machineName = machine.name;
      }
    }
    
    const docRef = await addDoc(collection(db, 'calendarEvents'), calendarEvent);
    return docRef.id;
    
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw new Error('Failed to create calendar event');
  }
}

export async function updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
  try {
    const eventRef = doc(db, 'calendarEvents', eventId);
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Recalculate duration if times changed
    if (updates.startTime || updates.endTime) {
      const existingEvent = await getCalendarEvent(eventId);
      const startTime = updates.startTime || existingEvent?.startTime;
      const endTime = updates.endTime || existingEvent?.endTime;
      
      if (startTime && endTime) {
        updateData.estimatedDuration = calculateDuration(startTime, endTime);
      }
    }
    
    await updateDoc(eventRef, updateData);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw new Error('Failed to update calendar event');
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'calendarEvents', eventId));
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw new Error('Failed to delete calendar event');
  }
}

export async function getCalendarEvent(eventId: string): Promise<CalendarEvent | null> {
  try {
    const eventDoc = await getDoc(doc(db, 'calendarEvents', eventId));
    
    if (!eventDoc.exists()) {
      return null;
    }
    
    return { id: eventDoc.id, ...eventDoc.data() } as CalendarEvent;
  } catch (error) {
    console.error('Error getting calendar event:', error);
    return null;
  }
}

// === Calendar Views ===

export async function getDayView(date: Date, filter?: CalendarFilter): Promise<DayView> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const events = await getCalendarEvents(startOfDay, endOfDay, filter);
    const machines = await getMachineCalendarData(startOfDay, endOfDay, filter?.machineIds);
    
    return {
      date,
      events,
      workingHours: {
        start: '08:00',
        end: '17:00'
      },
      machines
    };
  } catch (error) {
    console.error('Error getting day view:', error);
    throw new Error('Failed to load day view');
  }
}

export async function getWeekView(weekStart: Date, filter?: CalendarFilter): Promise<WeekView> {
  try {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Generate days for the week
    const days: DayView[] = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + i);
      
      const dayView = await getDayView(currentDate, filter);
      days.push(dayView);
    }
    
    // Calculate weekly statistics
    const weeklyStats = calculateWeeklyStats(days);
    
    return {
      weekStart,
      weekEnd,
      days,
      weeklyStats
    };
  } catch (error) {
    console.error('Error getting week view:', error);
    throw new Error('Failed to load week view');
  }
}

export async function getCalendarEvents(
  startDate: Date, 
  endDate: Date, 
  filter?: CalendarFilter
): Promise<CalendarEvent[]> {
  try {
    let q = query(
      collection(db, 'calendarEvents'),
      where('startTime', '>=', startDate.toISOString()),
      where('startTime', '<=', endDate.toISOString()),
      orderBy('startTime', 'asc')
    );
    
    const snapshot = await getDocs(q);
    let events: CalendarEvent[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CalendarEvent[];
    
    // Apply additional filters
    if (filter) {
      events = applyCalendarFilter(events, filter);
    }
    
    return events;
  } catch (error) {
    console.error('Error getting calendar events:', error);
    throw new Error('Failed to load calendar events');
  }
}

// === Machine Calendar Management ===

export async function getMachineCalendarData(
  startDate: Date, 
  endDate: Date, 
  machineIds?: string[]
): Promise<MachineCalendarData[]> {
  try {
    // Get all machines or filtered machines
    const machines = await getMachines(machineIds);
    const machineCalendarData: MachineCalendarData[] = [];
    
    for (const machine of machines) {
      // Get events for this machine
      const machineEvents = await getCalendarEvents(startDate, endDate, {
        machineIds: [machine.id]
      });
      
      // Calculate utilization
      const utilization = calculateMachineUtilization(machineEvents, startDate, endDate);
      
      // Generate available slots
      const availableSlots = generateAvailableSlots(machine, machineEvents, startDate, endDate);
      
      // Get maintenance windows
      const maintenanceWindows = await getMachineMaintenanceWindows(machine.id, startDate, endDate);
      
      machineCalendarData.push({
        machineId: machine.id,
        machineName: machine.name,
        machineType: machine.type,
        isActive: machine.isActive,
        events: machineEvents,
        utilization,
        availableSlots,
        maintenanceWindows
      });
    }
    
    return machineCalendarData;
  } catch (error) {
    console.error('Error getting machine calendar data:', error);
    throw new Error('Failed to load machine calendar data');
  }
}

// === Conflict Detection ===

export async function detectConflicts(eventForm: EventForm): Promise<ConflictDetection> {
  try {
    const conflicts: CalendarConflict[] = [];
    
    // Check machine availability
    if (eventForm.machineId) {
      const machineConflicts = await checkMachineConflicts(
        eventForm.machineId,
        eventForm.startTime,
        eventForm.endTime
      );
      conflicts.push(...machineConflicts);
    }
    
    // Check operator availability
    if (eventForm.operatorId) {
      const operatorConflicts = await checkOperatorConflicts(
        eventForm.operatorId,
        eventForm.startTime,
        eventForm.endTime
      );
      conflicts.push(...operatorConflicts);
    }
    
    // Check maintenance windows
    if (eventForm.machineId) {
      const maintenanceConflicts = await checkMaintenanceConflicts(
        eventForm.machineId,
        eventForm.startTime,
        eventForm.endTime
      );
      conflicts.push(...maintenanceConflicts);
    }
    
    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    return { hasConflicts: false, conflicts: [] };
  }
}

// === Drag and Drop Operations ===

export async function moveCalendarEvent(dragEvent: DragDropEvent): Promise<ConflictDetection> {
  try {
    // First check for conflicts in the new time slot
    const existingEvent = await getCalendarEvent(dragEvent.eventId);
    if (!existingEvent) {
      throw new Error('Event not found');
    }
    
    const eventForm: EventForm = {
      title: existingEvent.title,
      type: existingEvent.type,
      startTime: dragEvent.newStartTime,
      endTime: dragEvent.newEndTime,
      machineId: dragEvent.newMachineId || existingEvent.machineId,
      operatorId: existingEvent.operatorId,
      description: existingEvent.description,
      priority: existingEvent.priority,
      jobId: existingEvent.jobId,
      taskId: existingEvent.taskId,
      notes: existingEvent.notes
    };
    
    const conflictCheck = await detectConflicts(eventForm);
    
    if (!conflictCheck.hasConflicts) {
      // No conflicts, perform the move
      const updates: Partial<CalendarEvent> = {
        startTime: dragEvent.newStartTime,
        endTime: dragEvent.newEndTime,
        machineId: dragEvent.newMachineId || existingEvent.machineId
      };
      
      // Update machine name if machine changed
      if (dragEvent.newMachineId && dragEvent.newMachineId !== existingEvent.machineId) {
        const machine = await getMachineById(dragEvent.newMachineId);
        if (machine) {
          updates.machineName = machine.name;
        }
      }
      
      await updateCalendarEvent(dragEvent.eventId, updates);
    }
    
    return conflictCheck;
  } catch (error) {
    console.error('Error moving calendar event:', error);
    throw new Error('Failed to move calendar event');
  }
}

// === Utility Functions ===

function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
}

function calculateMachineUtilization(
  events: CalendarEvent[], 
  startDate: Date, 
  endDate: Date
): number {
  const totalPeriod = endDate.getTime() - startDate.getTime();
  
  const busyTime = events
    .filter(event => event.type === 'manufacturing' || event.type === 'setup')
    .reduce((total, event) => {
      const eventStart = Math.max(new Date(event.startTime).getTime(), startDate.getTime());
      const eventEnd = Math.min(new Date(event.endTime).getTime(), endDate.getTime());
      return total + Math.max(0, eventEnd - eventStart);
    }, 0);
  
  return Math.round((busyTime / totalPeriod) * 100);
}

function generateAvailableSlots(
  machine: Machine, 
  events: CalendarEvent[], 
  startDate: Date, 
  endDate: Date
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const workingHours = machine.workingHours || { start: '08:00', end: '17:00' };
  
  // Generate daily slots
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate);
    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
    dayStart.setHours(startHour, startMinute, 0, 0);
    
    const dayEnd = new Date(currentDate);
    const [endHour, endMinute] = workingHours.end.split(':').map(Number);
    dayEnd.setHours(endHour, endMinute, 0, 0);
    
    // Check for conflicts with existing events
    const dayEvents = events.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      return eventStart < dayEnd && eventEnd > dayStart;
    });
    
    if (dayEvents.length === 0) {
      // Entire day is available
      slots.push({
        start: dayStart.toISOString(),
        end: dayEnd.toISOString(),
        isAvailable: true
      });
    } else {
      // Generate slots between events
      const sortedEvents = dayEvents.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      
      let slotStart = dayStart;
      
      for (const event of sortedEvents) {
        const eventStart = new Date(event.startTime);
        
        if (slotStart < eventStart) {
          slots.push({
            start: slotStart.toISOString(),
            end: eventStart.toISOString(),
            isAvailable: true
          });
        }
        
        slotStart = new Date(event.endTime);
      }
      
      // Add final slot if there's time left
      if (slotStart < dayEnd) {
        slots.push({
          start: slotStart.toISOString(),
          end: dayEnd.toISOString(),
          isAvailable: true
        });
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return slots;
}

function calculateWeeklyStats(days: DayView[]): WeeklyStats {
  let totalEvents = 0;
  let manufacturingEvents = 0;
  let maintenanceEvents = 0;
  let completedEvents = 0;
  let delayedEvents = 0;
  const machineUtilization: Record<string, number> = {};
  
  days.forEach(day => {
    totalEvents += day.events.length;
    
    day.events.forEach(event => {
      if (event.type === 'manufacturing') manufacturingEvents++;
      if (event.type === 'maintenance') maintenanceEvents++;
      if (event.status === 'completed') completedEvents++;
      if (event.status === 'delayed') delayedEvents++;
    });
    
    day.machines.forEach(machine => {
      if (!machineUtilization[machine.machineId]) {
        machineUtilization[machine.machineId] = 0;
      }
      machineUtilization[machine.machineId] += machine.utilization;
    });
  });
  
  // Average machine utilization across the week
  Object.keys(machineUtilization).forEach(machineId => {
    machineUtilization[machineId] = Math.round(machineUtilization[machineId] / 7);
  });
  
  const averageUtilization = Object.values(machineUtilization).reduce((sum, util) => sum + util, 0) / 
    Math.max(1, Object.keys(machineUtilization).length);
  
  return {
    totalEvents,
    manufacturingEvents,
    maintenanceEvents,
    averageUtilization: Math.round(averageUtilization),
    completedEvents,
    delayedEvents,
    machineUtilization
  };
}

function applyCalendarFilter(events: CalendarEvent[], filter: CalendarFilter): CalendarEvent[] {
  return events.filter(event => {
    if (filter.machineIds && filter.machineIds.length > 0) {
      if (!event.machineId || !filter.machineIds.includes(event.machineId)) {
        return false;
      }
    }
    
    if (filter.eventTypes && filter.eventTypes.length > 0) {
      if (!filter.eventTypes.includes(event.type)) {
        return false;
      }
    }
    
    if (filter.operators && filter.operators.length > 0) {
      if (!event.operatorId || !filter.operators.includes(event.operatorId)) {
        return false;
      }
    }
    
    if (filter.priorities && filter.priorities.length > 0) {
      if (!filter.priorities.includes(event.priority)) {
        return false;
      }
    }
    
    if (filter.statuses && filter.statuses.length > 0) {
      if (!filter.statuses.includes(event.status)) {
        return false;
      }
    }
    
    if (filter.jobIds && filter.jobIds.length > 0) {
      if (!event.jobId || !filter.jobIds.includes(event.jobId)) {
        return false;
      }
    }
    
    return true;
  });
}

// === Helper Functions ===

async function getMachines(machineIds?: string[]): Promise<Machine[]> {
  try {
    let snapshot;
    
    if (machineIds && machineIds.length > 0) {
      const q = query(collection(db, 'machines'), where('__name__', 'in', machineIds));
      snapshot = await getDocs(q);
    } else {
      snapshot = await getDocs(collection(db, 'machines'));
    }
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Machine[];
  } catch (error) {
    console.error('Error getting machines:', error);
    return [];
  }
}

async function getMachineById(machineId: string): Promise<Machine | null> {
  try {
    const machineDoc = await getDoc(doc(db, 'machines', machineId));
    if (!machineDoc.exists()) return null;
    
    return { id: machineDoc.id, ...machineDoc.data() } as Machine;
  } catch (error) {
    console.error('Error getting machine:', error);
    return null;
  }
}

async function getMachineMaintenanceWindows(
  machineId: string, 
  startDate: Date, 
  endDate: Date
): Promise<TimeSlot[]> {
  try {
    // Get maintenance events for this machine
    const maintenanceEvents = await getCalendarEvents(startDate, endDate, {
      machineIds: [machineId],
      eventTypes: ['maintenance']
    });
    
    return maintenanceEvents.map(event => ({
      start: event.startTime,
      end: event.endTime,
      isAvailable: false,
      reason: 'maintenance'
    }));
  } catch (error) {
    console.error('Error getting maintenance windows:', error);
    return [];
  }
}

async function checkMachineConflicts(
  machineId: string, 
  startTime: string, 
  endTime: string
): Promise<CalendarConflict[]> {
  const conflicts: CalendarConflict[] = [];
  
  try {
    const existingEvents = await getCalendarEvents(
      new Date(startTime), 
      new Date(endTime), 
      { machineIds: [machineId] }
    );
    
    const conflictingEvents = existingEvents.filter(event => 
      new Date(event.startTime) < new Date(endTime) && 
      new Date(event.endTime) > new Date(startTime)
    );
    
    conflictingEvents.forEach(event => {
      conflicts.push({
        type: 'machine_busy',
        message: `Machine ${event.machineName} is busy with "${event.title}"`,
        conflictingEventId: event.id
      });
    });
  } catch (error) {
    console.error('Error checking machine conflicts:', error);
  }
  
  return conflicts;
}

async function checkOperatorConflicts(
  operatorId: string, 
  startTime: string, 
  endTime: string
): Promise<CalendarConflict[]> {
  const conflicts: CalendarConflict[] = [];
  
  try {
    const existingEvents = await getCalendarEvents(
      new Date(startTime), 
      new Date(endTime), 
      { operators: [operatorId] }
    );
    
    const conflictingEvents = existingEvents.filter(event => 
      new Date(event.startTime) < new Date(endTime) && 
      new Date(event.endTime) > new Date(startTime)
    );
    
    conflictingEvents.forEach(event => {
      conflicts.push({
        type: 'operator_busy',
        message: `Operator is already assigned to "${event.title}"`,
        conflictingEventId: event.id
      });
    });
  } catch (error) {
    console.error('Error checking operator conflicts:', error);
  }
  
  return conflicts;
}

async function checkMaintenanceConflicts(
  machineId: string, 
  startTime: string, 
  endTime: string
): Promise<CalendarConflict[]> {
  const conflicts: CalendarConflict[] = [];
  
  try {
    const maintenanceWindows = await getMachineMaintenanceWindows(
      machineId, 
      new Date(startTime), 
      new Date(endTime)
    );
    
    maintenanceWindows.forEach(window => {
      if (new Date(window.start) < new Date(endTime) && 
          new Date(window.end) > new Date(startTime)) {
        conflicts.push({
          type: 'maintenance_window',
          message: `Machine has scheduled maintenance during this time`
        });
      }
    });
  } catch (error) {
    console.error('Error checking maintenance conflicts:', error);
  }
  
  return conflicts;
}

// === Default Calendar Settings ===

export const defaultCalendarSettings: CalendarSettings = {
  workingHours: {
    start: '08:00',
    end: '17:00'
  },
  workingDays: [1, 2, 3, 4, 5], // Monday to Friday
  timeZone: 'Europe/Istanbul',
  defaultView: 'week',
  refreshInterval: 60, // 1 minute
  showWeekends: false,
  colorScheme: {
    manufacturing: '#3b82f6', // blue
    maintenance: '#f59e0b', // amber
    setup: '#8b5cf6', // violet
    quality_check: '#10b981', // emerald
    meeting: '#6b7280', // gray
    training: '#06b6d4', // cyan
    break: '#84cc16', // lime
    other: '#64748b' // slate
  }
}; 