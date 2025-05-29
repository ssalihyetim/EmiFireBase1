import type { TaskTemplate } from '@/types/tasks';
import { manufacturingProcesses } from './processes';

// === Compulsory Tasks (Required for Every Job) ===

export const COMPULSORY_TASKS: TaskTemplate[] = [
  {
    id: 'contract_review',
    name: 'Contract & Drawing Review',
    description: 'Review customer contract, drawings, specifications, and requirements for accuracy and feasibility',
    type: 'compulsory',
    priority: 'critical',
    category: 'documentation',
    requiredSubtasks: ['contract_analysis', 'drawing_review', 'specification_check', 'feasibility_assessment'],
    estimatedDurationHours: 2,
    as9100dClause: '8.2',
    dependencies: [],
    isParallel: false
  },
  {
    id: 'production_planning',
    name: 'Production Planning & Scheduling',
    description: 'Plan production sequence, resource allocation, and timeline for job completion',
    type: 'compulsory',
    priority: 'high',
    category: 'planning',
    requiredSubtasks: ['resource_planning', 'timeline_creation', 'capacity_check', 'routing_sheet'],
    estimatedDurationHours: 1.5,
    as9100dClause: '8.1',
    dependencies: ['contract_review'],
    isParallel: false
  },
  {
    id: 'material_verification',
    name: 'Material Identification & Verification',
    description: 'Verify material type, dimensions, certificates, and traceability requirements',
    type: 'compulsory',
    priority: 'critical',
    category: 'quality',
    requiredSubtasks: ['material_cert_check', 'dimension_verification', 'traceability_setup', 'material_marking'],
    estimatedDurationHours: 0.5,
    as9100dClause: '8.5.2',
    dependencies: ['production_planning'],
    isParallel: true
  },
  {
    id: 'work_instructions_review',
    name: 'Work Instructions Review',
    description: 'Review and prepare all work instructions, procedures, and setup documentation',
    type: 'compulsory',
    priority: 'high',
    category: 'documentation',
    requiredSubtasks: ['procedure_review', 'setup_instructions', 'safety_requirements', 'quality_checkpoints'],
    estimatedDurationHours: 1,
    as9100dClause: '8.5.1',
    dependencies: ['material_verification'],
    isParallel: true
  },
  {
    id: 'final_inspection',
    name: 'Final Inspection & Testing',
    description: 'Perform final dimensional inspection, functional testing, and quality verification',
    type: 'compulsory',
    priority: 'critical',
    category: 'quality',
    requiredSubtasks: ['dimensional_inspection', 'surface_finish_check', 'functional_test', 'quality_documentation'],
    estimatedDurationHours: 1,
    as9100dClause: '8.6',
    dependencies: [], // Will be set dynamically based on production tasks
    isParallel: false
  },
  {
    id: 'packaging_delivery',
    name: 'Packaging & Delivery Preparation',
    description: 'Prepare parts for shipment with proper packaging, labeling, and documentation',
    type: 'compulsory',
    priority: 'medium',
    category: 'logistics',
    requiredSubtasks: ['cleaning_prep', 'packaging_selection', 'labeling', 'shipping_documentation'],
    estimatedDurationHours: 0.5,
    as9100dClause: '8.5.4',
    dependencies: ['final_inspection'],
    isParallel: false
  },
  {
    id: 'documentation_completion',
    name: 'Quality Records Completion',
    description: 'Complete all quality records, certificates, and traceability documentation',
    type: 'compulsory',
    priority: 'high',
    category: 'documentation',
    requiredSubtasks: ['quality_records', 'coc_generation', 'traceability_docs', 'archive_records'],
    estimatedDurationHours: 0.5,
    as9100dClause: '7.5',
    dependencies: ['final_inspection'],
    isParallel: true
  }
];

// === Optional Tasks (Process-Specific) ===

export const OPTIONAL_TASKS: TaskTemplate[] = [
  // TURNING OPERATIONS
  {
    id: 'turning_operation',
    name: 'Turning Operation',
    description: 'CNC turning operations including setup, machining, and in-process inspection',
    type: 'optional',
    priority: 'high',
    category: 'production',
    applicableProcesses: ['Turning'],
    requiredSubtasks: ['turning_setup', 'turning_tooling', 'turning_program', 'turning_first_article', 'turning_production'],
    estimatedDurationHours: 4,
    as9100dClause: '8.5.1',
    dependencies: ['work_instructions_review'],
    isParallel: true
  },

  // MILLING OPERATIONS
  {
    id: 'milling_3axis',
    name: '3-Axis Milling Operation',
    description: '3-axis CNC milling operations including setup, programming, and machining',
    type: 'optional',
    priority: 'high',
    category: 'production',
    applicableProcesses: ['3-Axis Milling'],
    requiredSubtasks: ['milling_setup_sheet', 'milling_tool_list', 'milling_cam_program', 'milling_first_article'],
    estimatedDurationHours: 6,
    as9100dClause: '8.5.1',
    dependencies: ['work_instructions_review'],
    isParallel: true
  },
  {
    id: 'milling_4axis',
    name: '4-Axis Milling Operation',
    description: '4-axis CNC milling with rotary axis setup and complex geometry machining',
    type: 'optional',
    priority: 'high',
    category: 'production',
    applicableProcesses: ['4-Axis Milling'],
    requiredSubtasks: ['milling_complex_setup', 'milling_4axis_calibration', 'milling_tool_list_oriented', 'milling_cam_simulation', 'milling_first_article'],
    estimatedDurationHours: 8,
    as9100dClause: '8.5.1',
    dependencies: ['work_instructions_review'],
    isParallel: true
  },
  {
    id: 'milling_5axis',
    name: '5-Axis Milling Operation',
    description: '5-axis simultaneous CNC milling for complex aerospace components',
    type: 'optional',
    priority: 'critical',
    category: 'production',
    applicableProcesses: ['5-Axis Milling'],
    requiredSubtasks: ['operator_qualification_check', 'milling_complex_setup', 'milling_cam_validation', 'surface_roughness_inspection', 'milling_first_article'],
    estimatedDurationHours: 12,
    as9100dClause: '8.5.1',
    dependencies: ['work_instructions_review'],
    isParallel: true
  },

  // GRINDING OPERATIONS
  {
    id: 'grinding_operation',
    name: 'Precision Grinding Operation',
    description: 'Surface, cylindrical, or centerless grinding for tight tolerances',
    type: 'optional',
    priority: 'high',
    category: 'production',
    applicableProcesses: ['Grinding'],
    requiredSubtasks: ['grinding_wheel_selection', 'grinding_setup', 'surface_finish_requirements', 'grinding_inspection'],
    estimatedDurationHours: 3,
    as9100dClause: '8.5.1',
    dependencies: ['work_instructions_review'],
    isParallel: true
  },

  // SPECIAL PROCESSES
  {
    id: 'anodizing_process',
    name: 'Anodizing Process Control',
    description: 'Anodizing special process management and quality control',
    type: 'optional',
    priority: 'high',
    category: 'special_process',
    applicableProcesses: ['Anodizing'],
    requiredSubtasks: ['special_process_approval', 'anodizing_supplier_cert', 'anodizing_process_validation', 'coating_thickness_verification'],
    estimatedDurationHours: 2,
    as9100dClause: '8.5.1.2',
    dependencies: ['work_instructions_review'],
    isParallel: true
  },
  {
    id: 'heat_treatment',
    name: 'Heat Treatment Process Control',
    description: 'Heat treatment special process management and certification',
    type: 'optional',
    priority: 'critical',
    category: 'special_process',
    applicableProcesses: ['Heat Treatment'],
    requiredSubtasks: ['heat_treatment_approval', 'heat_treatment_certification', 'material_property_verification', 'heat_treatment_records'],
    estimatedDurationHours: 1,
    as9100dClause: '8.5.1.2',
    dependencies: ['work_instructions_review'],
    isParallel: true
  },

  // OTHER MANUFACTURING PROCESSES
  {
    id: 'laser_cutting',
    name: 'Laser Cutting Operation',
    description: 'Laser cutting setup, programming, and quality control',
    type: 'optional',
    priority: 'medium',
    category: 'production',
    applicableProcesses: ['Laser Cutting'],
    requiredSubtasks: ['laser_program_setup', 'material_nesting', 'laser_cutting_params', 'edge_quality_check'],
    estimatedDurationHours: 2,
    as9100dClause: '8.5.1',
    dependencies: ['work_instructions_review'],
    isParallel: true
  },
  {
    id: 'welding_operation',
    name: 'Welding Operation',
    description: 'Welding process setup, execution, and inspection',
    type: 'optional',
    priority: 'high',
    category: 'production',
    applicableProcesses: ['Welding'],
    requiredSubtasks: ['welding_procedure_qualification', 'welder_certification', 'welding_setup', 'weld_inspection'],
    estimatedDurationHours: 4,
    as9100dClause: '8.5.1',
    dependencies: ['work_instructions_review'],
    isParallel: true
  },
  {
    id: 'assembly_operation',
    name: 'Assembly Operation',
    description: 'Component assembly with torque specifications and testing',
    type: 'optional',
    priority: 'medium',
    category: 'production',
    applicableProcesses: ['Assembly'],
    requiredSubtasks: ['assembly_instructions', 'torque_specifications', 'assembly_sequence', 'final_assembly_test'],
    estimatedDurationHours: 3,
    as9100dClause: '8.5.1',
    dependencies: ['work_instructions_review'],
    isParallel: true
  }
];

// === Helper Functions ===

export const getAllTaskTemplates = (): TaskTemplate[] => {
  return [...COMPULSORY_TASKS, ...OPTIONAL_TASKS];
};

export const getTaskTemplateById = (id: string): TaskTemplate | undefined => {
  return getAllTaskTemplates().find(template => template.id === id);
};

export const getTaskTemplatesForProcesses = (processes: string[]): TaskTemplate[] => {
  const compulsoryTasks = [...COMPULSORY_TASKS];
  const optionalTasks = OPTIONAL_TASKS.filter(task => 
    task.applicableProcesses?.some(process => processes.includes(process))
  );
  return [...compulsoryTasks, ...optionalTasks];
};

export const getTaskTemplatesByCategory = (category: string): TaskTemplate[] => {
  return getAllTaskTemplates().filter(template => template.category === category);
};

export const getTaskTemplatesByType = (type: 'compulsory' | 'optional'): TaskTemplate[] => {
  return getAllTaskTemplates().filter(template => template.type === type);
};

// === Process to Task Mapping ===
export const PROCESS_TO_TASK_MAP: Record<string, string> = {
  'Turning': 'turning_operation',
  '3-Axis Milling': 'milling_3axis',
  '4-Axis Milling': 'milling_4axis',
  '5-Axis Milling': 'milling_5axis',
  'Grinding': 'grinding_operation',
  'Anodizing': 'anodizing_process',
  'Heat Treatment': 'heat_treatment',
  'Laser Cutting': 'laser_cutting',
  'Welding': 'welding_operation',
  'Assembly': 'assembly_operation',
  // Add more mappings as needed for other processes
};

export const getTaskIdForProcess = (processName: string): string | undefined => {
  return PROCESS_TO_TASK_MAP[processName];
}; 