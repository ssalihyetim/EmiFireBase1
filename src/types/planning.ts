import type { Timestamp } from "firebase/firestore";

// Machine Types
export type MachineType = 'turning' | 'milling' | '5-axis';

// Priority levels for scheduling
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

// Time window for maintenance and working hours
export interface TimeWindow {
  start: string; // ISO string or time format like "08:00"
  end: string;   // ISO string or time format like "17:00"
}

// Enhanced Machine interface with scheduling fields
export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  model: string;
  isActive: boolean;
  capabilities?: string[];
  hourlyRate?: number; // Cost per hour for this machine
  
  // ✅ NEW: Auto-scheduling fields
  currentWorkload: number;            // Hours currently scheduled
  availableFrom: Timestamp;           // Next available time
  workingHours: {                     // Operating schedule
    start: string;  // "08:00"
    end: string;    // "17:00"
    workingDays: number[]; // [1,2,3,4,5] (Mon-Fri)
  };
  operatorRequired?: string;          // Required operator skill
  maintenanceWindows: TimeWindow[];   // Scheduled downtime
  
  // Legacy fields
  maintenanceSchedule?: {
    lastMaintenance: string;
    nextMaintenance: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Firestore version for machines
export interface MachineFirestore extends Omit<Machine, 'createdAt' | 'updatedAt' | 'availableFrom'> {
  availableFrom: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Machining Process with setup and cycle times
export interface MachiningProcess {
  id: string;
  name: string;
  machineType: MachineType;
  setupTimeMinutes: number;
  cycleTimeMinutes: number;
  description: string;
  dependencies: string[];
  requiredMachineCapabilities: string[];
  estimatedCost?: number;
}

// ✅ ENHANCED: ProcessInstance with auto-scheduling fields
export interface ProcessInstance {
  id: string;
  baseProcessName: string; // e.g., "Turning"
  instanceNumber: number; // e.g., 1, 2, 3
  displayName: string; // e.g., "Turning 1", "Turning 2"
  machineType: MachineType;
  setupTimeMinutes: number;
  cycleTimeMinutes: number;
  description: string;
  requiredMachineCapabilities: string[];
  orderIndex: number; // Manual ordering
  estimatedCost: number;
  dependencies: string[]; // IDs of other process instances
  
  // ✅ NEW: Auto-scheduling fields
  quantity: number;                    // Needed for time calculations
  dueDate?: string;                   // For priority calculations
  customerPriority?: PriorityLevel;   // For scheduling priority
  offerId: string;                    // Link to source offer/order
}

// Enhanced OfferItem with detailed machining processes
export interface PlanningOfferItem {
  id: string;
  partName: string;
  quantity: number;
  processes: MachiningProcess[];
  estimatedTotalTimeMinutes: number; // Calculated total time in minutes
  estimatedTotalCost: number; // Calculated total cost
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
}

// ✅ NEW: Enhanced Schedule Entry for auto-scheduling
export interface ScheduleEntry {
  id: string;
  machineId: string;
  processInstanceId: string;
  orderId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'scheduled' | 'in_progress' | 'completed' | 'delayed';
  actualStartTime?: Timestamp;
  actualEndTime?: Timestamp;
  operatorNotes?: string;
  
  // Legacy compatibility fields
  jobId: string;
  partName: string;
  quantity: number;
  process: MachiningProcess;
  machineName: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  dependencies?: string[]; // Other schedule entry IDs
  createdAt?: string;
  updatedAt?: string;
}

// Firestore versions
export interface ScheduleEntryFirestore extends Omit<ScheduleEntry, 'scheduledStartTime' | 'scheduledEndTime' | 'actualStartTime' | 'actualEndTime' | 'createdAt' | 'updatedAt'> {
  scheduledStartTime: Timestamp;
  scheduledEndTime: Timestamp;
  actualStartTime?: Timestamp;
  actualEndTime?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ✅ NEW: Working Configuration for time management
export interface WorkingConfiguration {
  defaultWorkingHours: { start: string; end: string; };
  workingDaysPerWeek: number[];
  timeZone: string;
  bufferTimePercentage: number;
  breakTimes: TimeWindow[];
}

// ✅ NEW: Auto-scheduling specific types
export interface TimeSlot {
  start: Timestamp;
  end: Timestamp;
  duration: number; // minutes
}

export interface DateRange {
  start: string;
  end: string;
}

export interface Conflict {
  type: 'machine_conflict' | 'dependency_conflict' | 'maintenance_conflict';
  description: string;
  conflictingEntries: string[]; // Schedule entry IDs
  suggestedResolution?: string;
}

export interface ScheduleResult {
  success: boolean;
  entries: ScheduleEntry[];
  conflicts: Conflict[];
  metrics: {
    totalScheduledJobs: number;
    averageUtilization: number;
    onTimeDeliveryRate: number;
    schedulingDurationMs: number;
  };
}

// Dependency graph for scheduling algorithm
export interface DependencyGraph {
  nodes: ProcessInstance[];
  edges: { from: string; to: string }[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Operator Progress Log
export interface OperatorLog {
  id: string;
  scheduleEntryId: string;
  jobId: string;
  machineId: string;
  operatorName: string;
  logType: 'start' | 'progress' | 'complete' | 'issue' | 'pause';
  timestamp: string;
  notes?: string;
  quantityCompleted?: number;
  issueType?: 'quality' | 'machine' | 'material' | 'tooling' | 'other';
  photoUrls?: string[];
  actualSetupTime?: number; // Actual setup time in minutes
  actualCycleTime?: number; // Actual cycle time in minutes
}

// Firestore version
export interface OperatorLogFirestore extends Omit<OperatorLog, 'timestamp'> {
  timestamp: Timestamp;
}

// Workload Summary
export interface WorkloadSummary {
  machineId: string;
  machineName: string;
  machineType: MachineType;
  weeklySchedule: {
    week: string; // ISO week format (e.g., "2024-W01")
    scheduledHours: number;
    availableHours: number;
    utilizationPercentage: number;
    scheduledJobs: number;
  }[];
}

// Planning Configuration
export interface PlanningConfig {
  workingHoursPerDay: number;
  workingDaysPerWeek: number;
  shiftHours: {
    start: string; // "08:00"
    end: string;   // "17:00"
  };
  bufferTimePercentage: number; // Extra time buffer for scheduling
  emailNotifications: {
    enabled: boolean;
    recipients: {
      productionManager: string[];
      operators: string[];
      salesTeam: string[];
      qualityTeam: string[];
      management: string[];
    };
    sendTime: string; // "21:59"
  };
}

// Daily Report structure for notifications
export interface DailyReport {
  date: string;
  productionSummary: {
    jobsCompleted: number;
    jobsBehindSchedule: number;
    totalProductionHours: number;
    averageUtilization: number;
  };
  tomorrowPriorities: {
    criticalJobs: {
      jobId: string;
      partName: string;
      dueDate: string;
      customerName: string;
    }[];
    machineConflicts: {
      machineId: string;
      conflictType: string;
      description: string;
    }[];
    materialNeeds: {
      material: string;
      quantity: number;
      urgency: 'low' | 'medium' | 'high';
    }[];
  };
  machineUtilization: {
    overUtilized: {
      machineId: string;
      machineName: string;
      utilizationPercentage: number;
    }[];
    underUtilized: {
      machineId: string;
      machineName: string;
      utilizationPercentage: number;
    }[];
    maintenanceDue: {
      machineId: string;
      machineName: string;
      dueDate: string;
    }[];
  };
  qualityAlerts: {
    overdueInspections: number;
    reworkRequired: number;
    firstArticlesPending: number;
  };
}

// Machine status for real-time dashboard
export type MachineStatus = 'running' | 'setup' | 'idle' | 'maintenance' | 'issue';

export interface RealTimeMachineStatus {
  machineId: string;
  status: MachineStatus;
  currentJobId?: string;
  currentJobName?: string;
  progress?: number; // 0-100
  estimatedCompletion?: string;
  lastUpdate: string;
} 