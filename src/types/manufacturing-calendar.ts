export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  startTime: string; // ISO string
  endTime: string; // ISO string
  machineId?: string;
  machineName?: string;
  jobId?: string;
  taskId?: string;
  operatorId?: string;
  operatorName?: string;
  partName?: string; // Part name for manufacturing operations
  operationName?: string; // Operation name (e.g., "Turning", "3-Axis Milling")
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  status: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  color?: string;
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes
  setupTime?: number; // minutes
  cycleTime?: number; // minutes
  quantity?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Multi-day operation support
  isMultiDay?: boolean;
  originalEventId?: string;
  dayIndex?: number;
  totalDays?: number;
  
  // Operation dependency support
  operationIndex?: number;
  dependencies?: string[];

  // Emergency operations support
  isEmergency?: boolean;
  emergencyReason?: string;
  emergencyApprovalBy?: string;
  emergencyApprovalTime?: string;
  allowAfterHours?: boolean;
  allowWeekends?: boolean;
  emergencyContactInfo?: string;
  requiresSpecialApproval?: boolean;
  emergencyLevel?: 'urgent' | 'critical' | 'safety_critical';
}

export type CalendarEventType = 
  | 'manufacturing' 
  | 'maintenance' 
  | 'setup' 
  | 'quality_check' 
  | 'meeting' 
  | 'training' 
  | 'break' 
  | 'other';

export interface CalendarView {
  startDate: Date;
  endDate: Date;
  viewType: 'day' | 'week' | 'month';
  events: CalendarEvent[];
}

export interface DayView {
  date: Date;
  events: CalendarEvent[];
  workingHours: {
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
  machines: MachineCalendarData[];
}

export interface WeekView {
  weekStart: Date;
  weekEnd: Date;
  days: DayView[];
  weeklyStats: WeeklyStats;
}

export interface MachineCalendarData {
  machineId: string;
  machineName: string;
  machineType: string;
  isActive: boolean;
  events: CalendarEvent[];
  utilization: number; // percentage
  availableSlots: TimeSlot[];
  maintenanceWindows: TimeSlot[];
}

export interface TimeSlot {
  start: string; // ISO string
  end: string; // ISO string
  isAvailable: boolean;
  reason?: string; // maintenance, busy, etc.
}

export interface WeeklyStats {
  totalEvents: number;
  manufacturingEvents: number;
  maintenanceEvents: number;
  averageUtilization: number;
  completedEvents: number;
  delayedEvents: number;
  machineUtilization: Record<string, number>;
}

export interface CalendarFilter {
  machineIds?: string[];
  eventTypes?: CalendarEventType[];
  operators?: string[];
  priorities?: string[];
  statuses?: string[];
  jobIds?: string[];
}

export interface CalendarSettings {
  workingHours: {
    start: string; // HH:mm
    end: string; // HH:mm
  };
  workingDays: number[]; // 0-6, Sunday to Saturday
  timeZone: string;
  defaultView: 'day' | 'week' | 'month';
  refreshInterval: number; // seconds
  showWeekends: boolean;
  colorScheme: CalendarColorScheme;
  
  // Emergency operations settings
  emergencySettings: {
    allowEmergencyAfterHours: boolean;
    allowEmergencyWeekends: boolean;
    emergencyWorkingHours: {
      start: string; // HH:mm - earliest emergency start time
      end: string; // HH:mm - latest emergency end time
    };
    requireApprovalForEmergency: boolean;
    emergencyApprovers: string[]; // User IDs who can approve emergency operations
    emergencyNotificationEmails: string[];
    maxConsecutiveEmergencyHours: number; // Maximum consecutive hours for emergency operations
  };
}

export interface CalendarColorScheme {
  manufacturing: string;
  maintenance: string;
  setup: string;
  quality_check: string;
  meeting: string;
  training: string;
  break: string;
  other: string;
}

export interface EventForm {
  title: string;
  type: CalendarEventType;
  startTime: string;
  endTime: string;
  machineId?: string;
  operatorId?: string;
  partName?: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  jobId?: string;
  taskId?: string;
  notes?: string;
  
  // Emergency form fields
  isEmergency?: boolean;
  emergencyReason?: string;
  emergencyLevel?: 'urgent' | 'critical' | 'safety_critical';
  allowAfterHours?: boolean;
  allowWeekends?: boolean;
  emergencyContactInfo?: string;
}

export interface ConflictDetection {
  hasConflicts: boolean;
  conflicts: CalendarConflict[];
}

export interface CalendarConflict {
  type: 'machine_busy' | 'operator_busy' | 'maintenance_window' | 'overlapping_event' | 'emergency_override_required';
  message: string;
  conflictingEventId?: string;
  suggestedAlternatives?: TimeSlot[];
}

// Emergency operations specific interfaces
export interface EmergencyApproval {
  id: string;
  eventId: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  emergencyLevel: 'urgent' | 'critical' | 'safety_critical';
  estimatedDuration: number; // minutes
  affectedMachines: string[];
  requiredResources: string[];
  safetyConsiderations?: string;
  notes?: string;
}

export interface EmergencyScheduleConstraints {
  allowAfterHours: boolean;
  allowWeekends: boolean;
  emergencyWorkingHours: {
    start: string;
    end: string;
  };
  maxConsecutiveHours: number;
  requiredApprovals: number;
  notificationRequired: boolean;
}



// Export default settings
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
  },
  emergencySettings: {
    allowEmergencyAfterHours: true,
    allowEmergencyWeekends: true,
    emergencyWorkingHours: {
      start: '06:00', // Emergency operations can start from 6 AM
      end: '22:00'    // Emergency operations can run until 10 PM
    },
    requireApprovalForEmergency: true,
    emergencyApprovers: [], // To be configured by administrators
    emergencyNotificationEmails: [],
    maxConsecutiveEmergencyHours: 16 // Maximum 16 consecutive hours for safety
  }
}; 