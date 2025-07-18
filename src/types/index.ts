import type { LucideIcon } from "lucide-react";
import type { Timestamp } from "firebase/firestore";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  disabled?: boolean;
  external?: boolean;
  items?: NavItem[];
}

// --- Quality System Document Types ---
export type QualityDocumentLevel = 'A' | 'B' | 'C' | 'D1' | 'D2';

export type QualitySystemDocumentType =
  | 'manual'
  | 'policy'
  | 'procedure'
  | 'workInstruction'
  | 'log' // For D1
  | 'form'; // For D2

export interface QualitySystemDocument {
  docId: string;
  title: string;
  level: QualityDocumentLevel;
  relevantClauses?: string;
  docType: QualitySystemDocumentType;
  filePath?: string;
}
// --- End Quality System Document Types ---

// --- Attachment Type ---
export interface Attachment {
  name: string;
  url: string; // Firebase Storage download URL
  type?: string; // File MIME type
  size?: number; // File size in bytes
  uploadedAt?: string; // ISO string of upload time
}

// --- Task & Subtask Management Types ---
export type {
  TaskStatus,
  SubtaskStatus,
  TaskPriority,
  TaskTemplate,
  SubtaskTemplate,
  JobTask,
  JobSubtask,
  JobTaskFirestore,
  JobSubtaskFirestore,
  TaskProgress,
  TaskMetrics,
  TaskAssignment,
  TaskDependency,
  QualityCheckpoint,
  TaskAuditTrail,
  TaskConfiguration,
  TaskFilter,
  TaskSearchResult
} from './tasks';
// --- End Task & Subtask Management Types ---

// --- Offer Management Types ---
export type OfferStatus = 'Draft' | 'Sent' | 'Under Review' | 'Accepted' | 'Rejected' | 'Archived';

export interface OfferItem {
  id: string;
  partName: string;
  rawMaterialType?: string;
  rawMaterialDimension?: string;
  materialCost: number;
  machiningCost: number;
  outsourcedProcessesCost: number;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  assignedProcesses?: string[];
  attachments?: Attachment[];
  // Planning data
  planningData?: {
    processes: Array<{
      id: string;
      name: string;
      machineType: 'turning' | 'milling' | '5-axis';
      setupTimeMinutes: number;
      cycleTimeMinutes: number;
      orderIndex: number;
      estimatedCost: number;
      dependencies?: string[];
    }>;
    estimatedTotalTimeMinutes: number;
    estimatedTotalCost: number;
    processSequence?: Array<{
      processName: string;
      orderIndex: number;
      dependencies: string[];
    }>;
  };
}

// Interface for data as stored in Firestore (with Timestamps)
export interface OfferFirestoreData {
  // id is not part of the data itself, it's the document ID
  offerNumber: string;
  clientName: string;
  createdDate: Timestamp;
  lastUpdated: Timestamp;
  status: OfferStatus;
  currency: "EUR" | "USD" | "GBP";
  vatRate: number;
  items: OfferItem[];
  notes?: string;
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
}

// Interface for data as used in components (with ISO date strings)
export interface Offer extends Omit<OfferFirestoreData, 'createdDate' | 'lastUpdated'> {
  id: string;
  createdDate: string;
  lastUpdated: string;
  items: OfferItem[];
}
// --- End Offer Management Types ---


export type OrderStatus = 'New' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

// Interface for data as stored in Firestore (with Timestamps)
export interface OrderFirestoreData {
  offerId: string;
  orderNumber: string;
  clientName: string;
  orderDate: Timestamp;
  items: OfferItem[];
  currency: Offer["currency"];
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  status: OrderStatus;
  dueDate?: Timestamp | null;
  trackingInfo?: string;
  sentDate?: Timestamp | null;
}

// Interface for data as used in components (with ISO date strings)
export interface Order extends Omit<OrderFirestoreData, 'orderDate' | 'dueDate' | 'sentDate'> {
  id: string;
  orderDate: string;
  dueDate?: string;
  sentDate?: string;
  items: OfferItem[];
}


export interface BalanceEntry {
  id: string;
  name: string;
  totalDue: number;
  totalPaid: number;
  currency: string;
}

// --- Job Management Types ---
export type JobStatus = 'Pending' | 'In Progress' | 'Awaiting Next Process' | 'Completed' | 'On Hold' | 'Blocked';

export interface Job {
  id: string;
  orderId: string;
  orderNumber: string;
  clientName: string;
  item: OfferItem;
  status: JobStatus;
  dueDate?: string; // ISO date string (YYYY-MM-DD)
  priority?: 'normal' | 'urgent' | 'critical';
  specialInstructions?: string;
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
  
  // Pattern & Archival tracking (for archival system)
  createdFromPatternId?: string;        // Source pattern if created from pattern
  lotId?: string;                       // Lot membership
  isPatternCandidate?: boolean;         // Can become pattern
  actualStartDate?: string;             // When actually started
  actualCompletionDate?: string;        // When actually completed
  overallQualityScore?: number;         // Final quality rating
  isArchived?: boolean;                 // Archived status
  archiveId?: string;                   // Archive reference
  lotInfo?: LotInfo; // Add lot tracking
}

// Add lot tracking interface
export interface LotInfo {
  lotNumber: number;        // Sequential lot number (1, 2, 3, etc.)
  lotId: string;           // Unique lot identifier
  partNumber: string;      // The base part number (e.g., "1606P")
  totalLotsForPart: number; // How many lots exist for this part
  createdAt: string;       // When this lot was created
  completedAt?: string;    // When this lot was completed
  archivedAt?: string;     // When this lot was archived
}
// --- End Job Management Types ---

// --- Record Entry Types ---

// For FRM-712-001 Equipment Maintenance Log
export type MaintenanceType = 'Preventive' | 'Corrective' | 'Calibration Check' | 'Other';
export type MaintenanceStatus = 'Completed' | 'Pending Parts' | 'Scheduled';

export interface EquipmentMaintenanceLogEntryFirestore {
  logDocId: 'FRM-712-001';
  equipmentId: string;
  equipmentName: string;
  maintenanceDate: Timestamp;
  maintenanceType: MaintenanceType;
  description: string;
  performedBy: string;
  partsUsed?: string;
  nextDueDate?: Timestamp | null;
  status: MaintenanceStatus;
  notes?: string;
  createdAt?: Timestamp;
}
export interface EquipmentMaintenanceLogEntry extends Omit<EquipmentMaintenanceLogEntryFirestore, 'maintenanceDate' | 'nextDueDate' | 'createdAt'>{
  id: string;
  maintenanceDate: string;
  nextDueDate?: string;
  createdAt?: string;
}


// For FRM-420-001 Interested Party Register
export interface InterestedPartyRegisterEntryFirestore {
  logDocId: 'FRM-420-001';
  partyType: string;
  partyName: string;
  needsAndExpectations: string;
  monitoringMethod: string;
  reviewFrequency: string;
  lastReviewedDate?: Timestamp | null;
  notes?: string;
  createdAt?: Timestamp;
}
export interface InterestedPartyRegisterEntry extends Omit<InterestedPartyRegisterEntryFirestore, 'lastReviewedDate' | 'createdAt'> {
  id: string;
  lastReviewedDate?: string;
  createdAt?: string;
}


// For FRM-612-001 Risk Assessment & Mitigation Log
export type RiskLikelihood = 'Low' | 'Medium' | 'High';
export type RiskSeverity = 'Low' | 'Medium' | 'High';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type RiskActionStatus = 'Open' | 'In Progress' | 'Completed' | 'Closed';

export interface RiskAssessmentLogEntryFirestore {
  logDocId: 'FRM-612-001';
  riskIdentificationDate: Timestamp;
  riskSource: string;
  riskDescription: string;
  potentialImpact: string;
  likelihood: RiskLikelihood;
  severity: RiskSeverity;
  riskLevel: RiskLevel;
  mitigationActions: string;
  responsiblePerson: string;
  actionStatus: RiskActionStatus;
  completionTargetDate?: Timestamp | null;
  effectivenessReviewDate?: Timestamp | null;
  notes?: string;
  createdAt?: Timestamp;
}
export interface RiskAssessmentLogEntry extends Omit<RiskAssessmentLogEntryFirestore, 'riskIdentificationDate' | 'completionTargetDate' | 'effectivenessReviewDate' | 'createdAt'> {
  id: string;
  riskIdentificationDate: string;
  completionTargetDate?: string;
  effectivenessReviewDate?: string;
  createdAt?: string;
}

export interface GenericLogEntry {
  id: string;
  logDocId: string;
  entryDate: string;
  details: string;
  enteredBy: string;
}

export interface GenericFormSubmission {
  id: string;
  formDocId: string;
  submissionDate: string;
  submittedBy: string;
  formData: Record<string, any>;
  status: 'Submitted' | 'Reviewed' | 'Approved' | 'Rejected';
}

// --- Planning Module Types ---
export * from './planning';
// --- End Planning Module Types ---
