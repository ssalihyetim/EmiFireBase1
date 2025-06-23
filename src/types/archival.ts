import type { Timestamp } from "firebase/firestore";
import type { Job, JobTask, JobSubtask } from './index';
import type { TaskTemplate, SubtaskTemplate } from './tasks';

// === Performance & Quality Tracking Types ===

export interface Issue {
  id: string;
  type: 'quality' | 'machine' | 'material' | 'tooling' | 'process' | 'operator' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reportedBy: string;
  reportedAt: string;
  solutionApplied?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  preventiveAction?: string;
}

export interface QualityResult {
  id: string;
  taskId: string;
  subtaskId?: string;
  inspectionType: 'fai' | 'in_process' | 'final' | 'dimensional' | 'visual' | 'functional';
  result: 'pass' | 'fail' | 'conditional' | 'rework_required';
  score: number; // 1-10 quality score
  inspectedBy: string;
  inspectionDate: string;
  measurements?: {
    dimension: string;
    specified: string;
    actual: string;
    tolerance: string;
    withinSpec: boolean;
  }[];
  notes?: string;
  photos?: string[]; // URLs to inspection photos
}

export interface CompletedFormData {
  formType: 'routing_sheet' | 'setup_sheet' | 'tool_list' | 'fai_report' | 'inspection_record';
  formId: string;
  completedBy: string;
  completedAt: string;
  formData: Record<string, any>; // Form field values
  signatures: {
    operator?: string;
    inspector?: string;
    supervisor?: string;
  };
  attachments?: string[]; // URLs to form attachments
}

// === Task Performance Tracking ===

export interface TaskPerformance {
  id: string;
  taskId: string;
  jobId: string;
  
  // Time Tracking
  estimatedDuration: number;           // Original estimate (hours)
  actualDuration: number;              // Actual time taken (hours)
  startTime: string;                   // ISO date string
  endTime: string;                     // ISO date string
  
  // Performance Data
  operatorNotes: string[];             // Operator observations
  issuesEncountered: Issue[];          // Problems during execution
  qualityResult: QualityResult;        // Quality outcome
  efficiencyRating: number;            // 1-10 performance score
  
  // Machine & Operator
  assignedMachine?: string;            // Machine ID
  operatorId?: string;                 // Operator identifier
  operatorSkillLevel?: string;         // Skill level required
  
  // Quality & Compliance
  as9100dCompliance: boolean;          // Met AS9100D requirements
  qualityCheckpoints: QualityResult[]; // All quality checks
  
  // Continuous Improvement
  lessonsLearned?: string[];           // Key learnings
  recommendations?: string[];          // Process improvements
  
  createdAt: string;
  updatedAt: string;
}

// Firestore version
export interface TaskPerformanceFirestore extends Omit<TaskPerformance, 'startTime' | 'endTime' | 'createdAt' | 'updatedAt'> {
  startTime: Timestamp;
  endTime: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// === Job Archive System ===

export interface JobArchive {
  id: string;                          // Archive ID
  originalJobId: string;               // Source job ID
  archiveDate: string;                 // When archived
  archiveType: 'completed' | 'cancelled' | 'pattern_creation' | 'quality_failure';
  
  // Complete Snapshots
  jobSnapshot: Job;                    // Frozen job state
  taskSnapshot: JobTask[];             // All tasks as completed
  subtaskSnapshot: JobSubtask[];       // All subtasks with results
  
  // Manufacturing Forms (Filled)
  completedForms: {
    routingSheet: CompletedFormData;
    setupSheets: CompletedFormData[];
    toolLists: CompletedFormData[];
    faiReports: CompletedFormData[];
    inspectionRecords: CompletedFormData[];
  };
  
  // Performance Metrics
  performanceData: {
    totalDuration: number;             // Actual total time (hours)
    qualityScore: number;              // Overall quality rating (1-10)
    efficiencyRating: number;          // Performance vs estimate (1-10)
    onTimeDelivery: boolean;           // Met delivery date
    customerSatisfaction?: number;     // Customer feedback score
    issuesEncountered: Issue[];        // All problems and solutions
    lessonsLearned: string[];          // Key learnings from this job
  };
  
  // Quality & Compliance Data
  qualityData: {
    allInspectionsPassed: boolean;
    finalQualityScore: number;
    nonConformances: string[];         // NCR references
    customerAcceptance: boolean;
    qualityDocuments: string[];        // Generated quality docs
  };
  
  // Financial Performance
  financialData?: {
    estimatedCost: number;
    actualCost: number;
    costVariance: number;
    profitability: number;
  };
  
  // Archive Metadata
  archivedBy: string;                  // Who archived it
  archiveReason: string;               // Why archived
  retentionPeriod: number;             // Years to retain
  
  createdAt: string;
  updatedAt: string;
}

// Firestore version
export interface JobArchiveFirestore extends Omit<JobArchive, 'archiveDate' | 'createdAt' | 'updatedAt'> {
  archiveDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// === Job Pattern System ===

export interface ProcessSequence {
  processName: string;
  orderIndex: number;
  dependencies: string[];
  estimatedDuration: number;
  criticalControlPoints: string[];
}

export interface QualityTarget {
  metric: string;
  target: number;
  tolerance: number;
  measurementMethod: string;
}

export interface JobPattern {
  id: string;                          // Pattern ID
  patternName: string;                 // "Landing Gear Bracket - Rev A"
  sourceJobId: string;                 // Original successful job
  partNumber: string;                  // Part identification
  revision: string;                    // Drawing/spec revision
  
  // Frozen Manufacturing Configuration
  frozenProcessData: {
    assignedProcesses: string[];
    processSequence: ProcessSequence[];
    taskTemplates: TaskTemplate[];
    subtaskTemplates: SubtaskTemplate[];
    criticalParameters: Record<string, any>; // Process parameters
  };
  
  // Historical Performance Data
  historicalPerformance: {
    avgDuration: number;               // Average completion time
    avgQualityScore: number;           // Average quality results
    successRate: number;               // % successful completions
    commonIssues: Issue[];             // Frequent problems
    bestPractices: string[];           // Proven approaches
  };
  
  // Quality & Performance Data
  qualitySignoff: {
    approvedBy: string;
    approvalDate: string;
    qualityLevel: 'proven' | 'experimental' | 'under_review';
    complianceVerified: boolean;
  };
  
  // Usage Statistics
  usage: {
    timesUsed: number;
    successfulUses: number;
    failedUses: number;
    lastUsed: string;
    avgCustomerSatisfaction: number;
  };
  
  // Pattern Metadata
  createdBy: string;
  createdAt: string;
  lastUpdated: string;
  version: string;                     // Pattern version (1.0, 1.1, etc.)
  status: 'active' | 'deprecated' | 'under_review';
}

// Firestore version
export interface JobPatternFirestore extends Omit<JobPattern, 'createdAt' | 'lastUpdated' | 'qualitySignoff'> {
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  qualitySignoff: Omit<JobPattern['qualitySignoff'], 'approvalDate'> & {
    approvalDate: Timestamp;
  };
}

// === Manufacturing Lot System ===

export interface ManufacturingLot {
  id: string;                          // Lot ID
  lotName: string;                     // Human readable name
  lotNumber: string;                   // LOT-2024-001
  patternId: string;                   // Source pattern (updated from jobPatternId)
  partNumber: string;
  
  // Lot Specification
  lotSpecification: {
    totalQuantity: number;
    completedQuantity: number;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    targetDeliveryDate: string;
    specialInstructions: string;
  };
  
  // Quality Inheritance from Pattern
  qualityInheritance: {
    inheritedFromPattern: string;      // Pattern ID
    expectedQualityScore: number;
    targetEfficiency: number;
    criticalParameters: Record<string, any>;
  };
  
  // Real-time Performance Tracking
  performanceTracking: {
    overallProgress: number;           // 0-100%
    avgQualityScore: number;
    onTimeDeliveryRate: number;
    defectRate: number;
    customerSatisfaction: number;
  };
  
  // Job IDs in this lot
  jobIds: string[];
  
  // Status
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  
  // Metadata
  createdBy: string;
  createdAt: string;
  lastUpdated: string;
}

// Firestore version
export interface ManufacturingLotFirestore extends Omit<ManufacturingLot, 'createdAt' | 'lastUpdated'> {
  createdAt: Timestamp;
  lastUpdated: Timestamp;
}

// === Search & Analytics Types ===

export interface PatternSearchCriteria {
  partNumber?: string;
  processTypes?: string[];
  qualityLevel?: ('proven' | 'experimental' | 'under_review')[];
  minQualityScore?: number;
  maxUsageCount?: number;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface PatternSimilarity {
  patternId: string;
  similarityScore: number;             // 0-100%
  matchingProcesses: string[];
  differences: {
    field: string;
    patternValue: any;
    currentValue: any;
    impact: 'low' | 'medium' | 'high';
  }[];
  riskAssessment: 'low' | 'medium' | 'high';
  recommendation: 'use_exact' | 'use_with_modifications' | 'create_new';
}

export interface ArchiveSearchCriteria {
  jobId?: string;
  partNumber?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  qualityScore?: {
    min: number;
    max: number;
  };
  archiveType?: ('completed' | 'cancelled' | 'pattern_creation' | 'quality_failure')[];
}

// === API Response Types ===

export interface ArchiveOperationResult {
  success: boolean;
  archiveId?: string;
  errors?: string[];
  warnings?: string[];
  metrics?: {
    processingTime: number;
    dataSize: number;
    formsArchived: number;
    qualityRecords: number;
  };
}

export interface PatternCreationResult {
  success: boolean;
  patternId?: string;
  patternName?: string;
  errors?: string[];
  warnings?: string[];
  qualityValidation: {
    passed: boolean;
    score: number;
    issues: string[];
  };
}

export interface LotCreationResult {
  success: boolean;
  lotId?: string;
  lotNumber?: string;
  jobsCreated: number;
  message?: string;
  errors?: string[];
  warnings?: string[];
}

export interface LotPerformanceUpdate {
  completedUnits?: number;
  qualityScore?: number;
  onTimeDelivery?: boolean;
  defectedUnits?: number;
  customerSatisfaction?: number;
}

export interface LotSearchCriteria {
  partNumber?: string;
  patternId?: string;
  status?: ('planning' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled')[];
  priority?: ('low' | 'normal' | 'high' | 'urgent')[];
  dateRange?: {
    start: string;
    end: string;
  };
} 