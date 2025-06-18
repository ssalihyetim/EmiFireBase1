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
  CalendarConflict 
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
      partName: (eventData as any).partName, // Add partName support
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
    
    const allEvents = await getCalendarEvents(startOfDay, endOfDay, filter);
    const allMachines = await getMachineCalendarData(startOfDay, endOfDay, filter?.machineIds);
    
    // Filter out manufacturing operations on weekends
    const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const events = isWeekend ? allEvents.filter(event => event.type !== 'manufacturing') : allEvents;
    const machines = isWeekend ? 
      allMachines.map(machine => ({
        ...machine,
        events: machine.events.filter(event => event.type !== 'manufacturing')
      })) : allMachines;

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
    
    // Fetch all events for the entire week in one query (much more efficient)
    const weekEvents = await getCalendarEvents(weekStart, weekEnd, filter);
    const weekMachines = await getMachineCalendarData(weekStart, weekEnd, filter?.machineIds);
    
    // Generate days for the week and distribute events
    const days: DayView[] = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + i);
      
      // Filter events for this specific day (including multi-day events that span through this date)
      // But exclude weekends for manufacturing operations
      const dayOfWeek = currentDate.getDay(); // 0=Sunday, 6=Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const dayEvents = weekEvents.filter(event => {
        // Skip manufacturing operations on weekends
        if (isWeekend && event.type === 'manufacturing') {
          return false;
        }
        
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        
        // Set the date boundaries for comparison (start of day to end of day)
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Event spans through this date if:
        // 1. Event starts on this date, OR
        // 2. Event ends on this date, OR  
        // 3. Event starts before this date and ends after this date (spans through)
        return (
          (eventStart >= dayStart && eventStart <= dayEnd) ||           // Starts on this date
          (eventEnd >= dayStart && eventEnd <= dayEnd) ||               // Ends on this date
          (eventStart <= dayStart && eventEnd >= dayEnd)                // Spans through this date
        );
      });
      
      // Filter machines for this day (events filtered by day with multi-day support)
      // But exclude weekends for manufacturing operations
      const dayMachines = weekMachines.map(machine => ({
        ...machine,
        events: machine.events.filter(event => {
          // Skip manufacturing operations on weekends
          if (isWeekend && event.type === 'manufacturing') {
            return false;
          }
          
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          
          // Set the date boundaries for comparison (start of day to end of day)
          const dayStart = new Date(currentDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(23, 59, 59, 999);
          
          // Event spans through this date if:
          // 1. Event starts on this date, OR
          // 2. Event ends on this date, OR  
          // 3. Event starts before this date and ends after this date (spans through)
          return (
            (eventStart >= dayStart && eventStart <= dayEnd) ||           // Starts on this date
            (eventEnd >= dayStart && eventEnd <= dayEnd) ||               // Ends on this date
            (eventStart <= dayStart && eventEnd >= dayEnd)                // Spans through this date
          );
        })
      }));
      
      // Create day view without additional database calls
      const dayView: DayView = {
        date: currentDate,
        events: dayEvents,
        workingHours: {
          start: '08:00',
          end: '17:00'
        },
        machines: dayMachines
      };
      
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
    // Ensure proper date boundaries
    const queryStartDate = new Date(startDate);
    queryStartDate.setHours(0, 0, 0, 0);
    const queryEndDate = new Date(endDate);
    queryEndDate.setHours(23, 59, 59, 999);
    
    // Since Firestore doesn't support OR queries easily, we need to get all events
    // and filter them client-side to find events that overlap with our date range
    let q = query(
      collection(db, 'calendarEvents'),
      orderBy('startTime', 'asc')
    );
    
    const snapshot = await getDocs(q);
    let events: CalendarEvent[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CalendarEvent[];
    
    // Filter events that overlap with our date range
    events = events.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      
      // Event overlaps with query range if:
      // 1. Event starts within the range, OR
      // 2. Event ends within the range, OR
      // 3. Event starts before and ends after the range (spans the entire range)
      return (
        (eventStart >= queryStartDate && eventStart <= queryEndDate) ||     // Starts in range
        (eventEnd >= queryStartDate && eventEnd <= queryEndDate) ||         // Ends in range
        (eventStart <= queryStartDate && eventEnd >= queryEndDate)          // Spans entire range
      );
    });
    
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
    
    // Get all events once instead of per machine (much more efficient!)
    const allEvents = await getCalendarEvents(startDate, endDate);
    
    const machineCalendarData: MachineCalendarData[] = [];
    
    for (const machine of machines) {
      // Filter events for this machine from the already loaded events
      const machineEvents = allEvents.filter(event => event.machineId === machine.id);
      
      // Calculate utilization
      const utilization = calculateMachineUtilization(machineEvents, startDate, endDate);
      
      // Generate available slots
      const availableSlots = generateAvailableSlots(machine, machineEvents, startDate, endDate);
      
      // Get maintenance windows (keep this async call as it's a different query)
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

// === Multi-Day Operation Handling ===

/**
 * Split long operations across multiple days considering working hours
 */
export function splitOperationAcrossDays(
  event: CalendarEvent,
  workingHours: { start: string; end: string } = { start: '08:00', end: '17:00' }
): CalendarEvent[] {
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  const totalDuration = endTime.getTime() - startTime.getTime();
  
  // If operation fits within a single working day, return as is
  const workingDayMs = calculateWorkingDayDuration(workingHours);
  if (totalDuration <= workingDayMs) {
    return [event];
  }
  
  const splitEvents: CalendarEvent[] = [];
  let currentStart = new Date(startTime);
  let remainingDuration = totalDuration;
  let dayIndex = 1;
  
  while (remainingDuration > 0) {
    // Calculate working day boundaries
    const dayStart = new Date(currentStart);
    dayStart.setHours(parseInt(workingHours.start.split(':')[0]), parseInt(workingHours.start.split(':')[1]), 0, 0);
    
    const dayEnd = new Date(currentStart);
    dayEnd.setHours(parseInt(workingHours.end.split(':')[0]), parseInt(workingHours.end.split(':')[1]), 0, 0);
    
    // If current start is before working hours, adjust to start of working day
    if (currentStart < dayStart) {
      currentStart = new Date(dayStart);
    }
    
    // Calculate how much time we can allocate to this day
    const availableTimeThisDay = Math.min(remainingDuration, dayEnd.getTime() - currentStart.getTime());
    const dayEndTime = new Date(currentStart.getTime() + availableTimeThisDay);
    
    // Create event for this day
    const dayEvent: CalendarEvent = {
      ...event,
      id: `${event.id}_day_${dayIndex}`,
      title: `${event.title} (Day ${dayIndex})`,
      startTime: currentStart.toISOString(),
      endTime: dayEndTime.toISOString(),
      estimatedDuration: Math.round(availableTimeThisDay / (1000 * 60)),
      notes: `${event.notes || ''} - Multi-day operation part ${dayIndex}`,
      isMultiDay: true,
      originalEventId: event.id,
      dayIndex: dayIndex,
      totalDays: Math.ceil(totalDuration / workingDayMs)
    };
    
    splitEvents.push(dayEvent);
    
    // Move to next working day
    remainingDuration -= availableTimeThisDay;
    currentStart = getNextWorkingDay(currentStart);
    dayIndex++;
    
    // Safety check to prevent infinite loops
    if (dayIndex > 30) {
      console.warn('Operation spans more than 30 days, truncating');
      break;
    }
  }
  
  return splitEvents;
}

/**
 * Calculate working day duration in milliseconds
 */
function calculateWorkingDayDuration(workingHours: { start: string; end: string }): number {
  const startHour = parseInt(workingHours.start.split(':')[0]);
  const startMinute = parseInt(workingHours.start.split(':')[1]);
  const endHour = parseInt(workingHours.end.split(':')[0]);
  const endMinute = parseInt(workingHours.end.split(':')[1]);
  
  const startMs = (startHour * 60 + startMinute) * 60 * 1000;
  const endMs = (endHour * 60 + endMinute) * 60 * 1000;
  
  return endMs - startMs;
}

/**
 * Get next working day (skip weekends)
 */
function getNextWorkingDay(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  nextDay.setHours(8, 0, 0, 0); // Start at 8 AM
  
  // Skip weekends
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

/**
 * Enhanced calendar events retrieval that includes multi-day operations
 */
export async function getCalendarEventsWithMultiDay(
  startDate: Date, 
  endDate: Date, 
  filter?: CalendarFilter
): Promise<CalendarEvent[]> {
  try {
    // Get base events
    const baseEvents = await getCalendarEvents(startDate, endDate, filter);
    const enhancedEvents: CalendarEvent[] = [];
    
    for (const event of baseEvents) {
      // Check if this event spans multiple days
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      const eventDuration = eventEnd.getTime() - eventStart.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      if (eventDuration > oneDayMs || eventStart.toDateString() !== eventEnd.toDateString()) {
        // Split across multiple days
        const splitEvents = splitOperationAcrossDays(event);
        
        // Only include events that fall within our query range
        const relevantEvents = splitEvents.filter(splitEvent => {
          const splitStart = new Date(splitEvent.startTime);
          const splitEnd = new Date(splitEvent.endTime);
          return (splitStart >= startDate && splitStart <= endDate) ||
                 (splitEnd >= startDate && splitEnd <= endDate) ||
                 (splitStart <= startDate && splitEnd >= endDate);
        });
        
        enhancedEvents.push(...relevantEvents);
      } else {
        enhancedEvents.push(event);
      }
    }
    
    return enhancedEvents;
  } catch (error) {
    console.error('Error getting calendar events with multi-day support:', error);
    throw new Error('Failed to load calendar events');
  }
}

// === Dependency-Aware Calendar Management ===

/**
 * Sort calendar events by dependency order
 */
export function sortEventsByDependencies(events: CalendarEvent[]): CalendarEvent[] {
  // Create a map of events by job/task for dependency analysis
  const eventsByJob = new Map<string, CalendarEvent[]>();
  
  events.forEach(event => {
    if (event.jobId) {
      const jobEvents = eventsByJob.get(event.jobId) || [];
      jobEvents.push(event);
      eventsByJob.set(event.jobId, jobEvents);
    }
  });
  
  const sortedEvents: CalendarEvent[] = [];
  
  // Sort events within each job by operation order
  eventsByJob.forEach((jobEvents, jobId) => {
    // Sort by start time and operation index if available
    const sortedJobEvents = jobEvents.sort((a, b) => {
      // First sort by operation index if available
      const aIndex = (a as any).operationIndex || 0;
      const bIndex = (b as any).operationIndex || 0;
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      
      // Then by start time
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
    
    sortedEvents.push(...sortedJobEvents);
  });
  
  // Add events without job IDs at the end
  const eventsWithoutJobs = events.filter(event => !event.jobId);
  sortedEvents.push(...eventsWithoutJobs);
  
  return sortedEvents;
}

/**
 * Validate operation dependencies in calendar
 */
export function validateOperationDependencies(events: CalendarEvent[]): {
  isValid: boolean;
  violations: Array<{
    event: CalendarEvent;
    issue: string;
    suggestion: string;
  }>;
} {
  const violations: Array<{ event: CalendarEvent; issue: string; suggestion: string; }> = [];
  
  // Group events by job
  const eventsByJob = new Map<string, CalendarEvent[]>();
  events.forEach(event => {
    if (event.jobId) {
      const jobEvents = eventsByJob.get(event.jobId) || [];
      jobEvents.push(event);
      eventsByJob.set(event.jobId, jobEvents);
    }
  });
  
  // Check each job's operation sequence
  eventsByJob.forEach((jobEvents, jobId) => {
    const sortedEvents = jobEvents.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEvent = sortedEvents[i];
      const nextEvent = sortedEvents[i + 1];
      
      const currentEnd = new Date(currentEvent.endTime);
      const nextStart = new Date(nextEvent.startTime);
      
      // Check if next operation starts before current one ends
      if (nextStart < currentEnd) {
        violations.push({
          event: nextEvent,
          issue: `Operation starts before previous operation (${currentEvent.title}) completes`,
          suggestion: `Reschedule to start after ${currentEnd.toLocaleString()}`
        });
      }
      
      // Check for reasonable gap between operations (at least 15 minutes for setup)
      const gap = nextStart.getTime() - currentEnd.getTime();
      const minGap = 15 * 60 * 1000; // 15 minutes
      
      if (gap < minGap && gap > 0) {
        violations.push({
          event: nextEvent,
          issue: `Insufficient time between operations (${Math.round(gap / (1000 * 60))} minutes)`,
          suggestion: `Allow at least 15 minutes between operations for setup/changeover`
        });
      }
    }
  });
  
  return {
    isValid: violations.length === 0,
    violations
  };
} 