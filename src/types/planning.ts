import type { Timestamp } from "firebase/firestore";

// Machine Types
export type MachineType = 'turning' | 'milling' | '5-axis';

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  model: string;
  isActive: boolean;
  capabilities?: string[];
  hourlyRate?: number; // Cost per hour for this machine
  maintenanceSchedule?: {
    lastMaintenance: string;
    nextMaintenance: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Firestore version for machines
export interface MachineFirestore extends Omit<Machine, 'createdAt' | 'updatedAt'> {
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
  description?: string;
  dependencies?: string[]; // Array of process IDs that must be completed before this one
  requiredMachineCapabilities?: string[];
  estimatedCost?: number; // Cost calculation based on time and machine rate
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

// Production Schedule Entry
export interface ScheduleEntry {
  id: string;
  jobId: string;
  orderId: string;
  partName: string;
  quantity: number;
  process: MachiningProcess;
  machineId: string;
  machineName: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'delayed' | 'cancelled';
  operatorNotes?: string;
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