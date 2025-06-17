import type { Timestamp } from "firebase/firestore";
import type { Attachment } from "./index";

// === Core Types ===

// All processes are tasks, but not all tasks are processes
export type TaskCategory = 'manufacturing_process' | 'non_manufacturing_task';

// Manufacturing processes are the tasks that go into planning & scheduling
export type ManufacturingProcessType = 'turning' | '3_axis_milling' | '4_axis_milling' | '5_axis_milling' | 'grinding' | 'drilling' | 'tapping';

// Non-manufacturing tasks are everything else
export type NonManufacturingTaskType = 'contract_review' | 'material_approval' | 'lot_based_production_planning' | 'final_inspection' | 'packaging' | 'shipping' | 'documentation';

export type TaskStatus = 'pending' | 'ready' | 'in_progress' | 'completed' | 'blocked' | 'on_hold' | 'cancelled';
export type SubtaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical' | 'urgent';

// === Manufacturing Process Subtask Types ===
// Every manufacturing process has these 4 standard subtasks
export type ManufacturingSubtaskType = 'setup_sheet' | 'tool_list' | 'tool_life_verification' | 'machining' | 'fai';

// === Template Definitions ===

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedDurationHours?: number;
  as9100dClause?: string; // AS9100D compliance reference
  dependencies?: string[]; // Task IDs that must be completed first
  isParallel: boolean; // Can run in parallel with other tasks
  
  // Manufacturing Process specific fields
  manufacturingProcessType?: ManufacturingProcessType;
  machineType?: string; // Required machine type for manufacturing processes
  setupTimeMinutes?: number; // Setup time for manufacturing operations
  cycleTimeMinutes?: number; // Cycle time per piece for manufacturing operations
  requiredCapabilities?: string[]; // Required machine capabilities
  
  // Non-Manufacturing Task specific fields
  nonManufacturingTaskType?: NonManufacturingTaskType;
  requiredDocuments?: string[];
  requiredApprovals?: string[];
}

export interface SubtaskTemplate {
  id: string;
  name: string;
  description: string;
  isPrintable: boolean;
  hasCheckbox: boolean;
  instructions?: string;
  estimatedDurationMinutes?: number;
  requiredDocuments?: string[];
  as9100dClause?: string;
  
  // Manufacturing Subtask specific fields
  manufacturingSubtaskType?: ManufacturingSubtaskType;
  operatorSkillRequired?: string; // Required operator skill level
  
  // Setup Sheet specific fields (for setup_sheet subtasks)
  requiresFixturing?: boolean;
  requiresGauging?: boolean;
  
  // Tool List specific fields (for tool_list subtasks)
  requiresToolPrep?: boolean;
  requiresToolOffset?: boolean;
  
  // Tool Life Verification specific fields (for tool_life_verification subtasks)
  requiresInspection?: boolean;
  requiresReplacement?: boolean;
  
  // Machining specific fields (for machining subtasks)
  requiresOperatorPresence?: boolean;
  requiresQualityCheck?: boolean;
  generatesChips?: boolean;
}

// === Job-Specific Instances ===

export interface JobTask {
  id: string;
  jobId: string;
  templateId: string;
  name: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
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
  
  // === Manufacturing Process Fields ===
  // Only populated if category === 'manufacturing_process'
  manufacturingProcessType?: ManufacturingProcessType;
  processInstanceId?: string; // Link to ProcessInstance from operations
  machineType?: string; // Required machine type
  setupTimeMinutes?: number; // Setup time for manufacturing
  cycleTimeMinutes?: number; // Cycle time per piece
  quantity?: number; // Number of pieces to produce
  requiredCapabilities?: string[]; // Required machine capabilities
  partCode?: string; // Actual part code, not generic names like "Turning 1"
  
  // Scheduling Integration (only for manufacturing processes)
  scheduledMachineId?: string; // Assigned machine from scheduler
  scheduledMachineName?: string; // Assigned machine name
  scheduledStartTime?: string; // ISO date string from scheduler
  scheduledEndTime?: string; // ISO date string from scheduler
  scheduleEntryId?: string; // Reference to schedule entry
  
  // Operations Integration
  operationIndex?: number; // Order in operation sequence
  customerPriority?: string; // Customer priority level
  dueDate?: string; // ISO date string
  offerId?: string; // Reference to source offer/order
  
  // === Non-Manufacturing Task Fields ===
  // Only populated if category === 'non_manufacturing_task'
  nonManufacturingTaskType?: NonManufacturingTaskType;
  requiredDocuments?: string[];
  requiredApprovals?: string[];
}

export interface JobSubtask {
  id: string;
  taskId: string;
  jobId: string; // For easier querying
  templateId: string;
  name: string;
  description: string;
  status: SubtaskStatus;
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
  qualityTemplateId?: string;
  data?: any; // For storing arbitrary data like form contents
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  
  // === Manufacturing Subtask Fields ===
  // Only populated if parent task category === 'manufacturing_process'
  manufacturingSubtaskType?: ManufacturingSubtaskType;
  operatorSkillRequired?: string;
  machineNumber?: string; // Specific machine used
  
  // Setup Sheet specific fields
  setupSheetId?: string; // Reference to setup sheet document
  requiresFixturing?: boolean;
  requiresGauging?: boolean;
  
  // Tool List specific fields
  toolListId?: string; // Reference to tool list document
  requiresToolPrep?: boolean;
  requiresToolOffset?: boolean;
  
  // Tool Life Verification specific fields
  toolLifeRecordId?: string; // Reference to tool life record
  requiresInspection?: boolean;
  requiresReplacement?: boolean;
  
  // Machining specific fields (this is what gets scheduled)
  partCode?: string; // Shows actual part code for machining subtasks
  requiresOperatorPresence?: boolean;
  requiresQualityCheck?: boolean;
  generatesChips?: boolean;
  
  // Scheduling integration (only for machining subtasks)
  isSchedulable?: boolean; // True only for machining subtasks
  scheduledMachineId?: string; // Only for machining subtasks
  scheduledStartTime?: string; // Only for machining subtasks
  scheduledEndTime?: string; // Only for machining subtasks
}

// === Firestore Data Types (with Timestamps) ===

export interface JobTaskFirestore extends Omit<JobTask, 'estimatedStart' | 'estimatedEnd' | 'actualStart' | 'actualEnd' | 'subtasks' | 'createdAt' | 'updatedAt' | 'scheduledStartTime' | 'scheduledEndTime' | 'dueDate'> {
  estimatedStart?: Timestamp | null;
  estimatedEnd?: Timestamp | null;
  actualStart?: Timestamp | null;
  actualEnd?: Timestamp | null;
  scheduledStartTime?: Timestamp | null;
  scheduledEndTime?: Timestamp | null;
  dueDate?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface JobSubtaskFirestore extends Omit<JobSubtask, 'completedAt' | 'verifiedAt' | 'createdAt' | 'updatedAt' | 'scheduledStartTime' | 'scheduledEndTime'> {
  completedAt?: Timestamp | null;
  verifiedAt?: Timestamp | null;
  scheduledStartTime?: Timestamp | null;
  scheduledEndTime?: Timestamp | null;
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
  
  // Manufacturing vs Non-Manufacturing breakdown
  manufacturingProcesses: number;
  completedManufacturingProcesses: number;
  nonManufacturingTasks: number;
  completedNonManufacturingTasks: number;
  
  // Scheduling specific (only for manufacturing processes)
  scheduledProcesses: number;
  onScheduleProcesses: number;
  machiningSubtasks: number; // Only machining subtasks are scheduled
  completedMachiningSubtasks: number;
}

export interface TaskMetrics {
  taskId: string;
  taskName: string;
  category: TaskCategory;
  averageCompletionTime: number; // in hours
  completionRate: number; // 0-100 percentage
  frequentIssues?: string[];
  qualityScore?: number; // 0-100 based on rework/issues
  
  // Manufacturing Process metrics (only if category === 'manufacturing_process')
  manufacturingProcessType?: ManufacturingProcessType;
  averageSetupTime?: number; // in minutes
  averageCycleTime?: number; // in minutes per piece
  machineUtilization?: number; // 0-100 percentage
  scheduleAdherence?: number; // 0-100 percentage
  machiningEfficiency?: number; // Actual vs estimated machining time
  
  // Non-Manufacturing Task metrics (only if category === 'non_manufacturing_task')
  nonManufacturingTaskType?: NonManufacturingTaskType;
  documentationCompliance?: number; // 0-100 percentage
  approvalCycleTime?: number; // Average time for approvals
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
  
  // Manufacturing Process assignment (only if manufacturing process)
  machineAssignment?: string; // Assigned machine ID
  operatorQualification?: string; // Required operator qualification
  setupRequirements?: string[]; // Special setup requirements
  partCode?: string; // Actual part code being worked on
  
  // Non-Manufacturing Task assignment (only if non-manufacturing)
  requiredApprovals?: string[]; // Who needs to approve
  documentsNeeded?: string[]; // Required documents
}

export interface TaskDependency {
  taskId: string;
  dependsOn: string; // Task ID that must be completed first
  dependencyType: 'blocking' | 'soft'; // blocking = cannot start, soft = warning only
  description?: string;
  
  // Manufacturing Process dependencies (only for manufacturing processes)
  setupDependency?: boolean; // True if depends on setup completion
  materialDependency?: boolean; // True if depends on material availability
  toolingDependency?: boolean; // True if depends on tooling availability
  previousProcessDependency?: boolean; // True if depends on previous manufacturing process
  
  // Non-Manufacturing dependencies
  documentationDependency?: boolean; // True if depends on documentation
  approvalDependency?: boolean; // True if depends on approval
}

// === Quality & Compliance ===

export interface QualityCheckpoint {
  id: string;
  taskId: string;
  subtaskId?: string;
  checkpointType: 'dimensional' | 'visual' | 'functional' | 'documentation';
  description: string;
  requiredBy: string; // AS9100D clause or customer requirement
  frequency: 'first_article' | 'in_process' | 'final' | 'periodic';
  acceptanceCriteria: string;
  measurementMethod?: string;
  toolsRequired?: string[];
  status: 'pending' | 'passed' | 'failed' | 'waived';
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  
  // Manufacturing Process specific quality (only for manufacturing processes)
  appliesToMachiningSubtask?: boolean; // True if this quality check applies to machining
  requiresMachineStop?: boolean; // True if machine must stop for this check
  
  // Non-Manufacturing specific quality (only for non-manufacturing tasks)
  requiresDocumentVerification?: boolean; // True if documents need verification
  requiresApprovalSignoff?: boolean; // True if approval signature required
}

export interface TaskAuditTrail {
  id: string;
  taskId: string;
  action: 'created' | 'updated' | 'status_changed' | 'assigned' | 'completed' | 'scheduled' | 'rescheduled';
  performedBy: string;
  performedAt: string;
  details: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  
  // Manufacturing Process specific audit (only for manufacturing processes)
  machineChange?: boolean; // True if machine assignment changed
  scheduleChange?: boolean; // True if schedule changed
  
  // Non-Manufacturing specific audit (only for non-manufacturing tasks)
  approvalChange?: boolean; // True if approval status changed
  documentChange?: boolean; // True if document status changed
}

// === Task Configuration ===

export interface TaskConfiguration {
  // General settings
  automaticTaskGeneration: boolean;
  requireQualitySignoff: boolean;
  allowTaskSkipping: boolean;
  enableTaskDependencies: boolean;
  enableParallelExecution: boolean;
  defaultTaskPriority: TaskPriority;
  qualityComplianceMode: 'strict' | 'flexible';
  
  // Manufacturing Process specific settings
  autoScheduleManufacturingProcesses: boolean; // Auto-schedule manufacturing processes
  requireMachineAssignment: boolean; // Require machine assignment for manufacturing
  enableOperationsIntegration: boolean; // Enable operations system integration
  scheduleBufferPercentage: number; // Buffer time for scheduling
  autoGenerateManufacturingSubtasks: boolean; // Auto-generate the 4 standard subtasks
  requirePartCodeForMachining: boolean; // Require part code for machining subtasks
  
  // Non-Manufacturing Task specific settings
  requireApprovalDocumentation: boolean; // Require approval documentation
  autoAssignNonManufacturingTasks: boolean; // Auto-assign non-manufacturing tasks
  enableDocumentWorkflow: boolean; // Enable document workflow integration
}

// === Search & Filtering ===

export interface TaskFilter {
  jobIds?: string[];
  status?: TaskStatus[];
  category?: TaskCategory[]; // Filter by manufacturing vs non-manufacturing
  priority?: TaskPriority[];
  assignedTo?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  overdue?: boolean;
  hasIssues?: boolean;
  
  // Manufacturing Process filters
  manufacturingProcessType?: ManufacturingProcessType[];
  machineType?: string[];
  isScheduled?: boolean;
  onSchedule?: boolean;
  partCode?: string;
  
  // Non-Manufacturing Task filters
  nonManufacturingTaskType?: NonManufacturingTaskType[];
  requiresApproval?: boolean;
  hasDocuments?: boolean;
  approvalStatus?: string[];
}

export interface TaskSearchResult {
  task: JobTask;
  jobId: string;
  jobNumber: string;
  clientName: string;
  partName: string;
  relevanceScore?: number;
  
  // Category-specific context
  isManufacturingProcess: boolean;
  
  // Manufacturing Process context (only if manufacturing)
  manufacturingProcessType?: ManufacturingProcessType;
  machineAssigned?: string;
  scheduledTime?: string;
  operationSequence?: number;
  partCode?: string;
  
  // Non-Manufacturing Task context (only if non-manufacturing)
  nonManufacturingTaskType?: NonManufacturingTaskType;
  approvalStatus?: string;
  requiredDocuments?: string[];
}

// === Integration Types ===

export interface TaskScheduleIntegration {
  taskId: string;
  processInstanceId?: string; // Link to operations system
  scheduleEntryId?: string; // Link to schedule entry
  isScheduled: boolean;
  canBeScheduled: boolean; // True if all dependencies met
  schedulingPriority: number; // Calculated priority for scheduling
  estimatedMachineTime: number; // Total time including setup + cycle * quantity
  
  // Only populated for manufacturing processes
  isManufacturingProcess: boolean;
  machiningSubtaskId?: string; // ID of the machining subtask that gets scheduled
  partCode?: string; // Part code for better scheduling identification
}

export interface TaskOperationSync {
  taskId: string;
  operationName: string;
  operationIndex: number;
  machineType: string;
  setupTime: number;
  cycleTime: number;
  quantity: number;
  isScheduled: boolean;
  scheduledMachine?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  partCode?: string; // Actual part code, not generic "Turning 1"
}

export interface UnifiedTaskView {
  task: JobTask;
  isManufacturingProcess: boolean;
  
  // Manufacturing Process view (only if manufacturing)
  manufacturingInfo?: {
    processType: ManufacturingProcessType;
    partCode?: string;
    scheduleInfo?: {
      isScheduled: boolean;
      machineName?: string;
      startTime?: string;
      endTime?: string;
      onSchedule?: boolean;
    };
    machiningSubtask?: JobSubtask; // The specific machining subtask
  };
  
  // Non-Manufacturing Task view (only if non-manufacturing)
  nonManufacturingInfo?: {
    taskType: NonManufacturingTaskType;
    approvalStatus?: string;
    requiredDocuments?: string[];
    pendingApprovals?: string[];
  };
  
  dependencies: {
    taskId: string;
    taskName: string;
    isCompleted: boolean;
    isManufacturingProcess: boolean;
  }[];
  
  progress: {
    percentage: number;
    completedSubtasks: number;
    totalSubtasks: number;
    currentStep?: string;
  };
}

// === AS9100D Compliance ===

export interface AS9100DCompliance {
  taskId: string;
  clauseReference: string;
  complianceLevel: 'required' | 'recommended' | 'optional';
  verificationRequired: boolean;
  documentationRequired: string[];
  auditTrail: ComplianceAuditEntry[];
  
  // Category-specific compliance
  category: TaskCategory;
  
  // Manufacturing Process compliance (only if manufacturing)
  appliesToMachining?: boolean; // True if compliance applies to machining subtask
  requiresMachineVerification?: boolean;
  
  // Non-Manufacturing compliance (only if non-manufacturing)
  requiresApprovalCompliance?: boolean;
  requiresDocumentCompliance?: boolean;
}

export interface ComplianceAuditEntry {
  id: string;
  taskId: string;
  clauseReference: string;
  verifiedBy: string;
  verifiedAt: string;
  status: 'compliant' | 'non_compliant' | 'pending';
  findings?: string;
  correctiveActions?: string[];
  
  // Context for what was audited
  auditContext: 'task' | 'subtask' | 'machining_operation' | 'approval_process';
} 