import type { Timestamp } from "firebase/firestore";
import type { Attachment } from "./index";

// === Core Task & Subtask Types ===

export type TaskType = 'compulsory' | 'optional';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
export type SubtaskStatus = 'pending' | 'completed' | 'not_applicable' | 'skipped';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

// === Template Definitions ===

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  applicableProcesses?: string[]; // Which manufacturing processes trigger this task
  requiredSubtasks: string[]; // IDs of required subtasks
  estimatedDurationHours?: number;
  as9100dClause?: string; // AS9100D compliance reference
  dependencies?: string[]; // Task IDs that must be completed first
  isParallel: boolean; // Can run in parallel with other tasks
  category: string; // Group tasks by category (e.g., 'production', 'quality', 'documentation')
}

export interface SubtaskTemplate {
  id: string;
  name: string;
  description: string;
  qualityTemplateId?: string; // Links to AS9100D quality system documents
  isPrintable: boolean;
  hasCheckbox: boolean;
  instructions?: string;
  requiredDocuments?: string[];
  estimatedDurationMinutes?: number;
  as9100dClause?: string;
  category: string;
}

// === Job-Specific Instances ===

export interface JobTask {
  id: string;
  jobId: string;
  templateId: string;
  name: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  assignedTo?: string;
  assignedBy?: string;
  estimatedStart?: string; // ISO date string
  estimatedEnd?: string; // ISO date string
  actualStart?: string; // ISO date string
  actualEnd?: string; // ISO date string
  estimatedDurationHours?: number;
  actualDurationHours?: number;
  subtasks: JobSubtask[];
  dependencies?: string[]; // Other task IDs
  as9100dClause?: string;
  notes?: string;
  attachments?: Attachment[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface JobSubtask {
  id: string;
  taskId: string;
  jobId: string; // For easier querying
  templateId: string;
  name: string;
  description: string;
  status: SubtaskStatus;
  category: string;
  qualityTemplateId?: string;
  isPrintable: boolean;
  hasCheckbox: boolean;
  isChecked: boolean;
  instructions?: string;
  estimatedDurationMinutes?: number;
  actualDurationMinutes?: number;
  completedBy?: string;
  completedAt?: string; // ISO date string
  verifiedBy?: string; // For quality verification
  verifiedAt?: string; // ISO date string
  notes?: string;
  attachments?: Attachment[];
  requiredDocuments?: string[];
  as9100dClause?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// === Firestore Data Types (with Timestamps) ===

export interface JobTaskFirestore extends Omit<JobTask, 'estimatedStart' | 'estimatedEnd' | 'actualStart' | 'actualEnd' | 'subtasks' | 'createdAt' | 'updatedAt'> {
  estimatedStart?: Timestamp | null;
  estimatedEnd?: Timestamp | null;
  actualStart?: Timestamp | null;
  actualEnd?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface JobSubtaskFirestore extends Omit<JobSubtask, 'completedAt' | 'verifiedAt' | 'createdAt' | 'updatedAt'> {
  completedAt?: Timestamp | null;
  verifiedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// === Task Progress & Analytics ===

export interface TaskProgress {
  jobId: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  totalSubtasks: number;
  completedSubtasks: number;
  overallProgress: number; // 0-100 percentage
  estimatedCompletion?: string; // ISO date string
  isOnSchedule: boolean;
  criticalPath?: string[]; // Task IDs in critical path
}

export interface TaskMetrics {
  taskId: string;
  taskName: string;
  averageCompletionTime: number; // in hours
  completionRate: number; // 0-100 percentage
  frequentIssues?: string[];
  qualityScore?: number; // 0-100 based on rework/issues
}

// === Task Assignment & Workflow ===

export interface TaskAssignment {
  taskId: string;
  assignedTo: string;
  assignedBy: string;
  assignedAt: string; // ISO date string
  dueDate?: string; // ISO date string
  priority: TaskPriority;
  workInstructions?: string;
  specialRequirements?: string[];
}

export interface TaskDependency {
  taskId: string;
  dependsOn: string; // Task ID that must be completed first
  dependencyType: 'blocking' | 'soft'; // blocking = cannot start, soft = warning only
  description?: string;
}

// === Quality Integration Types ===

export interface QualityCheckpoint {
  subtaskId: string;
  checkpointName: string;
  qualityTemplateId: string;
  requiredSignoff: boolean;
  inspectionRequired: boolean;
  measurementRequired: boolean;
  documentationRequired: boolean;
  completedBy?: string;
  verifiedBy?: string;
  completedAt?: string;
  notes?: string;
}

export interface TaskAuditTrail {
  taskId: string;
  action: 'created' | 'started' | 'paused' | 'resumed' | 'completed' | 'blocked' | 'cancelled' | 'modified';
  performedBy: string;
  performedAt: string; // ISO date string
  previousStatus?: TaskStatus;
  newStatus?: TaskStatus;
  reason?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

// === Configuration Types ===

export interface TaskConfiguration {
  automaticTaskGeneration: boolean;
  requireQualitySignoff: boolean;
  allowTaskSkipping: boolean;
  enableTaskDependencies: boolean;
  enableParallelExecution: boolean;
  defaultTaskPriority: TaskPriority;
  qualityComplianceMode: 'strict' | 'flexible';
}

// === Search & Filter Types ===

export interface TaskFilter {
  jobIds?: string[];
  status?: TaskStatus[];
  type?: TaskType[];
  priority?: TaskPriority[];
  assignedTo?: string[];
  category?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  overdue?: boolean;
  hasIssues?: boolean;
}

export interface TaskSearchResult {
  task: JobTask;
  jobId: string;
  jobNumber: string;
  clientName: string;
  partName: string;
  relevanceScore?: number;
} 