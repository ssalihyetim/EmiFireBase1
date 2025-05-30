// Manufacturing Templates and Documentation Types

export interface RawMaterialLot {
  lotNumber: string;
  materialType: string;
  dimension: string;
  supplier: string;
  receivedDate: string;
  certificationNumber?: string;
  notes?: string;
}

export interface RoutingSheetEntry {
  id: string;
  operationNumber: number;
  processName: string;
  machineNumber?: string;
  setupTime?: number;
  cycleTime?: number;
  operator?: string;
  dateCompleted?: string;
  timeStarted?: string;
  timeCompleted?: string;
  actualSetupTime?: number;
  actualCycleTime?: number;
  qualityCheck: boolean;
  notes?: string;
  signature?: string;
}

export interface RoutingSheet {
  id: string;
  jobId: string;
  taskId: string;
  partName: string;
  partNumber?: string;
  revision?: string;
  quantity: number;
  rawMaterialLot: RawMaterialLot;
  customerName: string;
  orderNumber: string;
  dueDate: string;
  priority: 'normal' | 'urgent' | 'critical';
  operations: RoutingSheetEntry[];
  totalSetupTime?: number;
  totalCycleTime?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'draft' | 'active' | 'completed' | 'on_hold';
  printedAt?: string;
  printedBy?: string;
}

export interface SetupSheetParameter {
  id: string;
  parameterName: string;
  specification: string;
  actualValue?: string;
  tolerance?: string;
  unit?: string;
  checkMethod: string;
  isCompliant?: boolean;
  checkedBy?: string;
  checkedAt?: string;
  notes?: string;
}

export interface SetupSheet {
  id: string;
  subtaskId: string;
  jobId: string;
  taskId: string;
  processName: string;
  machineNumber: string;
  operatorName?: string;
  setupDate?: string;
  setupStartTime?: string;
  setupEndTime?: string;
  workholding: string;
  programs: string[];
  toolList: string[]; // References to tool IDs
  parameters: SetupSheetParameter[];
  safetyRequirements: string[];
  qualityRequirements: string[];
  specialInstructions?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'approved' | 'in_use' | 'completed';
}

export interface Tool {
  id: string;
  toolNumber: string;
  toolType: 'end_mill' | 'drill' | 'tap' | 'reamer' | 'boring_bar' | 'insert' | 'other';
  diameter?: number;
  length?: number;
  material: string;
  coating?: string;
  manufacturer?: string;
  partNumber?: string;
  description: string;
  location?: string;
  condition: 'new' | 'good' | 'worn' | 'damaged' | 'retired';
  lastInspected?: string;
  notes?: string;
}

export interface ToolListEntry {
  id: string;
  toolId: string;
  tool: Tool;
  position: number;
  offsetNumber?: string;
  spindleSpeed?: number;
  feedRate?: number;
  depthOfCut?: number;
  operation: string;
  notes?: string;
}

export interface ToolList {
  id: string;
  processName: string;
  machineNumber: string;
  programNumber?: string;
  subtaskId?: string;
  jobId: string;
  taskId: string;
  tools: ToolListEntry[];
  totalTools: number;
  setupInstructions?: string;
  safetyNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  status: 'draft' | 'approved' | 'in_use';
}

// Template status and workflow
export interface TemplateWorkflow {
  templateType: 'routing_sheet' | 'setup_sheet' | 'tool_list';
  templateId: string;
  status: 'draft' | 'review' | 'approved' | 'active' | 'completed' | 'archived';
  currentStep: string;
  assignedTo?: string;
  dueDate?: string;
  completedSteps: string[];
  pendingApprovals: string[];
  history: TemplateHistoryEntry[];
}

export interface TemplateHistoryEntry {
  id: string;
  action: 'created' | 'modified' | 'approved' | 'rejected' | 'completed' | 'printed';
  performedBy: string;
  performedAt: string;
  notes?: string;
  changes?: Record<string, any>;
}

// Print configuration
export interface PrintConfiguration {
  templateType: 'routing_sheet' | 'setup_sheet' | 'tool_list';
  paperSize: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  includeSignatures: boolean;
  includeQRCode: boolean;
  includeLogo: boolean;
  customHeader?: string;
  customFooter?: string;
  copiesCount: number;
}

// Manufacturing process definitions
export interface ManufacturingProcess {
  id: string;
  name: string;
  category: 'turning' | 'milling' | 'drilling' | 'grinding' | 'inspection' | 'assembly' | 'finishing';
  requiredTemplates: ('routing_sheet' | 'setup_sheet' | 'tool_list')[];
  standardSetupTime?: number;
  standardCycleTime?: number;
  requiredTools: string[];
  safetyRequirements: string[];
  qualityCheckpoints: string[];
  skillLevel: 'entry' | 'intermediate' | 'advanced' | 'expert';
  description?: string;
}

// Lot number generation
export interface LotNumberConfig {
  prefix: string;
  dateFormat: 'YYYYMMDD' | 'YYMMDD' | 'MMDDYY';
  sequenceLength: number;
  separator: string;
  includeShift?: boolean;
  customSuffix?: string;
}

export interface GeneratedLotNumber {
  lotNumber: string;
  generatedAt: string;
  jobId: string;
  taskId: string;
  materialType: string;
  sequence: number;
  isUsed: boolean;
} 