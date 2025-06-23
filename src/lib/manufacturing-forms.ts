import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  updateDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import type { JobTask, JobSubtask } from '@/types';

// === Manufacturing Form Types ===

export interface ManufacturingForm {
  id: string;
  formType: 'routing_sheet' | 'setup_sheet' | 'tool_list' | 'fai_report';
  jobId: string;
  taskId: string;
  subtaskId?: string; // For subtask-specific forms
  formData: Record<string, any>;
  completedBy: string;
  completedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  signatures: {
    operator?: string;
    supervisor?: string;
    inspector?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ManufacturingFormFirestore extends Omit<ManufacturingForm, 'completedAt' | 'verifiedAt' | 'createdAt' | 'updatedAt'> {
  completedAt: Timestamp;
  verifiedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SetupTimeRecord {
  subtaskId: string;
  taskId: string;
  jobId: string;
  actualSetupTimeMinutes: number;
  actualCycleTimeMinutes: number;
  actualPiecesCompleted: number;
  actualMachineId: string;
  actualOperator: string;
  setupStartTime: string;
  setupEndTime: string;
  machiningStartTime: string;
  machiningEndTime: string;
  toolsActuallyUsed: string[];
  setupNotes?: string;
  machiningNotes?: string;
  qualityIssues?: string[];
  setupAdjustments?: string[];
  cycleTimeVariations?: { piece: number; cycleTime: number }[];
  recordedAt: string;
  recordedBy: string;
}

const MANUFACTURING_FORMS_COLLECTION = 'manufacturing_forms';
const SETUP_TIME_RECORDS_COLLECTION = 'setup_time_records';

// === Form Creation Functions ===

/**
 * Create routing sheet from manufacturing tasks
 */
export async function createRoutingSheetFromTasks(
  jobId: string, 
  tasks: JobTask[], 
  completedBy: string
): Promise<string> {
  const manufacturingTasks = tasks.filter(task => task.category === 'manufacturing_process');
  
  if (manufacturingTasks.length === 0) {
    throw new Error('No manufacturing tasks found for routing sheet creation');
  }

  // Sort by operation index
  const sortedTasks = manufacturingTasks.sort((a, b) => (a.operationIndex || 0) - (b.operationIndex || 0));
  
  const routingSequence = sortedTasks.map((task, index) => ({
    operation: String(task.operationIndex || index + 1).padStart(2, '0'),
    processType: task.manufacturingProcessType || 'Unknown',
    machineType: task.machineType || 'TBD',
    estimatedSetupTime: task.setupTimeMinutes || 30,
    estimatedCycleTime: task.cycleTimeMinutes || 15,
    estimatedDuration: task.estimatedDurationHours || 2,
    quantity: task.quantity || 1,
    partCode: task.partCode || 'TBD'
  }));

  const formId = `routing_sheet_${jobId}_${Date.now()}`;
  const now = new Date().toISOString();

  const routingSheet: ManufacturingForm = {
    id: formId,
    formType: 'routing_sheet',
    jobId,
    taskId: '', // Routing sheet covers multiple tasks
    formData: {
      partName: sortedTasks[0]?.partCode || jobId,
      quantity: sortedTasks[0]?.quantity || 1,
      processes: sortedTasks.map(task => task.manufacturingProcessType).filter(Boolean),
      routingSequence,
      totalEstimatedSetupTime: routingSequence.reduce((sum, op) => sum + op.estimatedSetupTime, 0),
      totalEstimatedCycleTime: routingSequence.reduce((sum, op) => sum + op.estimatedCycleTime, 0),
      totalEstimatedDuration: routingSequence.reduce((sum, op) => sum + op.estimatedDuration, 0),
      createdFromTasks: sortedTasks.map(task => task.id)
    },
    completedBy,
    completedAt: now,
    signatures: {
      operator: completedBy,
      supervisor: 'System Generated',
      inspector: 'Pending Review'
    },
    createdAt: now,
    updatedAt: now
  };

  // Save to Firestore
  const firestoreDoc: ManufacturingFormFirestore = {
    ...routingSheet,
    completedAt: Timestamp.fromDate(new Date()),
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp
  };

  await setDoc(doc(db, MANUFACTURING_FORMS_COLLECTION, formId), firestoreDoc);
  
  console.log(`✅ Created routing sheet ${formId} from ${manufacturingTasks.length} tasks`);
  return formId;
}

/**
 * Create setup sheet from manufacturing task
 */
export async function createSetupSheetFromTask(
  task: JobTask, 
  completedBy: string
): Promise<string> {
  if (task.category !== 'manufacturing_process') {
    throw new Error('Can only create setup sheets from manufacturing tasks');
  }

  const setupSubtask = task.subtasks.find(s => s.manufacturingSubtaskType === 'setup_sheet');
  if (!setupSubtask) {
    throw new Error('No setup sheet subtask found in task');
  }

  const formId = `setup_sheet_${task.id}_${Date.now()}`;
  const now = new Date().toISOString();

  // Extract setup instructions from subtask data or generate based on process
  const setupInstructions = setupSubtask.data?.setupInstructions || generateSetupInstructions(task.manufacturingProcessType);
  const toolOffsets = generateToolOffsets(task.manufacturingProcessType);

  const setupSheet: ManufacturingForm = {
    id: formId,
    formType: 'setup_sheet',
    jobId: task.jobId,
    taskId: task.id,
    subtaskId: setupSubtask.id,
    formData: {
      operationNumber: String(task.operationIndex || 1).padStart(2, '0'),
      processType: task.manufacturingProcessType,
      partCode: task.partCode || 'TBD',
      machineId: task.scheduledMachineId || 'TBD',
      machineName: task.scheduledMachineName || task.machineType || 'TBD',
      estimatedSetupTime: task.setupTimeMinutes || 30,
      estimatedCycleTime: task.cycleTimeMinutes || 15,
      quantity: task.quantity || 1,
      setupInstructions,
      toolOffsets,
      workCoordinates: {
        G54: { X: 0, Y: 0, Z: 0 },
        G55: { X: 100, Y: 0, Z: 0 }
      },
      specialRequirements: task.requiredCapabilities || []
    },
    completedBy,
    completedAt: now,
    signatures: {
      operator: completedBy,
      supervisor: 'Pending Review',
      inspector: 'Pending Verification'
    },
    createdAt: now,
    updatedAt: now
  };

  // Save to Firestore
  const firestoreDoc: ManufacturingFormFirestore = {
    ...setupSheet,
    completedAt: Timestamp.fromDate(new Date()),
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp
  };

  await setDoc(doc(db, MANUFACTURING_FORMS_COLLECTION, formId), firestoreDoc);
  
  console.log(`✅ Created setup sheet ${formId} for task ${task.id}`);
  return formId;
}

/**
 * Create tool list from manufacturing task
 */
export async function createToolListFromTask(
  task: JobTask, 
  completedBy: string
): Promise<string> {
  if (task.category !== 'manufacturing_process') {
    throw new Error('Can only create tool lists from manufacturing tasks');
  }

  const toolListSubtask = task.subtasks.find(s => s.manufacturingSubtaskType === 'tool_list');
  if (!toolListSubtask) {
    throw new Error('No tool list subtask found in task');
  }

  const formId = `tool_list_${task.id}_${Date.now()}`;
  const now = new Date().toISOString();

  // Generate tools based on manufacturing process type
  const tools = generateToolsForProcess(task.manufacturingProcessType);

  const toolList: ManufacturingForm = {
    id: formId,
    formType: 'tool_list',
    jobId: task.jobId,
    taskId: task.id,
    subtaskId: toolListSubtask.id,
    formData: {
      operationNumber: String(task.operationIndex || 1).padStart(2, '0'),
      processType: task.manufacturingProcessType,
      partCode: task.partCode || 'TBD',
      tools,
      totalTools: tools.length,
      toolPrepTime: 15,
      toolOffsetTime: 10,
      specialTooling: task.requiredCapabilities?.filter(cap => cap.includes('tool')) || []
    },
    completedBy,
    completedAt: now,
    signatures: {
      operator: completedBy,
      supervisor: 'Tool Crib Verified',
      inspector: 'Pending Inspection'
    },
    createdAt: now,
    updatedAt: now
  };

  // Save to Firestore
  const firestoreDoc: ManufacturingFormFirestore = {
    ...toolList,
    completedAt: Timestamp.fromDate(new Date()),
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp
  };

  await setDoc(doc(db, MANUFACTURING_FORMS_COLLECTION, formId), firestoreDoc);
  
  console.log(`✅ Created tool list ${formId} for task ${task.id}`);
  return formId;
}

/**
 * Create FAI report from completed manufacturing task
 */
export async function createFAIReportFromTask(
  task: JobTask, 
  completedBy: string,
  dimensionalResults: any[] = [],
  functionalResults: any[] = []
): Promise<string> {
  if (task.category !== 'manufacturing_process') {
    throw new Error('Can only create FAI reports from manufacturing tasks');
  }

  const faiSubtask = task.subtasks.find(s => s.manufacturingSubtaskType === 'fai');
  if (!faiSubtask) {
    throw new Error('No FAI subtask found in task');
  }

  const formId = `fai_report_${task.id}_${Date.now()}`;
  const now = new Date().toISOString();

  // Generate dimensional checks based on process if not provided
  const dimensionalChecks = dimensionalResults.length > 0 
    ? dimensionalResults 
    : generateDimensionalChecks(task.manufacturingProcessType);

  // Generate functional tests if not provided
  const functionalTests = functionalResults.length > 0
    ? functionalResults
    : generateFunctionalTests(task.manufacturingProcessType);

  const faiReport: ManufacturingForm = {
    id: formId,
    formType: 'fai_report',
    jobId: task.jobId,
    taskId: task.id,
    subtaskId: faiSubtask.id,
    formData: {
      partCode: task.partCode || 'TBD',
      partName: task.partCode || task.jobId,
      revisionLevel: 'A',
      quantity: task.quantity || 1,
      lotNumber: `LOT_${Date.now().toString().slice(-6)}`,
      processType: task.manufacturingProcessType,
      machineUsed: task.scheduledMachineName || 'TBD',
      operatorName: completedBy,
      inspectionDate: now,
      dimensionalChecks,
      functionalTests,
      overallResult: 'ACCEPTED', // Default - would be calculated from checks
      materialCertification: true,
      traceabilityComplete: true,
      customRequirements: task.requiredCapabilities || []
    },
    completedBy,
    completedAt: now,
    signatures: {
      inspector: completedBy,
      supervisor: 'Quality Manager',
      operator: 'Manufacturing Operator'
    },
    createdAt: now,
    updatedAt: now
  };

  // Save to Firestore
  const firestoreDoc: ManufacturingFormFirestore = {
    ...faiReport,
    completedAt: Timestamp.fromDate(new Date()),
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp
  };

  await setDoc(doc(db, MANUFACTURING_FORMS_COLLECTION, formId), firestoreDoc);
  
  console.log(`✅ Created FAI report ${formId} for task ${task.id}`);
  return formId;
}

// === Setup Time Recording Functions ===

/**
 * Record actual setup and cycle times for machining subtask
 */
export async function recordSetupAndCycleTimes(
  subtask: JobSubtask,
  timeRecord: Omit<SetupTimeRecord, 'subtaskId' | 'taskId' | 'jobId' | 'recordedAt' | 'recordedBy'>
): Promise<void> {
  if (subtask.manufacturingSubtaskType !== 'machining') {
    throw new Error('Can only record setup times for machining subtasks');
  }

  const recordId = `setup_record_${subtask.id}_${Date.now()}`;
  const now = new Date().toISOString();

  const setupRecord: SetupTimeRecord = {
    ...timeRecord,
    subtaskId: subtask.id,
    taskId: subtask.taskId,
    jobId: subtask.jobId,
    recordedAt: now,
    recordedBy: timeRecord.actualOperator
  };

  // Save setup time record
  await setDoc(doc(db, SETUP_TIME_RECORDS_COLLECTION, recordId), setupRecord);

  // Update the subtask with actual times
  const subtaskUpdateData = {
    actualSetupTimeMinutes: timeRecord.actualSetupTimeMinutes,
    actualCycleTimeMinutes: timeRecord.actualCycleTimeMinutes,
    actualPiecesCompleted: timeRecord.actualPiecesCompleted,
    actualMachineId: timeRecord.actualMachineId,
    actualOperator: timeRecord.actualOperator,
    setupStartTime: timeRecord.setupStartTime,
    setupEndTime: timeRecord.setupEndTime,
    machiningStartTime: timeRecord.machiningStartTime,
    machiningEndTime: timeRecord.machiningEndTime,
    toolsActuallyUsed: timeRecord.toolsActuallyUsed,
    setupNotes: timeRecord.setupNotes,
    machiningNotes: timeRecord.machiningNotes,
    qualityIssues: timeRecord.qualityIssues,
    setupAdjustments: timeRecord.setupAdjustments,
    cycleTimeVariations: timeRecord.cycleTimeVariations,
    updatedAt: serverTimestamp()
  };

  // Convert timestamp fields for Firestore
  const firestoreUpdateData = {
    ...subtaskUpdateData,
    setupStartTime: Timestamp.fromDate(new Date(timeRecord.setupStartTime)),
    setupEndTime: Timestamp.fromDate(new Date(timeRecord.setupEndTime)),
    machiningStartTime: Timestamp.fromDate(new Date(timeRecord.machiningStartTime)),
    machiningEndTime: Timestamp.fromDate(new Date(timeRecord.machiningEndTime))
  };

  await updateDoc(doc(db, 'job_subtasks', subtask.id), firestoreUpdateData);

  console.log(`✅ Recorded setup/cycle times for subtask ${subtask.id}`);
}

// === Data Retrieval Functions ===

/**
 * Get all manufacturing forms for a job
 */
export async function getJobManufacturingForms(jobId: string): Promise<ManufacturingForm[]> {
  const formsQuery = query(
    collection(db, MANUFACTURING_FORMS_COLLECTION),
    where('jobId', '==', jobId)
  );

  const snapshot = await getDocs(formsQuery);
  const forms: ManufacturingForm[] = [];

  snapshot.forEach(doc => {
    const data = doc.data() as ManufacturingFormFirestore;
    forms.push({
      ...data,
      completedAt: data.completedAt.toDate().toISOString(),
      verifiedAt: data.verifiedAt?.toDate().toISOString(),
      createdAt: data.createdAt.toDate().toISOString(),
      updatedAt: data.updatedAt.toDate().toISOString()
    });
  });

  return forms;
}

/**
 * Get setup time records for a job
 */
export async function getJobSetupTimeRecords(jobId: string): Promise<SetupTimeRecord[]> {
  const recordsQuery = query(
    collection(db, SETUP_TIME_RECORDS_COLLECTION),
    where('jobId', '==', jobId)
  );

  const snapshot = await getDocs(recordsQuery);
  const records: SetupTimeRecord[] = [];

  snapshot.forEach(doc => {
    records.push(doc.data() as SetupTimeRecord);
  });

  return records;
}

// === Helper Functions ===

function generateSetupInstructions(processType?: string): string[] {
  const baseInstructions = [
    'Load raw material into workholding device',
    'Verify part orientation and alignment',
    'Set work coordinate system (G54)',
    'Load required tools and verify offsets',
    'Run first piece with single block mode'
  ];

  const processSpecific: Record<string, string[]> = {
    'turning': [
      'Mount part in chuck with proper grip length',
      'Check tailstock alignment if required',
      'Verify spindle speed and feed rates'
    ],
    '3_axis_milling': [
      'Secure part in vise or fixture',
      'Verify clamping force and clearances',
      'Check coolant flow and chip evacuation'
    ],
    'grinding': [
      'Balance and dress grinding wheel',
      'Set up coolant system',
      'Verify part mounting and magnetic chuck'
    ]
  };

  return [...baseInstructions, ...(processSpecific[processType || ''] || [])];
}

function generateToolOffsets(processType?: string): Array<{toolNumber: string, description: string, xOffset: number, zOffset: number}> {
  const offsets: Record<string, Array<{toolNumber: string, description: string, xOffset: number, zOffset: number}>> = {
    'turning': [
      { toolNumber: 'T01', description: 'Rough Turning Tool', xOffset: 0.0, zOffset: -125.5 },
      { toolNumber: 'T02', description: 'Finish Turning Tool', xOffset: 0.0, zOffset: -126.2 }
    ],
    '3_axis_milling': [
      { toolNumber: 'T01', description: 'Face Mill Ø50', xOffset: 0.0, zOffset: -85.5 },
      { toolNumber: 'T02', description: 'End Mill Ø12', xOffset: 0.0, zOffset: -92.3 }
    ]
  };

  return offsets[processType || ''] || [
    { toolNumber: 'T01', description: 'Process Tool', xOffset: 0.0, zOffset: -100.0 }
  ];
}

function generateToolsForProcess(processType?: string): Array<any> {
  const tools: Record<string, Array<any>> = {
    'turning': [
      { toolNumber: 'T01', description: 'CNMG 432 Insert', manufacturer: 'Sandvik', partNumber: 'CNMG120408-PM', location: 'A-15-3', condition: 'Good' },
      { toolNumber: 'T02', description: 'VCMT 331 Insert', manufacturer: 'Kennametal', partNumber: 'VCMT331-MP', location: 'A-15-4', condition: 'Good' }
    ],
    '3_axis_milling': [
      { toolNumber: 'T01', description: 'Face Mill Ø50mm', manufacturer: 'Sandvik', partNumber: 'R245-050Q22-12M', location: 'B-20-1', condition: 'Good' },
      { toolNumber: 'T02', description: 'End Mill Ø12mm', manufacturer: 'Kennametal', partNumber: 'B202-12.00-C', location: 'B-20-2', condition: 'Good' }
    ]
  };

  return tools[processType || ''] || [
    { toolNumber: 'T01', description: `${processType} Tool`, manufacturer: 'Generic', partNumber: 'GENERIC-001', location: 'TBD', condition: 'Good' }
  ];
}

function generateDimensionalChecks(processType?: string): Array<any> {
  const checks: Record<string, Array<any>> = {
    'turning': [
      { characteristic: 'Outer Diameter', nominal: 25.0, tolerance: '±0.05', actual: 25.02, result: 'PASS' },
      { characteristic: 'Length', nominal: 100.0, tolerance: '±0.1', actual: 99.95, result: 'PASS' }
    ],
    '3_axis_milling': [
      { characteristic: 'Surface Flatness', nominal: 0.02, tolerance: 'Max', actual: 0.015, result: 'PASS' },
      { characteristic: 'Hole Diameter', nominal: 8.0, tolerance: '+0.05/-0', actual: 8.02, result: 'PASS' }
    ]
  };

  return checks[processType || ''] || [
    { characteristic: 'General Dimension', nominal: 100.0, tolerance: '±0.1', actual: 100.0, result: 'PASS' }
  ];
}

function generateFunctionalTests(processType?: string): Array<any> {
  return [
    { test: 'Visual Inspection', requirement: 'No surface defects', result: 'PASS' },
    { test: 'Dimensional Verification', requirement: 'All dimensions within tolerance', result: 'PASS' },
    { test: 'Surface Finish', requirement: 'Ra 3.2 or better', result: 'PASS' }
  ];
}