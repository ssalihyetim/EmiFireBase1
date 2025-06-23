import type { Timestamp } from "firebase/firestore";

// === Core Reference System ===

/**
 * Generic reference type for bidirectional relationships
 */
export interface Reference<T = any> {
  id: string;
  collection: string;
  metadata?: {
    displayName?: string;
    lastUpdated?: string;
    isActive?: boolean;
    relationshipType?: string;
  };
}

/**
 * Bidirectional reference that maintains relationships in both directions
 */
export interface BidirectionalReference<T = any> extends Reference<T> {
  reverseReference: {
    collection: string;
    field: string;
  };
}

/**
 * Event-driven reference that triggers updates when relationships change
 */
export interface EventDrivenReference<T = any> extends BidirectionalReference<T> {
  eventTriggers: {
    onCreate?: string[];
    onUpdate?: string[];
    onDelete?: string[];
  };
  cascadeRules: {
    onParentDelete: 'delete' | 'orphan' | 'reassign';
    onChildDelete: 'update_parent' | 'ignore';
  };
}

// === Base Entity Interface ===

/**
 * Base interface for all entities in the relational system
 */
export interface RelationalEntity {
  id: string;
  entityType: string;
  relationships: Map<string, Reference[]>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: number;
    lastModifiedBy?: string;
  };
}

/**
 * Traceability chain interface for complete manufacturing traceability
 */
export interface TraceabilityChain {
  rootEntity: Reference;
  chain: {
    entityId: string;
    entityType: string;
    relationships: Reference[];
    timestamp: string;
    operator?: string;
  }[];
  compliance: {
    as9100dClauses: string[];
    auditTrail: Reference[];
    retentionPeriod: number;
  };
}

// === Business Process Entities ===

export interface RelationalCustomer extends RelationalEntity {
  entityType: 'customer';
  customerData: {
    name: string;
    code: string;
    industry: string;
    certificationLevel: string;
  };
  contracts: EventDrivenReference<RelationalContract>[];
  orders: EventDrivenReference<RelationalOrder>[];
  specialRequirements: Reference<CustomerRequirement>[];
  qualificationStatus: Reference<CustomerQualification>;
  qualityRequirements: {
    as9100dLevel: string;
    specialClauses: string[];
    customRequirements: string[];
  };
}

export interface RelationalContract extends RelationalEntity {
  entityType: 'contract';
  contractData: {
    contractNumber: string;
    title: string;
    value: number;
    currency: string;
    startDate: string;
    endDate: string;
  };
  customerId: EventDrivenReference<RelationalCustomer>;
  orders: EventDrivenReference<RelationalOrder>[];
  requirements: Reference<ContractRequirement>[];
  flowDownMatrix: Reference<FlowDownRequirement>[];
  performance: {
    onTimeDeliveryRate: number;
    qualityScore: number;
    customerSatisfaction: number;
  };
}

export interface RelationalOrder extends RelationalEntity {
  entityType: 'order';
  orderData: {
    orderNumber: string;
    poNumber: string;
    orderDate: string;
    dueDate: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
  };
  contractId: EventDrivenReference<RelationalContract>;
  customerId: EventDrivenReference<RelationalCustomer>;
  jobs: EventDrivenReference<RelationalJob>[];
  orderItems: Reference<OrderItem>[];
  status: 'received' | 'processing' | 'manufacturing' | 'quality_check' | 'shipped' | 'delivered';
  trackingData: {
    currentPhase: string;
    completionPercentage: number;
    estimatedCompletion: string;
  };
}

// === Manufacturing Execution Entities ===

export interface RelationalJob extends RelationalEntity {
  entityType: 'job';
  jobData: {
    jobNumber: string;
    partNumber: string;
    partName: string;
    quantity: number;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    dueDate: string;
  };
  orderId: EventDrivenReference<RelationalOrder>;
  contractId: EventDrivenReference<RelationalContract>;
  customerId: EventDrivenReference<RelationalCustomer>;
  tasks: EventDrivenReference<RelationalJobTask>[];
  materialLots: EventDrivenReference<RelationalMaterialLot>[];
  partInstances: EventDrivenReference<RelationalPartInstance>[];
  routingSheet: Reference<RoutingSheet>;
  qualityPlan: Reference<QualityPlan>;
  archive?: Reference<JobArchive>;
  performanceData: Reference<JobPerformance>;
  timeRecords: Reference<TimeRecord>[];
  createdFromPatternId?: Reference<JobPattern>;
  lotId?: Reference<ManufacturingLot>;
  isPatternCandidate: boolean;
  status: 'pending' | 'in_progress' | 'quality_check' | 'completed' | 'on_hold' | 'blocked';
  currentPhase: string;
  completionPercentage: number;
  traceabilityChain: TraceabilityChain;
  complianceFramework: AS9100DComplianceFramework;
}

export interface RelationalJobTask extends RelationalEntity {
  entityType: 'job_task';
  taskData: {
    name: string;
    description: string;
    category: 'manufacturing_process' | 'non_manufacturing_task';
    status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'critical' | 'urgent';
  };
  jobId: EventDrivenReference<RelationalJob>;
  subtasks: EventDrivenReference<RelationalJobSubtask>[];
  operationRecords: Reference<OperationRecord>[];
  assignedMachine?: Reference<RelationalMachine>;
  assignedOperator?: Reference<RelationalOperator>;
  toolList?: Reference<ToolList>;
  setupSheet?: Reference<SetupSheet>;
  timeRecords: Reference<TaskTimeRecord>[];
  cycleTimeData: Reference<CycleTimeRecord>[];
  performanceTracking?: Reference<TaskPerformance>;
  qualityChecks: Reference<QualityCheck>[];
  inspectionRecords: Reference<InspectionRecord>[];
  qualityResult?: Reference<QualityResult>;
  manufacturingData?: {
    processType: string;
    machineType: string;
    setupTimeMinutes: number;
    cycleTimeMinutes: number;
    partCode: string;
  };
  schedulingData?: {
    scheduledMachineId: Reference<RelationalMachine>;
    scheduledStartTime: string;
    scheduledEndTime: string;
    scheduleEntryId: string;
  };
  traceabilityChain: TraceabilityChain;
}

export interface RelationalJobSubtask extends RelationalEntity {
  entityType: 'job_subtask';
  subtaskData: {
    name: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    isPrintable: boolean;
    hasCheckbox: boolean;
    isChecked: boolean;
  };
  taskId: EventDrivenReference<RelationalJobTask>;
  jobId: EventDrivenReference<RelationalJob>;
  manufacturingData?: {
    subtaskType: 'setup_sheet' | 'tool_list' | 'tool_life_verification' | 'machining' | 'fai';
    actualSetupTimeMinutes?: number;
    actualCycleTimeMinutes?: number;
    actualPiecesCompleted?: number;
    actualMachineId?: Reference<RelationalMachine>;
    actualOperator?: Reference<RelationalOperator>;
  };
  qualityTemplateId?: Reference<QualityTemplate>;
  qualityChecks: Reference<QualityCheck>[];
  complianceRecords: Reference<ComplianceRecord>[];
}

// === Resource Management Entities ===

export interface RelationalMachine extends RelationalEntity {
  entityType: 'machine';
  machineData: {
    machineNumber: string;
    machineName: string;
    machineType: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
  };
  capabilities: Reference<MachineCapability>[];
  currentTools: Reference<ToolInstance>[];
  maintenanceRecords: Reference<MaintenanceRecord>[];
  calibrationRecords: Reference<CalibrationRecord>[];
  currentJob?: Reference<RelationalJob>;
  currentTask?: Reference<RelationalJobTask>;
  currentOperator?: Reference<RelationalOperator>;
  scheduleEvents: Reference<CalendarEvent>[];
  utilizationData: Reference<MachineUtilization>[];
  performanceMetrics: Reference<MachinePerformance>;
  status: 'available' | 'in_use' | 'maintenance' | 'down' | 'setup';
  availabilitySchedule: {
    shift: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[];
}

export interface RelationalOperator extends RelationalEntity {
  entityType: 'operator';
  operatorData: {
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  certifications: Reference<OperatorCertification>[];
  trainingRecords: Reference<TrainingRecord>[];
  competencyAssessments: Reference<CompetencyAssessment>[];
  skillMatrix: Reference<SkillMatrix>;
  currentJob?: Reference<RelationalJob>;
  currentTask?: Reference<RelationalJobTask>;
  currentMachine?: Reference<RelationalMachine>;
  performanceHistory: Reference<OperatorPerformance>[];
  qualityHistory: Reference<QualityRecord>[];
  availability: {
    shift: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    skillLevel: string;
  }[];
  complianceStatus: {
    as9100dCertified: boolean;
    lastAssessment: string;
    nextAssessment: string;
    certificationLevel: string;
  };
}

// === Material Traceability System ===

export interface RelationalMaterialLot extends RelationalEntity {
  entityType: 'material_lot';
  materialData: {
    lotNumber: string;
    materialType: string;
    grade: string;
    specification: string;
    receivedDate: string;
    expirationDate?: string;
  };
  supplier: Reference<RelationalSupplier>;
  certificates: Reference<MaterialCertificate>[];
  testReports: Reference<MaterialTestReport>[];
  usageHistory: Reference<MaterialUsage>[];
  jobsUsed: Reference<RelationalJob>[];
  partsProduced: Reference<RelationalPartInstance>[];
  qualityStatus: 'approved' | 'pending' | 'rejected' | 'quarantined';
  complianceRecords: Reference<ComplianceRecord>[];
  inventoryData: {
    originalQuantity: number;
    currentQuantity: number;
    reservedQuantity: number;
    unit: string;
    location: string;
  };
}

export interface RelationalPartInstance extends RelationalEntity {
  entityType: 'part_instance';
  partData: {
    serialNumber: string;
    partNumber: string;
    partName: string;
    revision: string;
    productionDate: string;
  };
  jobId: EventDrivenReference<RelationalJob>;
  materialLots: Reference<RelationalMaterialLot>[];
  operationHistory: Reference<OperationRecord>[];
  qualityRecords: Reference<QualityRecord>[];
  inspectionRecords: Reference<InspectionRecord>[];
  nonConformances: Reference<NonConformanceReport>[];
  deliveryRecord?: Reference<DeliveryRecord>;
  customerAcceptance?: Reference<CustomerAcceptance>;
  traceabilityChain: TraceabilityChain;
  status: 'in_production' | 'quality_check' | 'approved' | 'shipped' | 'delivered';
  currentLocation: string;
}

export interface RelationalSupplier extends RelationalEntity {
  entityType: 'supplier';
  supplierData: {
    supplierCode: string;
    companyName: string;
    contactInfo: {
      address: string;
      phone: string;
      email: string;
      website?: string;
    };
  };
  materialLots: Reference<RelationalMaterialLot>[];
  certificates: Reference<SupplierCertificate>[];
  qualityAgreements: Reference<QualityAgreement>[];
  performanceMetrics: Reference<SupplierPerformance>;
  qualityMetrics: Reference<SupplierQuality>;
  auditRecords: Reference<SupplierAudit>[];
  certificationStatus: {
    iso9001: boolean;
    as9100d: boolean;
    nadcap: boolean;
    customCertifications: string[];
  };
  approvalStatus: 'approved' | 'conditional' | 'pending' | 'suspended';
  approvalHistory: Reference<ApprovalRecord>[];
}

// === Event System ===

export interface RelationshipEvent {
  id: string;
  eventType: 'create' | 'update' | 'delete' | 'link' | 'unlink';
  sourceEntity: {
    id: string;
    type: string;
    collection: string;
  };
  targetEntity: {
    id: string;
    type: string;
    collection: string;
  };
  relationship: string;
  timestamp: string;
  triggeredBy: string;
  cascadeRules: {
    updateRelated: boolean;
    notifyStakeholders: boolean;
    auditTrail: boolean;
  };
}

export interface CascadeUpdate {
  eventId: string;
  sourceChange: {
    entityId: string;
    field: string;
    oldValue: any;
    newValue: any;
  };
  cascadeTargets: {
    entityId: string;
    entityType: string;
    collection: string;
    updates: Record<string, any>;
  }[];
  executionOrder: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

// === AS9100D Compliance Framework ===

export interface AS9100DComplianceFramework {
  entityId: string;
  entityType: string;
  applicableClauses: {
    clauseNumber: string;
    clauseTitle: string;
    requirement: string;
    complianceLevel: 'required' | 'recommended' | 'optional';
  }[];
  complianceRecords: Reference<ComplianceRecord>[];
  auditTrail: Reference<AuditTrailEntry>[];
  nonCompliances: Reference<NonComplianceIssue>[];
  validationRules: {
    ruleId: string;
    description: string;
    validationFunction: string;
    isActive: boolean;
  }[];
  overallCompliance: {
    percentage: number;
    status: 'compliant' | 'non_compliant' | 'pending_review';
    lastAssessment: string;
    nextAssessment: string;
  };
}

// === Supporting Types ===

export interface CustomerRequirement {
  id: string;
  requirementType: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CustomerQualification {
  id: string;
  qualificationLevel: string;
  certifiedProcesses: string[];
  expirationDate: string;
}

export interface ContractRequirement {
  id: string;
  clauseReference: string;
  requirement: string;
  complianceLevel: 'required' | 'recommended';
}

export interface FlowDownRequirement {
  id: string;
  sourceClause: string;
  targetProcess: string;
  flowDownLevel: number;
}

export interface OrderItem {
  id: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Simple supporting types
export interface RoutingSheet { id: string; partNumber: string; operations: string[]; }
export interface QualityPlan { id: string; partNumber: string; inspectionPoints: string[]; }
export interface JobArchive { id: string; originalJobId: string; archiveDate: string; }
export interface JobPerformance { id: string; jobId: string; metrics: Record<string, number>; }
export interface TimeRecord { id: string; entityId: string; startTime: string; endTime: string; }
export interface JobPattern { id: string; patternName: string; sourceJobId: string; }
export interface ManufacturingLot { id: string; lotNumber: string; patternId: string; }
export interface OperationRecord { id: string; operationType: string; timestamp: string; }
export interface ToolList { id: string; tools: string[]; }
export interface SetupSheet { id: string; setupInstructions: string[]; }
export interface TaskTimeRecord { id: string; taskId: string; startTime: string; endTime: string; }
export interface CycleTimeRecord { id: string; cycleNumber: number; cycleTime: number; }
export interface TaskPerformance { id: string; taskId: string; performanceScore: number; }
export interface QualityCheck { id: string; checkType: string; result: string; }
export interface InspectionRecord { id: string; inspectionType: string; result: string; }
export interface QualityResult { id: string; score: number; result: string; }
export interface QualityTemplate { id: string; templateName: string; checkpoints: string[]; }
export interface MachineCapability { id: string; capability: string; specification: string; }
export interface ToolInstance { id: string; toolType: string; condition: string; }
export interface MaintenanceRecord { id: string; maintenanceType: string; date: string; }
export interface CalibrationRecord { id: string; calibrationDate: string; nextDue: string; }
export interface CalendarEvent { id: string; title: string; startTime: string; endTime: string; }
export interface MachineUtilization { id: string; machineId: string; utilizationPercentage: number; }
export interface MachinePerformance { id: string; machineId: string; performanceMetrics: Record<string, number>; }
export interface OperatorCertification { id: string; certificationType: string; issueDate: string; }
export interface TrainingRecord { id: string; trainingType: string; completionDate: string; }
export interface CompetencyAssessment { id: string; assessmentType: string; score: number; }
export interface SkillMatrix { id: string; operatorId: string; skills: Record<string, number>; }
export interface OperatorPerformance { id: string; operatorId: string; performanceMetrics: Record<string, number>; }
export interface QualityRecord { id: string; qualityScore: number; date: string; }
export interface MaterialCertificate { id: string; certificateType: string; issueDate: string; }
export interface MaterialTestReport { id: string; testType: string; results: Record<string, any>; }
export interface MaterialUsage { id: string; materialLotId: string; jobId: string; quantityUsed: number; }
export interface ComplianceRecord { id: string; clauseReference: string; complianceStatus: string; }
export interface SupplierCertificate { id: string; certificateType: string; validUntil: string; }
export interface QualityAgreement { id: string; agreementType: string; requirements: string[]; }
export interface SupplierPerformance { id: string; supplierId: string; performanceMetrics: Record<string, number>; }
export interface SupplierQuality { id: string; supplierId: string; qualityMetrics: Record<string, number>; }
export interface SupplierAudit { id: string; auditDate: string; auditor: string; findings: string[]; }
export interface ApprovalRecord { id: string; approvalType: string; approvalDate: string; }
export interface DeliveryRecord { id: string; deliveryDate: string; deliveryMethod: string; }
export interface CustomerAcceptance { id: string; acceptanceDate: string; acceptedBy: string; }
export interface NonConformanceReport { id: string; nonConformanceType: string; description: string; }
export interface AuditTrailEntry { id: string; action: string; timestamp: string; performedBy: string; }
export interface NonComplianceIssue { id: string; issueType: string; description: string; severity: 'low' | 'medium' | 'high' | 'critical'; } 