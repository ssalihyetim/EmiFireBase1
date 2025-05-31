import { Timestamp } from 'firebase/firestore';
import { CalendarEvent, ResourceAllocation, ScheduleConflict, ConflictResolution, DateRange } from '@/types/calendar';

// Mock data for development - replace with actual Firebase calls
const mockEvents: CalendarEvent[] = [
  {
    id: 'event-1',
    type: 'job',
    title: 'Landing Gear Bracket - Turning',
    description: 'Turning operation for aerospace component',
    startTime: Timestamp.fromDate(new Date(2024, 11, 16, 8, 0)),
    endTime: Timestamp.fromDate(new Date(2024, 11, 16, 12, 0)),
    machineId: 'machine-turning-1',
    operatorId: 'operator-1',
    jobId: 'job-001',
    taskId: 'task-turning-1',
    status: 'scheduled',
    color: '#3b82f6',
    priority: 'high'
  },
  {
    id: 'event-2',
    type: 'job',
    title: 'Turbine Impeller - 5-Axis Milling',
    description: '5-axis milling for complex geometry',
    startTime: Timestamp.fromDate(new Date(2024, 11, 16, 13, 0)),
    endTime: Timestamp.fromDate(new Date(2024, 11, 16, 17, 0)),
    machineId: 'machine-5axis-1',
    operatorId: 'operator-2',
    jobId: 'job-002',
    taskId: 'task-milling-1',
    status: 'in_progress',
    color: '#10b981',
    priority: 'critical'
  },
  {
    id: 'event-3',
    type: 'maintenance',
    title: 'Preventive Maintenance - CNC Lathe',
    description: 'Scheduled maintenance for turning machine',
    startTime: Timestamp.fromDate(new Date(2024, 11, 17, 7, 0)),
    endTime: Timestamp.fromDate(new Date(2024, 11, 17, 9, 0)),
    machineId: 'machine-turning-2',
    status: 'scheduled',
    color: '#f59e0b',
    priority: 'medium'
  },
  {
    id: 'event-4',
    type: 'deadline',
    title: 'Customer Delivery - Aerospace Corp',
    description: 'Final delivery deadline for order ORD-2024-001',
    startTime: Timestamp.fromDate(new Date(2024, 11, 20, 16, 0)),
    endTime: Timestamp.fromDate(new Date(2024, 11, 20, 17, 0)),
    jobId: 'job-001',
    status: 'scheduled',
    color: '#ef4444',
    priority: 'critical'
  }
];

const mockResourceAllocations: ResourceAllocation[] = [
  {
    id: 'alloc-1',
    resourceType: 'machine',
    resourceId: 'machine-turning-1',
    resourceName: 'CNC Lathe NEX110',
    allocatedTo: 'job-001',
    allocatedToType: 'job',
    startTime: Timestamp.fromDate(new Date(2024, 11, 16, 8, 0)),
    endTime: Timestamp.fromDate(new Date(2024, 11, 16, 12, 0)),
    status: 'allocated',
    utilizationPercentage: 85
  },
  {
    id: 'alloc-2',
    resourceType: 'machine',
    resourceId: 'machine-5axis-1',
    resourceName: 'Fanuc Robodrill α-D21MiA5',
    allocatedTo: 'job-002',
    allocatedToType: 'job',
    startTime: Timestamp.fromDate(new Date(2024, 11, 16, 13, 0)),
    endTime: Timestamp.fromDate(new Date(2024, 11, 16, 17, 0)),
    status: 'in_use',
    utilizationPercentage: 95
  },
  {
    id: 'alloc-3',
    resourceType: 'operator',
    resourceId: 'operator-1',
    resourceName: 'John Smith',
    allocatedTo: 'job-001',
    allocatedToType: 'job',
    startTime: Timestamp.fromDate(new Date(2024, 11, 16, 8, 0)),
    endTime: Timestamp.fromDate(new Date(2024, 11, 16, 12, 0)),
    status: 'allocated',
    utilizationPercentage: 100
  },
  {
    id: 'alloc-4',
    resourceType: 'operator',
    resourceId: 'operator-2',
    resourceName: 'Maria Garcia',
    allocatedTo: 'job-002',
    allocatedToType: 'job',
    startTime: Timestamp.fromDate(new Date(2024, 11, 16, 13, 0)),
    endTime: Timestamp.fromDate(new Date(2024, 11, 16, 17, 0)),
    status: 'in_use',
    utilizationPercentage: 100
  }
];

const mockConflicts: ScheduleConflict[] = [
  {
    id: 'conflict-1',
    type: 'resource_double_booking',
    severity: 'high',
    description: 'Machine NEX110 is double-booked for Tuesday 17th at 10:00 AM',
    affectedEvents: ['event-1', 'event-5'],
    affectedResources: ['machine-turning-1'],
    detectedAt: Timestamp.fromDate(new Date()),
    suggestedResolution: {
      type: 'reschedule',
      description: 'Reschedule second job to available time slot',
      proposedChanges: [
        {
          eventId: 'event-5',
          newStartTime: Timestamp.fromDate(new Date(2024, 11, 17, 14, 0)),
          newEndTime: Timestamp.fromDate(new Date(2024, 11, 17, 18, 0))
        }
      ],
      estimatedImpact: {
        delayInHours: 4,
        costIncrease: 0,
        affectedJobs: ['job-003']
      }
    }
  }
];

/**
 * Load calendar events for a given date range
 */
export async function loadCalendarEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Filter mock events by date range
  const filteredEvents = mockEvents.filter(event => {
    const eventStart = event.startTime.toDate();
    return eventStart >= startDate && eventStart <= endDate;
  });
  
  return filteredEvents;
}

/**
 * Load resource allocations for a given date range
 */
export async function loadResourceAllocations(startDate: Date, endDate: Date): Promise<ResourceAllocation[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Filter mock allocations by date range
  const filteredAllocations = mockResourceAllocations.filter(allocation => {
    const allocationStart = allocation.startTime.toDate();
    return allocationStart >= startDate && allocationStart <= endDate;
  });
  
  return filteredAllocations;
}

/**
 * Detect schedule conflicts
 */
export async function detectScheduleConflicts(
  events: CalendarEvent[], 
  allocations: ResourceAllocation[]
): Promise<ScheduleConflict[]> {
  // Simulate conflict detection processing
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const conflicts: ScheduleConflict[] = [];
  
  // Check for resource double-booking
  const resourceBookings = new Map<string, { eventId: string; start: Date; end: Date }[]>();
  
  events.forEach(event => {
    if (event.machineId) {
      if (!resourceBookings.has(event.machineId)) {
        resourceBookings.set(event.machineId, []);
      }
      resourceBookings.get(event.machineId)!.push({
        eventId: event.id,
        start: event.startTime.toDate(),
        end: event.endTime.toDate()
      });
    }
  });
  
  // Check for overlapping bookings
  resourceBookings.forEach((bookings, resourceId) => {
    for (let i = 0; i < bookings.length; i++) {
      for (let j = i + 1; j < bookings.length; j++) {
        const booking1 = bookings[i];
        const booking2 = bookings[j];
        
        // Check for time overlap
        if (booking1.start < booking2.end && booking2.start < booking1.end) {
          conflicts.push({
            id: `conflict-${Date.now()}-${i}-${j}`,
            type: 'resource_double_booking',
            severity: 'high',
            description: `Resource ${resourceId} has overlapping bookings`,
            affectedEvents: [booking1.eventId, booking2.eventId],
            affectedResources: [resourceId],
            detectedAt: Timestamp.fromDate(new Date()),
            suggestedResolution: {
              type: 'reschedule',
              description: 'Reschedule one of the conflicting events',
              proposedChanges: [
                {
                  eventId: booking2.eventId,
                  newStartTime: Timestamp.fromDate(new Date(booking1.end.getTime() + 30 * 60 * 1000)), // 30 min buffer
                  newEndTime: Timestamp.fromDate(new Date(booking1.end.getTime() + 30 * 60 * 1000 + (booking2.end.getTime() - booking2.start.getTime())))
                }
              ],
              estimatedImpact: {
                delayInHours: (booking1.end.getTime() - booking2.start.getTime()) / (1000 * 60 * 60),
                costIncrease: 0,
                affectedJobs: []
              }
            }
          });
        }
      }
    }
  });
  
  // Return mock conflicts for now
  return mockConflicts;
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In real implementation, this would update the event in Firebase
  console.log('Updating event:', eventId, updates);
}

/**
 * Update a resource allocation
 */
export async function updateResourceAllocation(allocationId: string, updates: Partial<ResourceAllocation>): Promise<void> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In real implementation, this would update the allocation in Firebase
  console.log('Updating resource allocation:', allocationId, updates);
}

/**
 * Create a new calendar event
 */
export async function createCalendarEvent(event: Omit<CalendarEvent, 'id'>): Promise<string> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const newEventId = `event-${Date.now()}`;
  
  // In real implementation, this would create the event in Firebase
  console.log('Creating new event:', newEventId, event);
  
  return newEventId;
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In real implementation, this would delete the event from Firebase
  console.log('Deleting event:', eventId);
}

/**
 * Resolve a schedule conflict
 */
export async function resolveScheduleConflict(conflictId: string, resolution: ConflictResolution): Promise<void> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In real implementation, this would:
  // 1. Apply the resolution changes
  // 2. Update affected events/allocations
  // 3. Mark the conflict as resolved
  console.log('Resolving conflict:', conflictId, resolution);
}

/**
 * Get available time slots for a resource
 */
export async function getAvailableTimeSlots(
  resourceId: string, 
  startDate: Date, 
  endDate: Date, 
  durationMinutes: number
): Promise<{ start: Date; end: Date }[]> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In real implementation, this would calculate available slots based on:
  // 1. Existing allocations
  // 2. Working hours
  // 3. Maintenance windows
  // 4. Required duration
  
  const slots: { start: Date; end: Date }[] = [];
  
  // Mock available slots
  const workingHours = { start: 8, end: 17 }; // 8 AM to 5 PM
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Skip weekends
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      const slotStart = new Date(currentDate);
      slotStart.setHours(workingHours.start, 0, 0, 0);
      
      const slotEnd = new Date(currentDate);
      slotEnd.setHours(workingHours.end, 0, 0, 0);
      
      slots.push({ start: slotStart, end: slotEnd });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return slots;
}

/**
 * Calculate resource utilization for a given period
 */
export async function calculateResourceUtilization(
  resourceId: string, 
  startDate: Date, 
  endDate: Date
): Promise<number> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // In real implementation, this would calculate utilization based on:
  // 1. Total available hours in the period
  // 2. Total allocated hours
  // 3. Working hours configuration
  
  // Mock calculation
  const totalHours = 8 * 5; // 8 hours per day, 5 days per week
  const allocatedHours = Math.random() * totalHours;
  
  return (allocatedHours / totalHours) * 100;
}

/**
 * Get machine status and availability
 */
export async function getMachineStatus(machineId: string): Promise<{
  status: 'available' | 'busy' | 'maintenance' | 'offline';
  currentJob?: string;
  nextAvailable?: Date;
  utilizationPercentage: number;
}> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Mock machine status
  const statuses = ['available', 'busy', 'maintenance', 'offline'] as const;
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  return {
    status: randomStatus,
    currentJob: randomStatus === 'busy' ? 'job-001' : undefined,
    nextAvailable: randomStatus === 'busy' ? new Date(Date.now() + 2 * 60 * 60 * 1000) : undefined, // 2 hours from now
    utilizationPercentage: Math.random() * 100
  };
} 