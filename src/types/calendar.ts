import { Timestamp } from 'firebase/firestore';

export interface CalendarEvent {
  id: string;
  type: 'job' | 'maintenance' | 'meeting' | 'deadline';
  title: string;
  description?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  machineId?: string;
  operatorId?: string;
  jobId?: string;
  taskId?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  color?: string;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  attendees?: string[];
  notes?: string;
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every N days/weeks/months/years
  daysOfWeek?: number[]; // For weekly recurrence (0 = Sunday, 1 = Monday, etc.)
  dayOfMonth?: number; // For monthly recurrence
  endDate?: Timestamp;
  occurrences?: number; // Number of occurrences
}

export interface ResourceAllocation {
  id: string;
  resourceType: 'machine' | 'operator' | 'tool' | 'fixture';
  resourceId: string;
  resourceName: string;
  allocatedTo: string; // jobId or taskId
  allocatedToType: 'job' | 'task' | 'maintenance';
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'allocated' | 'in_use' | 'available' | 'maintenance';
  utilizationPercentage?: number;
  notes?: string;
}

export interface ScheduleConflict {
  id: string;
  type: 'resource_double_booking' | 'time_overlap' | 'dependency_violation' | 'capacity_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedEvents: string[]; // Event IDs
  affectedResources: string[]; // Resource IDs
  suggestedResolution?: ConflictResolution;
  detectedAt: Timestamp;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
}

export interface ConflictResolution {
  type: 'reschedule' | 'reallocate_resource' | 'split_task' | 'extend_deadline' | 'manual_override';
  description: string;
  proposedChanges: {
    eventId?: string;
    newStartTime?: Timestamp;
    newEndTime?: Timestamp;
    newResourceId?: string;
    additionalNotes?: string;
  }[];
  estimatedImpact: {
    delayInHours?: number;
    costIncrease?: number;
    affectedJobs?: string[];
  };
}

export interface CalendarViewProps {
  view: 'day' | 'week' | 'month';
  currentDate: Date;
  events: CalendarEvent[];
  resourceAllocations: ResourceAllocation[];
  conflicts: ScheduleConflict[];
  loading: boolean;
  onEventUpdate: (eventId: string, updates: Partial<CalendarEvent>) => void;
  onEventSelect: (event: CalendarEvent | null) => void;
  onResourceReallocation: (allocationId: string, newResourceId: string) => void;
}

export interface CalendarHeaderProps {
  currentDate: Date;
  currentView: 'day' | 'week' | 'month';
  onDateChange: (date: Date) => void;
  onViewChange: (view: 'day' | 'week' | 'month') => void;
  onRefresh: () => void;
}

export interface ResourcePanelProps {
  resourceAllocations: ResourceAllocation[];
  conflicts: ScheduleConflict[];
  onResourceReallocation: (allocationId: string, newResourceId: string) => void;
}

export interface ConflictResolverProps {
  conflicts: ScheduleConflict[];
  events: CalendarEvent[];
  resourceAllocations: ResourceAllocation[];
  onResolveConflict: (conflictId: string, resolution: ConflictResolution) => void;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  resourceId?: string;
  conflictId?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CalendarSettings {
  workingHours: {
    start: string; // "08:00"
    end: string; // "17:00"
  };
  workingDays: number[]; // [1, 2, 3, 4, 5] for Monday-Friday
  timeZone: string;
  defaultView: 'day' | 'week' | 'month';
  showWeekends: boolean;
  conflictDetectionEnabled: boolean;
  autoRefreshInterval: number; // minutes
}

export interface Machine {
  id: string;
  name: string;
  type: 'turning' | 'milling' | '5-axis' | 'grinding' | 'other';
  capabilities: string[];
  status: 'available' | 'busy' | 'maintenance' | 'offline';
  currentJob?: string;
  nextAvailable?: Timestamp;
  utilizationPercentage: number;
  location: string;
  operatorRequired?: boolean;
  maintenanceSchedule?: MaintenanceWindow[];
}

export interface MaintenanceWindow {
  id: string;
  machineId: string;
  type: 'preventive' | 'corrective' | 'calibration';
  startTime: Timestamp;
  endTime: Timestamp;
  description: string;
  technician?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface Operator {
  id: string;
  name: string;
  skills: string[];
  certifications: string[];
  currentAssignment?: string;
  availability: 'available' | 'busy' | 'break' | 'offline';
  shift: 'day' | 'night' | 'swing';
  contactInfo: {
    email?: string;
    phone?: string;
  };
} 