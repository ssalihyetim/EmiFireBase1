import type { TaskTemplate, ManufacturingProcessType, NonManufacturingTaskType, TaskPriority } from '../types/tasks';

// === Non-Manufacturing Task Templates ===

export const NON_MANUFACTURING_TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'contract_review',
    name: 'Contract Review',
    description: 'Review customer requirements, specifications, and contract terms',
    category: 'non_manufacturing_task',
    nonManufacturingTaskType: 'contract_review',
    priority: 'high',
    estimatedDurationHours: 2,
    as9100dClause: '8.2.3.1',
    dependencies: [],
    isParallel: false,
    requiredDocuments: ['customer_po', 'technical_drawings', 'specifications'],
    requiredApprovals: ['sales_manager', 'engineering_lead']
  },
  {
    id: 'material_approval',
    name: 'Material Approval',
    description: 'Verify and approve raw materials meet specifications',
    category: 'non_manufacturing_task',
    nonManufacturingTaskType: 'material_approval',
    priority: 'high',
    estimatedDurationHours: 1,
    as9100dClause: '8.4.3',
    dependencies: ['contract_review'],
    isParallel: false,
    requiredDocuments: ['material_cert', 'test_reports'],
    requiredApprovals: ['quality_manager']
  },
  {
    id: 'lot_based_production_planning',
    name: 'Lot Based Production Planning & Scheduling',
    description: 'Plan and schedule production based on lot requirements and capacity',
    category: 'non_manufacturing_task',
    nonManufacturingTaskType: 'lot_based_production_planning',
    priority: 'high',
    estimatedDurationHours: 1.67, // 100 minutes total (15+30+30+25)
    as9100dClause: '8.1',
    dependencies: ['material_approval'],
    isParallel: false,
    requiredDocuments: ['capacity_analysis', 'resource_plan', 'routing_sheet', 'production_schedule'],
    requiredApprovals: ['production_manager']
  },
  {
    id: 'final_inspection',
    name: 'Final Inspection',
    description: 'Complete final quality inspection and documentation',
    category: 'non_manufacturing_task',
    nonManufacturingTaskType: 'final_inspection',
    priority: 'critical',
    estimatedDurationHours: 1.5,
    as9100dClause: '8.6',
    dependencies: [], // Set dynamically based on manufacturing processes
    isParallel: false,
    requiredDocuments: ['inspection_sheet', 'dimensional_reports'],
    requiredApprovals: ['quality_inspector']
  },
  {
    id: 'packaging',
    name: 'Packaging',
    description: 'Package parts according to customer requirements',
    category: 'non_manufacturing_task',
    nonManufacturingTaskType: 'packaging',
    priority: 'medium',
    estimatedDurationHours: 0.5,
    as9100dClause: '8.5.4',
    dependencies: ['final_inspection'],
    isParallel: false,
    requiredDocuments: ['packaging_spec'],
    requiredApprovals: []
  },
  {
    id: 'shipping',
    name: 'Shipping',
    description: 'Prepare and ship parts to customer',
    category: 'non_manufacturing_task',
    nonManufacturingTaskType: 'shipping',
    priority: 'medium',
    estimatedDurationHours: 0.5,
    as9100dClause: '8.2.4',
    dependencies: ['packaging'],
    isParallel: false,
    requiredDocuments: ['shipping_docs', 'certs_of_compliance'],
    requiredApprovals: ['shipping_supervisor']
  }
];

// === Manufacturing Process Templates ===

export const MANUFACTURING_PROCESS_TEMPLATES: TaskTemplate[] = [
  {
    id: 'turning_process',
    name: 'Turning Process',
    description: 'CNC turning operations on lathe machines',
    category: 'manufacturing_process',
    manufacturingProcessType: 'turning',
    priority: 'high',
    estimatedDurationHours: 4,
    as9100dClause: '8.5.1',
    dependencies: ['material_approval'],
    isParallel: true,
    machineType: 'turning',
    setupTimeMinutes: 30,
    cycleTimeMinutes: 5,
    requiredCapabilities: ['turning', 'live_tooling']
  },
  {
    id: '3_axis_milling_process',
    name: '3-Axis Milling Process',
    description: 'CNC milling operations on 3-axis machines',
    category: 'manufacturing_process',
    manufacturingProcessType: '3_axis_milling',
    priority: 'high',
    estimatedDurationHours: 6,
    as9100dClause: '8.5.1',
    dependencies: ['material_approval'],
    isParallel: true,
    machineType: '3_axis_milling',
    setupTimeMinutes: 45,
    cycleTimeMinutes: 8,
    requiredCapabilities: ['3_axis_milling', 'high_speed_machining']
  },
  {
    id: '4_axis_milling_process',
    name: '4-Axis Milling Process',
    description: 'CNC milling operations on 4-axis machines with rotary axis',
    category: 'manufacturing_process',
    manufacturingProcessType: '4_axis_milling',
    priority: 'high',
    estimatedDurationHours: 8,
    as9100dClause: '8.5.1',
    dependencies: ['material_approval'],
    isParallel: true,
    machineType: '4_axis_milling',
    setupTimeMinutes: 60,
    cycleTimeMinutes: 12,
    requiredCapabilities: ['4_axis_milling', 'rotary_positioning']
  },
  {
    id: '5_axis_milling_process',
    name: '5-Axis Milling Process',
    description: 'Complex CNC milling operations on 5-axis machines',
    category: 'manufacturing_process',
    manufacturingProcessType: '5_axis_milling',
    priority: 'critical',
    estimatedDurationHours: 12,
    as9100dClause: '8.5.1',
    dependencies: ['material_approval'],
    isParallel: true,
    machineType: '5_axis_milling',
    setupTimeMinutes: 90,
    cycleTimeMinutes: 20,
    requiredCapabilities: ['5_axis_milling', 'simultaneous_5_axis', 'complex_geometry']
  }
];

// === Combined Task Templates ===

export const ALL_TASK_TEMPLATES = [
  ...NON_MANUFACTURING_TASK_TEMPLATES,
  ...MANUFACTURING_PROCESS_TEMPLATES
];

// === Template Lookup Functions ===

export function getTaskTemplateById(id: string): TaskTemplate | undefined {
  return ALL_TASK_TEMPLATES.find(template => template.id === id);
}

export function getNonManufacturingTaskTemplates(): TaskTemplate[] {
  return NON_MANUFACTURING_TASK_TEMPLATES;
}

export function getManufacturingProcessTemplates(): TaskTemplate[] {
  return MANUFACTURING_PROCESS_TEMPLATES;
}

export function getTaskTemplateByProcessType(processType: ManufacturingProcessType): TaskTemplate | undefined {
  return MANUFACTURING_PROCESS_TEMPLATES.find(template => 
    template.manufacturingProcessType === processType
  );
}

export function getTaskTemplateByNonManufacturingType(taskType: NonManufacturingTaskType): TaskTemplate | undefined {
  return NON_MANUFACTURING_TASK_TEMPLATES.find(template => 
    template.nonManufacturingTaskType === taskType
  );
}

// === Process to Task Mapping ===
// Maps process names from operations to task template IDs
export const PROCESS_TO_TASK_MAP: Record<string, string> = {
  'Turning': 'turning_process',
  'turning': 'turning_process',
  '3-Axis Milling': '3_axis_milling_process',
  '3_axis_milling': '3_axis_milling_process',
  'milling': '3_axis_milling_process', // Default milling to 3-axis
  '4-Axis Milling': '4_axis_milling_process',
  '4_axis_milling': '4_axis_milling_process',
  '5-Axis Milling': '5_axis_milling_process',
  '5_axis_milling': '5_axis_milling_process',
  '5-axis': '5_axis_milling_process'
};

// === Required Tasks for Every Job ===
// These non-manufacturing tasks are compulsory for every job
export const COMPULSORY_TASK_IDS = [
  'contract_review',
  'material_approval',
  'lot_based_production_planning',
  'final_inspection',
  'packaging',
  'shipping'
];

export const COMPULSORY_TASKS = COMPULSORY_TASK_IDS.map(id => 
  getTaskTemplateById(id)!
);

// === Task Dependencies ===
// Set up dependencies between manufacturing and non-manufacturing tasks
export function setupTaskDependencies(tasks: TaskTemplate[], manufacturingProcesses: string[]): void {
  // Final inspection depends on all manufacturing processes being complete
  const finalInspectionTask = tasks.find(t => t.id === 'final_inspection');
  if (finalInspectionTask && manufacturingProcesses.length > 0) {
    const manufacturingTaskIds = manufacturingProcesses.map(process => 
      PROCESS_TO_TASK_MAP[process]
    ).filter(Boolean);
    
    finalInspectionTask.dependencies = [...(finalInspectionTask.dependencies || []), ...manufacturingTaskIds];
  }
}

// === Utility Functions ===

export function isManufacturingProcess(taskTemplate: TaskTemplate): boolean {
  return taskTemplate.category === 'manufacturing_process';
}

export function isNonManufacturingTask(taskTemplate: TaskTemplate): boolean {
  return taskTemplate.category === 'non_manufacturing_task';
}

export function getEstimatedTotalTime(templates: TaskTemplate[]): number {
  return templates.reduce((total, template) => 
    total + (template.estimatedDurationHours || 0), 0
  );
}

export function getManufacturingProcessesForJob(assignedProcesses: string[]): TaskTemplate[] {
  return assignedProcesses
    .map(process => PROCESS_TO_TASK_MAP[process])
    .filter(Boolean)
    .map(templateId => getTaskTemplateById(templateId)!)
    .filter(Boolean);
}

// === New Function for Task Automation ===

/**
 * Get task templates for a list of processes
 * Includes both manufacturing processes and compulsory non-manufacturing tasks
 */
export function getTaskTemplatesForProcesses(processes: string[]): TaskTemplate[] {
  const templates: TaskTemplate[] = [];
  
  // Always include compulsory tasks (non-manufacturing)
  templates.push(...COMPULSORY_TASKS);
  
  // Add manufacturing process templates based on assigned processes
  const manufacturingTemplates = getManufacturingProcessesForJob(processes);
  templates.push(...manufacturingTemplates);
  
  // Setup dependencies between tasks
  setupTaskDependencies(templates, processes);
  
  return templates;
} 