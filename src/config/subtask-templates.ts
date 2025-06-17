import type { SubtaskTemplate, ManufacturingSubtaskType } from '../types/tasks';

// === Manufacturing Process Subtasks ===
// Every manufacturing process has these 4 standard subtasks

// === Setup Sheet Subtasks ===

export const SETUP_SHEET_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'turning_setup_sheet',
    name: 'Turning Setup Sheet',
    description: 'Create and verify setup sheet for turning operations',
    isPrintable: true,
    hasCheckbox: true,
    manufacturingSubtaskType: 'setup_sheet',
    instructions: 'Create detailed setup sheet including workholding, tool positioning, and program verification',
    estimatedDurationMinutes: 30,
    operatorSkillRequired: 'setup_specialist',
    requiresFixturing: true,
    requiresGauging: true,
    as9100dClause: '8.5.1',
    requiredDocuments: ['part_drawing', 'process_sheet', 'work_instructions']
  },
  {
    id: 'milling_setup_sheet',
    name: 'Milling Setup Sheet', 
    description: 'Create and verify setup sheet for milling operations',
    isPrintable: true,
    hasCheckbox: true,
    manufacturingSubtaskType: 'setup_sheet',
    instructions: 'Create detailed setup sheet including fixturing, work coordinates, and tool paths',
    estimatedDurationMinutes: 45,
    operatorSkillRequired: 'setup_specialist',
    requiresFixturing: true,
    requiresGauging: true,
    as9100dClause: '8.5.1',
    requiredDocuments: ['part_drawing', 'cam_program', 'fixture_drawing']
  },
  {
    id: '5_axis_setup_sheet',
    name: '5-Axis Setup Sheet',
    description: 'Create and verify complex setup sheet for 5-axis operations',
    isPrintable: true,
    hasCheckbox: true,
    manufacturingSubtaskType: 'setup_sheet',
    instructions: 'Create comprehensive setup sheet including coordinate systems, rotary positioning, and collision avoidance',
    estimatedDurationMinutes: 60,
    operatorSkillRequired: 'advanced_setup_specialist',
    requiresFixturing: true,
    requiresGauging: true,
    as9100dClause: '8.5.1',
    requiredDocuments: ['part_drawing', 'cam_program', 'fixture_drawing', 'coordinate_systems']
  }
];

// === First Article Inspection Subtasks ===

export const FIRST_ARTICLE_INSPECTION_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'first_article_inspection',
    name: 'First Article Inspection (FAI)',
    description: 'Perform and document the first article inspection.',
    isPrintable: true,
    hasCheckbox: true,
    manufacturingSubtaskType: 'fai',
    instructions: 'Measure all dimensions as per the drawing on the first part produced. Document results in the FAI report.',
    estimatedDurationMinutes: 120,
    operatorSkillRequired: 'quality_inspector',
    requiresGauging: true,
    as9100dClause: '8.5.1.3',
    requiredDocuments: ['part_drawing', 'inspection_plan']
  }
];

// === Tool List Subtasks ===

export const TOOL_LIST_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'turning_tool_list',
    name: 'Turning Tool List',
    description: 'Prepare and verify tool list for turning operations',
    isPrintable: true,
    hasCheckbox: true,
    manufacturingSubtaskType: 'tool_list',
    instructions: 'Verify all cutting tools, inserts, and toolholders are available and properly identified',
    estimatedDurationMinutes: 20,
    operatorSkillRequired: 'machinist',
    requiresToolPrep: true,
    requiresToolOffset: true,
    as9100dClause: '8.5.1',
    requiredDocuments: ['tool_list', 'tool_specifications']
  },
  {
    id: 'milling_tool_list',
    name: 'Milling Tool List',
    description: 'Prepare and verify tool list for milling operations',
    isPrintable: true,
    hasCheckbox: true,
    manufacturingSubtaskType: 'tool_list',
    instructions: 'Verify all end mills, drills, and specialty tools with correct lengths and offsets',
    estimatedDurationMinutes: 30,
    operatorSkillRequired: 'machinist',
    requiresToolPrep: true,
    requiresToolOffset: true,
    as9100dClause: '8.5.1',
    requiredDocuments: ['tool_list', 'tool_specifications', 'tool_drawings']
  },
  {
    id: '5_axis_tool_list',
    name: '5-Axis Tool List',
    description: 'Prepare and verify specialized tool list for 5-axis operations',
    isPrintable: true,
    hasCheckbox: true,
    manufacturingSubtaskType: 'tool_list',
    instructions: 'Verify complex tooling with proper length compensation and collision clearance',
    estimatedDurationMinutes: 45,
    operatorSkillRequired: 'advanced_machinist',
    requiresToolPrep: true,
    requiresToolOffset: true,
    as9100dClause: '8.5.1',
    requiredDocuments: ['tool_list', 'tool_specifications', 'tool_drawings', 'collision_analysis']
  }
];

// === Tool Life Verification Subtasks ===

export const TOOL_LIFE_VERIFICATION_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'turning_tool_life_verification',
    name: 'Turning Tool Life Verification',
    description: 'Verify tool condition and remaining life for turning tools',
    isPrintable: true,
    hasCheckbox: true,
    manufacturingSubtaskType: 'tool_life_verification',
    instructions: 'Inspect tool wear, measure critical dimensions, and verify remaining tool life',
    estimatedDurationMinutes: 15,
    operatorSkillRequired: 'machinist',
    requiresInspection: true,
    requiresReplacement: false,
    as9100dClause: '8.5.1',
    requiredDocuments: ['tool_life_records', 'wear_inspection_sheet']
  },
  {
    id: 'milling_tool_life_verification',
    name: 'Milling Tool Life Verification',
    description: 'Verify tool condition and remaining life for milling tools',
    isPrintable: true,
    hasCheckbox: true,
    manufacturingSubtaskType: 'tool_life_verification',
    instructions: 'Inspect cutting edges, check runout, and verify tool condition',
    estimatedDurationMinutes: 20,
    operatorSkillRequired: 'machinist',
    requiresInspection: true,
    requiresReplacement: false,
    as9100dClause: '8.5.1',
    requiredDocuments: ['tool_life_records', 'tool_inspection_sheet']
  },
  {
    id: '5_axis_tool_life_verification',
    name: '5-Axis Tool Life Verification',
    description: 'Verify specialized tool condition for 5-axis operations',
    isPrintable: true,
    hasCheckbox: true,
    manufacturingSubtaskType: 'tool_life_verification',
    instructions: 'Comprehensive tool inspection including geometry verification and vibration analysis',
    estimatedDurationMinutes: 30,
    operatorSkillRequired: 'advanced_machinist',
    requiresInspection: true,
    requiresReplacement: false,
    as9100dClause: '8.5.1',
    requiredDocuments: ['tool_life_records', 'advanced_tool_inspection', 'geometry_verification']
  }
];

// === Machining Subtasks ===
// These are the actual manufacturing operations that get scheduled

export const MACHINING_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'turning_machining',
    name: 'Turning Machining',
    description: 'Execute turning operations on CNC lathe',
    isPrintable: false,
    hasCheckbox: true,
    manufacturingSubtaskType: 'machining',
    instructions: 'Execute turning program with in-process monitoring and quality checks',
    estimatedDurationMinutes: 120,
    operatorSkillRequired: 'machinist',
    requiresOperatorPresence: true,
    requiresQualityCheck: true,
    generatesChips: true,
    as9100dClause: '8.5.1',
    requiredDocuments: ['cnc_program', 'process_sheet']
  },
  {
    id: '3_axis_milling_machining',
    name: '3-Axis Milling Machining',
    description: 'Execute 3-axis milling operations',
    isPrintable: false,
    hasCheckbox: true,
    manufacturingSubtaskType: 'machining',
    instructions: 'Execute milling program with coolant management and dimensional verification',
    estimatedDurationMinutes: 180,
    operatorSkillRequired: 'machinist',
    requiresOperatorPresence: true,
    requiresQualityCheck: true,
    generatesChips: true,
    as9100dClause: '8.5.1',
    requiredDocuments: ['cnc_program', 'process_sheet', 'quality_plan']
  },
  {
    id: '4_axis_milling_machining',
    name: '4-Axis Milling Machining',
    description: 'Execute 4-axis milling operations with rotary positioning',
    isPrintable: false,
    hasCheckbox: true,
    manufacturingSubtaskType: 'machining',
    instructions: 'Execute complex milling with rotary axis positioning and advanced monitoring',
    estimatedDurationMinutes: 240,
    operatorSkillRequired: 'advanced_machinist',
    requiresOperatorPresence: true,
    requiresQualityCheck: true,
    generatesChips: true,
    as9100dClause: '8.5.1',
    requiredDocuments: ['cnc_program', 'process_sheet', 'quality_plan', 'rotary_setup']
  },
  {
    id: '5_axis_milling_machining',
    name: '5-Axis Milling Machining',
    description: 'Execute complex 5-axis simultaneous milling operations',
    isPrintable: false,
    hasCheckbox: true,
    manufacturingSubtaskType: 'machining',
    instructions: 'Execute advanced 5-axis program with continuous monitoring and precision verification',
    estimatedDurationMinutes: 360,
    operatorSkillRequired: 'expert_machinist',
    requiresOperatorPresence: true,
    requiresQualityCheck: true,
    generatesChips: true,
    as9100dClause: '8.5.1',
    requiredDocuments: ['cnc_program', 'process_sheet', 'quality_plan', 'coordinate_verification', 'collision_prevention']
  }
];

// === Non-Manufacturing Task Subtasks ===

export const NON_MANUFACTURING_SUBTASKS: SubtaskTemplate[] = [
  // Contract Review Subtasks
  {
    id: 'contract_analysis',
    name: 'Contract Analysis',
    description: 'Review contract terms and requirements',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Analyze customer requirements, delivery dates, and special conditions',
    estimatedDurationMinutes: 60,
    as9100dClause: '8.2.3.1',
    requiredDocuments: ['purchase_order', 'statement_of_work']
  },
  {
    id: 'drawing_review',
    name: 'Drawing Review',
    description: 'Review technical drawings and specifications',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Verify drawing completeness, dimensions, and manufacturing feasibility',
    estimatedDurationMinutes: 45,
    as9100dClause: '8.2.3.1',
    requiredDocuments: ['technical_drawings', 'specifications']
  },
  
  // Material Approval Subtasks
  {
    id: 'material_certification_review',
    name: 'Material Certification Review',
    description: 'Review and verify material certificates',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Verify material certs match specifications and traceability requirements',
    estimatedDurationMinutes: 30,
    as9100dClause: '8.4.3',
    requiredDocuments: ['material_certs', 'test_reports']
  },
  {
    id: 'material_inspection',
    name: 'Material Inspection',
    description: 'Physical inspection of raw materials',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Inspect material condition, dimensions, and marking',
    estimatedDurationMinutes: 20,
    as9100dClause: '8.4.3',
    requiredDocuments: ['inspection_sheet']
  },
  {
    id: 'set_traceability_lot_number',
    name: 'Set Traceability & Lot Number',
    description: 'Assign traceability and lot number for material tracking',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Generate and assign lot numbers for material traceability throughout production',
    estimatedDurationMinutes: 15,
    as9100dClause: '8.4.3',
    requiredDocuments: ['material_cert', 'traceability_form']
  },
  
  // Lot Based Production Planning & Scheduling Subtasks
  {
    id: 'capacity_check',
    name: 'Capacity Check',
    description: 'Verify production capacity and resource availability',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Check machine availability, workload, and delivery capability',
    estimatedDurationMinutes: 15,
    as9100dClause: '8.1',
    requiredDocuments: ['FRM-825-002']
  },
  {
    id: 'resource_planning',
    name: 'Resource Planning',
    description: 'Plan required resources, equipment, and personnel',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Identify required machines, tooling, fixtures, and personnel',
    estimatedDurationMinutes: 30,
    as9100dClause: '8.1',
    requiredDocuments: ['FRM-825-001']
  },
  {
    id: 'routing_sheet_creation',
    name: 'Routing Sheet Creation',
    description: 'Create routing sheet with operation sequence',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Define operation sequence, setup requirements, and quality checkpoints',
    estimatedDurationMinutes: 30,
    as9100dClause: '8.5.1',
    requiredDocuments: ['FRM-851-003']
  },
  {
    id: 'timeline_creation',
    name: 'Timeline Creation',
    description: 'Create production timeline and milestone schedule',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Develop realistic timeline considering all process steps and dependencies',
    estimatedDurationMinutes: 25,
    as9100dClause: '8.5.1',
    requiredDocuments: ['production_timeline']
  },
  
  // Final Inspection Subtasks
  {
    id: 'dimensional_inspection',
    name: 'Dimensional Inspection',
    description: 'Complete dimensional verification of finished parts',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Measure all critical dimensions and verify compliance to drawings',
    estimatedDurationMinutes: 60,
    as9100dClause: '8.6',
    requiredDocuments: ['inspection_sheet', 'calibrated_instruments']
  },
  {
    id: 'surface_finish_verification',
    name: 'Surface Finish Verification',
    description: 'Verify surface finish requirements',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Measure surface roughness and verify visual appearance',
    estimatedDurationMinutes: 20,
    as9100dClause: '8.6',
    requiredDocuments: ['surface_finish_requirements']
  },
  
  // Packaging Subtasks
  {
    id: 'packaging_preparation',
    name: 'Packaging Preparation',
    description: 'Prepare parts for packaging',
    isPrintable: false,
    hasCheckbox: true,
    instructions: 'Clean parts, apply protective coatings if required',
    estimatedDurationMinutes: 15,
    as9100dClause: '8.5.4',
    requiredDocuments: ['packaging_requirements']
  },
  {
    id: 'packaging_execution',
    name: 'Packaging Execution',
    description: 'Package parts according to specifications',
    isPrintable: false,
    hasCheckbox: true,
    instructions: 'Package parts with proper protection and labeling',
    estimatedDurationMinutes: 15,
    as9100dClause: '8.5.4',
    requiredDocuments: ['packaging_spec', 'labels']
  }
];

// === FAI (First Article Inspection) Subtasks ===

export const FAI_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'turning_fai',
    name: 'First Article Inspection (FAI)',
    description: 'Complete First Article Inspection for turning process',
    isPrintable: true,
    hasCheckbox: true,
    manufacturingSubtaskType: 'fai',
    instructions: 'Perform comprehensive dimensional and functional inspection of first article. Upload FAI report by QC.',
    estimatedDurationMinutes: 45,
    operatorSkillRequired: 'quality_inspector',
    requiresInspection: true,
    requiresQualityCheck: true,
    as9100dClause: '8.5.1.3',
    requiredDocuments: ['first_article_drawing', 'fai_report', 'dimensional_results']
  },
  {
    id: 'milling_fai',
    name: 'First Article Inspection (FAI)',
    description: 'Complete First Article Inspection for milling process',
    isPrintable: true,
    hasCheckbox: true,
    manufacturingSubtaskType: 'fai',
    instructions: 'Perform comprehensive dimensional and functional inspection of first article. Upload FAI report by QC.',
    estimatedDurationMinutes: 60,
    operatorSkillRequired: 'quality_inspector',
    requiresInspection: true,
    requiresQualityCheck: true,
    as9100dClause: '8.5.1.3',
    requiredDocuments: ['first_article_drawing', 'fai_report', 'dimensional_results']
  },
  {
    id: '5_axis_fai',
    name: 'First Article Inspection (FAI)',
    description: 'Complete First Article Inspection for 5-axis process',
    isPrintable: true,
    hasCheckbox: true,
    manufacturingSubtaskType: 'fai',
    instructions: 'Perform comprehensive dimensional and functional inspection of first article. Upload FAI report by QC.',
    estimatedDurationMinutes: 90,
    operatorSkillRequired: 'senior_quality_inspector',
    requiresInspection: true,
    requiresQualityCheck: true,
    as9100dClause: '8.5.1.3',
    requiredDocuments: ['first_article_drawing', 'fai_report', 'dimensional_results', 'feature_matrix']
  }
];

// === Standard Manufacturing Process Subtasks ===
// A collection of all subtasks that are standard for any manufacturing process.
export const MANUFACTURING_PROCESS_SUBTASKS: SubtaskTemplate[] = [
  ...SETUP_SHEET_SUBTASKS,
  ...FIRST_ARTICLE_INSPECTION_SUBTASKS,
  ...TOOL_LIST_SUBTASKS,
  ...TOOL_LIFE_VERIFICATION_SUBTASKS,
  ...MACHINING_SUBTASKS
];

// === Combined Subtask Templates ===

export const ALL_SUBTASK_TEMPLATES = [
  ...SETUP_SHEET_SUBTASKS,
  ...TOOL_LIST_SUBTASKS,
  ...TOOL_LIFE_VERIFICATION_SUBTASKS,
  ...MACHINING_SUBTASKS,
  ...NON_MANUFACTURING_SUBTASKS,
  ...FAI_SUBTASKS
];

// === Subtask Template Lookup Functions ===

export function getSubtaskTemplateById(id: string): SubtaskTemplate | undefined {
  return ALL_SUBTASK_TEMPLATES.find(template => template.id === id);
}

export function getSubtaskTemplatesByIds(ids: string[]): SubtaskTemplate[] {
  return ids.map(id => getSubtaskTemplateById(id)).filter(Boolean) as SubtaskTemplate[];
}

export function getManufacturingSubtasksByType(type: ManufacturingSubtaskType): SubtaskTemplate[] {
  return ALL_SUBTASK_TEMPLATES.filter(template => 
    template.manufacturingSubtaskType === type
  );
}

export function getNonManufacturingSubtasks(): SubtaskTemplate[] {
  return NON_MANUFACTURING_SUBTASKS;
}

// === Manufacturing Process Subtask Generation ===

/**
 * Get the standard subtasks for a manufacturing process
 * Returns: [Setup Sheet, Tool List, Tool Life Verification, Machining, FAI]
 */
export function getStandardManufacturingSubtasks(processType: string): SubtaskTemplate[] {
  const processSpecificSubtasks = MANUFACTURING_PROCESS_SUBTASKS.filter(subtask => {
    // This logic assumes a naming convention like 'turning_setup_sheet', 'milling_tool_list'
    // It will match 'turning' with 'turning_setup_sheet', 'turning_tool_list', etc.
    return subtask.id.startsWith(processType);
  });

  const generalSubtasks = MANUFACTURING_PROCESS_SUBTASKS.filter(subtask =>
    !subtask.id.includes('_') // A simple way to get general tasks like 'first_article_inspection'
  );

  return [...processSpecificSubtasks, ...generalSubtasks];
}

/**
 * Get subtasks for non-manufacturing tasks
 */
export function getNonManufacturingTaskSubtasks(taskType: string): SubtaskTemplate[] {
  switch (taskType.toLowerCase()) {
    case 'contract_review':
      return [
        getSubtaskTemplateById('contract_analysis'),
        getSubtaskTemplateById('drawing_review')
      ].filter(Boolean) as SubtaskTemplate[];
      
    case 'material_approval':
      return [
        getSubtaskTemplateById('material_certification_review'),
        getSubtaskTemplateById('material_inspection'),
        getSubtaskTemplateById('set_traceability_lot_number')
      ].filter(Boolean) as SubtaskTemplate[];
      
    case 'lot_based_production_planning':
      return [
        getSubtaskTemplateById('capacity_check'),
        getSubtaskTemplateById('resource_planning'),
        getSubtaskTemplateById('routing_sheet_creation'),
        getSubtaskTemplateById('timeline_creation')
      ].filter(Boolean) as SubtaskTemplate[];
      
    case 'final_inspection':
      return [
        getSubtaskTemplateById('dimensional_inspection'),
        getSubtaskTemplateById('surface_finish_verification')
      ].filter(Boolean) as SubtaskTemplate[];
      
    case 'packaging':
      return [
        getSubtaskTemplateById('packaging_preparation'),
        getSubtaskTemplateById('packaging_execution')
      ].filter(Boolean) as SubtaskTemplate[];
      
    default:
      return [];
  }
}

// === Utility Functions ===

export function isSchedulableSubtask(subtask: SubtaskTemplate): boolean {
  return subtask.manufacturingSubtaskType === 'machining';
}

export function getEstimatedSubtaskTime(subtasks: SubtaskTemplate[]): number {
  return subtasks.reduce((total, subtask) => 
    total + (subtask.estimatedDurationMinutes || 0), 0
  );
}

export function getMachiningSubtasks(): SubtaskTemplate[] {
  return MACHINING_SUBTASKS;
} 