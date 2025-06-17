import { Timestamp } from 'firebase/firestore';

/**
 * Represents a single tool in the company's tool database.
 * This is the central source of truth for tool information.
 */
export interface Tool {
  id: string;          // Unique identifier for the tool
  name: string;        // Common name for the tool (e.g., "10mm 4-Flute End Mill")
  partNumber?: string; // Manufacturer's part number or internal ID
  description?: string;
  
  // --- Geometric Properties ---
  diameter?: number;   // In millimeters
  length?: number;     // In millimeters
  flutes?: number;
  
  // --- Default Cutting Parameters (can be overridden per job) ---
  defaultRpm?: number;         // Revolutions per Minute
  defaultFeedRate?: number;    // Millimeters per Minute
  defaultDepthOfCut?: number;  // Ap (axial depth), in millimeters
  defaultWidthOfCut?: number;  // Ae (radial depth), in millimeters
  
  // --- Lifecycle Management ---
  lifeLimit?: number;      // Expected life in minutes or cycles
  lifeLimitUnit?: 'minutes' | 'cycles';
  
  // --- Tool Life Tracking (AS9100D Risk-Based Approach) ---
  currentLife?: number;        // Current accumulated life usage
  totalLifeUsed?: number;      // Total life used across all jobs
  riskLevel?: 'low' | 'medium' | 'high';  // Risk assessment based on criticality
  criticalityFactor?: number;  // 1-10 scale for part criticality
  lastInspectionDate?: string; // ISO date string
  nextInspectionDue?: string;  // ISO date string
  condition?: 'new' | 'good' | 'worn' | 'replace_soon' | 'retired';
  
  // --- Performance History ---
  performanceHistory?: ToolPerformanceRecord[];
  
  // --- Metadata ---
  createdAt: string;       // ISO date string
  updatedAt: string;       // ISO date string
}

/**
 * Tool performance record for tracking actual vs expected performance
 */
export interface ToolPerformanceRecord {
  id: string;
  jobId: string;
  taskId: string;
  operationName: string;
  partsProduced: number;
  actualLifeUsed: number;  // In minutes or cycles
  surfaceFinish?: number;  // Ra value if measured
  dimensionalAccuracy?: number; // Deviation from nominal
  wearMeasurement?: number; // Tool wear measurement
  operatorNotes?: string;
  qualityIssues?: string[];
  recordedAt: string;      // ISO date string
  recordedBy: string;      // User ID
}

/**
 * Tool life verification record for AS9100D compliance
 */
export interface ToolLifeVerification {
  id: string;
  toolListId: string;      // Reference to the tool list used
  jobId: string;
  taskId: string;
  subtaskId: string;
  verificationDate: string;
  verifiedBy: string;
  toolsVerified: ToolVerificationEntry[];
  riskAssessmentCompleted: boolean;
  criticalToolsIdentified: string[];  // Tool IDs of critical tools
  replacementToolsStaged: boolean;
  monitoringSystemActive: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Individual tool verification entry
 */
export interface ToolVerificationEntry {
  toolId: string;
  toolNumber: string;
  currentCondition: 'good' | 'wear_visible' | 'replace_soon' | 'replaced';
  lifeRemaining: number;   // Percentage or absolute value
  riskLevel: 'low' | 'medium' | 'high';
  actionRequired?: 'monitor' | 'replace_next_setup' | 'replace_immediately';
  inspectionNotes?: string;
  measurementsTaken?: ToolMeasurement[];
}

/**
 * Tool measurement record
 */
export interface ToolMeasurement {
  parameter: string;       // e.g., "Flank Wear", "Crater Depth"
  value: number;
  unit: string;
  tolerance?: {
    min: number;
    max: number;
  };
  withinTolerance: boolean;
}

/**
 * Represents a tool as stored in Firestore, using Timestamps.
 */
export interface ToolFirestoreData extends Omit<Tool, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Represents an entry in a job-specific Tool List.
 * It links a tool from the central database to a specific operation.
 */
export interface ToolListEntry extends Tool {
  // Overridden parameters for this specific job
  rpm?: number;
  feedRate?: number;
  depthOfCut?: number;
  widthOfCut?: number;
  
  // --- In-process Tracking ---
  currentLife: number; // In minutes or cycles
  notes?: string;
} 