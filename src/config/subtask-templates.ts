import type { SubtaskTemplate } from '@/types/tasks';

// === Compulsory Task Subtasks ===

// Contract Review Subtasks
export const CONTRACT_REVIEW_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'contract_analysis',
    name: 'Contract Analysis',
    description: 'Review contract terms, delivery requirements, and special conditions',
    qualityTemplateId: 'FRM-810-001', // Contract/Drawing Review Checklist
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Review all contract clauses for technical feasibility and delivery requirements',
    requiredDocuments: ['Customer PO', 'Contract Terms', 'Special Requirements'],
    estimatedDurationMinutes: 45,
    as9100dClause: '8.2',
    category: 'documentation'
  },
  {
    id: 'drawing_review',
    name: 'Drawing Review',
    description: 'Technical review of customer drawings and specifications',
    qualityTemplateId: 'FRM-810-001', // Contract/Drawing Review Checklist
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Verify drawing completeness, dimensions, tolerances, and specifications',
    requiredDocuments: ['Technical Drawings', 'Specifications', 'Material Requirements'],
    estimatedDurationMinutes: 60,
    as9100dClause: '8.2',
    category: 'documentation'
  },
  {
    id: 'specification_check',
    name: 'Specification Check',
    description: 'Verify material specifications and special requirements',
    qualityTemplateId: 'FRM-810-001',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Check material certifications, special process requirements, and testing needs',
    estimatedDurationMinutes: 30,
    as9100dClause: '8.2',
    category: 'documentation'
  },
  {
    id: 'feasibility_assessment',
    name: 'Feasibility Assessment',
    description: 'Assess manufacturing feasibility and capability requirements',
    qualityTemplateId: 'FRM-810-001',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Evaluate capability to meet requirements within specified timeline',
    estimatedDurationMinutes: 45,
    as9100dClause: '8.2',
    category: 'documentation'
  }
];

// Production Planning Subtasks
export const PRODUCTION_PLANNING_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'resource_planning',
    name: 'Resource Planning',
    description: 'Plan required resources, equipment, and personnel',
    qualityTemplateId: 'FRM-825-001', // Production Planning Form
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Identify required machines, tooling, fixtures, and personnel',
    estimatedDurationMinutes: 30,
    as9100dClause: '8.1',
    category: 'planning'
  },
  {
    id: 'timeline_creation',
    name: 'Timeline Creation',
    description: 'Create production timeline and milestone schedule',
    qualityTemplateId: 'FRM-825-001',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Develop realistic timeline considering all process steps and dependencies',
    estimatedDurationMinutes: 45,
    as9100dClause: '8.1',
    category: 'planning'
  },
  {
    id: 'capacity_check',
    name: 'Capacity Check',
    description: 'Verify production capacity and resource availability',
    qualityTemplateId: 'FRM-825-002', // Capacity Planning Worksheet
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Check machine availability, workload, and delivery capability',
    estimatedDurationMinutes: 15,
    as9100dClause: '8.1',
    category: 'planning'
  },
  {
    id: 'routing_sheet',
    name: 'Routing Sheet Creation',
    description: 'Create routing sheet with operation sequence',
    qualityTemplateId: 'FRM-851-003', // Shop Traveller/Router
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Define operation sequence, setup requirements, and quality checkpoints',
    estimatedDurationMinutes: 30,
    as9100dClause: '8.1',
    category: 'planning'
  }
];

// Material Verification Subtasks
export const MATERIAL_VERIFICATION_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'material_cert_check',
    name: 'Material Certificate Check',
    description: 'Verify material certificates and traceability',
    qualityTemplateId: 'FRM-840-002', // Traceability Lot-Traveller
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Verify material certificates match specifications and requirements',
    requiredDocuments: ['Material Certificates', 'Test Reports', 'Traceability Records'],
    estimatedDurationMinutes: 15,
    as9100dClause: '8.5.2',
    category: 'quality'
  },
  {
    id: 'dimension_verification',
    name: 'Dimension Verification',
    description: 'Verify raw material dimensions and condition',
    qualityTemplateId: 'FRM-860-002', // Dimensional Inspection Data Sheet
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Measure and verify raw material dimensions against requirements',
    estimatedDurationMinutes: 10,
    as9100dClause: '8.5.2',
    category: 'quality'
  },
  {
    id: 'traceability_setup',
    name: 'Traceability Setup',
    description: 'Establish traceability records and lot control',
    qualityTemplateId: 'FRM-840-002',
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Set up lot numbers, traceability records, and material tracking',
    estimatedDurationMinutes: 10,
    as9100dClause: '8.5.2',
    category: 'quality'
  },
  {
    id: 'material_marking',
    name: 'Material Marking',
    description: 'Mark material with identification and lot information',
    qualityTemplateId: 'FRM-840-001', // Material Identification Tag
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Apply identification markings per part marking procedure',
    estimatedDurationMinutes: 5,
    as9100dClause: '8.5.2',
    category: 'quality'
  }
];

// === Milling Operation Subtasks (As Specified in Requirements) ===

export const MILLING_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'milling_setup_sheet',
    name: 'Setup Sheet',
    description: 'Machine setup documentation with fixtures, tooling, and work coordinates',
    qualityTemplateId: 'FRM-851-001', // Operation Sheet
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Complete setup sheet with all fixture, tooling, and coordinate information',
    requiredDocuments: ['Operation Sheet', 'Setup Instructions', 'Fixture Drawings'],
    estimatedDurationMinutes: 30,
    as9100dClause: '8.5.1',
    category: 'production'
  },
  {
    id: 'milling_tool_list',
    name: 'Tool List',
    description: 'Complete tooling requirements and specifications',
    qualityTemplateId: 'FRM-851-005', // Tool Change Record
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'List all required tools with specifications, speeds, feeds, and life expectancy',
    requiredDocuments: ['Tool List', 'Tool Specifications', 'Cutting Parameters'],
    estimatedDurationMinutes: 20,
    as9100dClause: '8.5.1',
    category: 'production'
  },
  {
    id: 'milling_cam_program',
    name: 'CAM Program & Revision',
    description: 'CAM programming and revision control verification',
    qualityTemplateId: 'FRM-851-006', // CNC Program Version Control Log
    isPrintable: false,
    hasCheckbox: true,
    instructions: 'Verify CAM program, simulation results, and revision control',
    requiredDocuments: ['CAM Program', 'Simulation Report', 'Program Revision Log'],
    estimatedDurationMinutes: 45,
    as9100dClause: '8.5.1',
    category: 'production'
  },
  {
    id: 'milling_first_article',
    name: 'First Article Inspection Filled',
    description: 'FAI completion per AS9100D 8.5.1.3',
    qualityTemplateId: 'FRM-852-001', // First Article Inspection Report (FAIR)
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Complete First Article Inspection per AS9100D requirements',
    requiredDocuments: ['FAIR Report', 'Inspection Results', 'Measurement Data'],
    estimatedDurationMinutes: 60,
    as9100dClause: '8.5.1.3',
    category: 'quality'
  }
];

// === Turning Operation Subtasks ===

export const TURNING_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'turning_setup',
    name: 'Turning Setup Sheet',
    description: 'Lathe setup documentation and work holding verification',
    qualityTemplateId: 'WI-851-001', // CNC Machine Setup & Zero-Point Verification
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Document lathe setup, work holding, and zero-point verification',
    estimatedDurationMinutes: 25,
    as9100dClause: '8.5.1',
    category: 'production'
  },
  {
    id: 'turning_tooling',
    name: 'Tool Life Verification',
    description: 'Verify turning tool specifications and life management',
    qualityTemplateId: 'FRM-851-005', // Tool Change Record
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Check tool conditions, specifications, and life tracking',
    estimatedDurationMinutes: 15,
    as9100dClause: '8.5.1',
    category: 'production'
  },
  {
    id: 'turning_program',
    name: 'Turning Program Validation',
    description: 'Validate CNC turning program and parameters',
    qualityTemplateId: 'FRM-851-006', // CNC Program Version Control Log
    isPrintable: false,
    hasCheckbox: true,
    instructions: 'Verify turning program, simulate if required, and validate parameters',
    estimatedDurationMinutes: 30,
    as9100dClause: '8.5.1',
    category: 'production'
  },
  {
    id: 'turning_first_article',
    name: 'First Article Inspection',
    description: 'Complete first article inspection for turned parts',
    qualityTemplateId: 'FRM-852-001', // FAIR Report
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Perform first article inspection per AS9100D requirements',
    estimatedDurationMinutes: 45,
    as9100dClause: '8.5.1.3',
    category: 'quality'
  },
  {
    id: 'turning_production',
    name: 'Production Turning',
    description: 'Execute production turning with in-process inspection',
    qualityTemplateId: 'FRM-860-002', // Dimensional Inspection Data Sheet
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Perform production turning with required in-process inspections',
    estimatedDurationMinutes: 120,
    as9100dClause: '8.5.1',
    category: 'production'
  }
];

// === 5-Axis Milling Subtasks ===

export const MILLING_5AXIS_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'operator_qualification_check',
    name: 'Operator Qualification Check',
    description: 'Verify operator qualification for 5-axis operations',
    qualityTemplateId: 'WI-720-003', // Operator Qualification for 5-Axis Machines
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Verify operator has current 5-axis qualification certification',
    requiredDocuments: ['Operator Certification', 'Training Records', 'Qualification Matrix'],
    estimatedDurationMinutes: 10,
    as9100dClause: '7.2',
    category: 'quality'
  },
  {
    id: 'milling_complex_setup',
    name: 'Complex Operation Setup',
    description: 'Complex 5-axis setup with multiple datum references',
    qualityTemplateId: 'WI-851-006', // Complex Machining Operations
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Set up 5-axis machine with complex fixtures and datum references',
    estimatedDurationMinutes: 60,
    as9100dClause: '8.5.1',
    category: 'production'
  },
  {
    id: 'milling_cam_validation',
    name: 'CAM Program Validation',
    description: 'Extensive CAM program validation for 5-axis operations',
    qualityTemplateId: 'FRM-851-006', // CNC Program Version Control Log
    isPrintable: false,
    hasCheckbox: true,
    instructions: 'Validate 5-axis CAM program with collision detection and simulation',
    estimatedDurationMinutes: 90,
    as9100dClause: '8.5.1',
    category: 'production'
  },
  {
    id: 'surface_roughness_inspection',
    name: 'Surface Roughness Inspection',
    description: 'Surface finish measurement and verification',
    qualityTemplateId: 'WI-860-003', // Surface Roughness Inspection
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Measure surface roughness per drawing requirements',
    estimatedDurationMinutes: 30,
    as9100dClause: '8.6',
    category: 'quality'
  }
];

// === Special Process Subtasks ===

export const ANODIZING_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'special_process_approval',
    name: 'Special Process Approval',
    description: 'Verify anodizing process approval and certification',
    qualityTemplateId: 'FRM-831-001', // Special Process Approval Form
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Verify special process approval is current and valid',
    estimatedDurationMinutes: 15,
    as9100dClause: '8.5.1.2',
    category: 'special_process'
  },
  {
    id: 'anodizing_supplier_cert',
    name: 'Supplier Certification Check',
    description: 'Verify anodizing supplier certifications and approvals',
    qualityTemplateId: 'WI-831-002', // Anodizing/Plating Purchase & Certification Check
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Check supplier certifications and process qualifications',
    estimatedDurationMinutes: 10,
    as9100dClause: '8.4',
    category: 'special_process'
  },
  {
    id: 'anodizing_process_validation',
    name: 'Process Validation',
    description: 'Validate anodizing process parameters and documentation',
    qualityTemplateId: 'FRM-851-002', // Process Validation Report
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Validate process parameters meet specification requirements',
    estimatedDurationMinutes: 20,
    as9100dClause: '8.5.1.2',
    category: 'special_process'
  },
  {
    id: 'coating_thickness_verification',
    name: 'Coating Thickness Verification',
    description: 'Verify coating thickness meets specification requirements',
    qualityTemplateId: 'FRM-860-004', // Test Data Records
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Measure and verify coating thickness per specification',
    estimatedDurationMinutes: 25,
    as9100dClause: '8.6',
    category: 'quality'
  }
];

// === Tool Life Verification Subtasks ===

export const TOOL_LIFE_VERIFICATION_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'tool_life_verification',
    name: 'Tool Life Verification',
    description: 'Track tool usage and condition per AS9100D traceability requirements',
    qualityTemplateId: 'TLL-JOB-DATE', // Tool Life Tracking Log
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Document tool usage, condition, and life tracking for traceability',
    requiredDocuments: ['Tool Life Log', 'Tool Change Records', 'Condition Codes'],
    estimatedDurationMinutes: 15,
    as9100dClause: '7.5',
    category: 'production'
  }
];

// === Final Inspection Subtasks ===

export const FINAL_INSPECTION_SUBTASKS: SubtaskTemplate[] = [
  {
    id: 'dimensional_inspection',
    name: 'Dimensional Inspection',
    description: 'Complete dimensional inspection per drawing requirements',
    qualityTemplateId: 'FRM-860-002', // Dimensional Inspection Data Sheet
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Perform complete dimensional inspection using appropriate measuring equipment',
    estimatedDurationMinutes: 45,
    as9100dClause: '8.6',
    category: 'quality'
  },
  {
    id: 'surface_finish_check',
    name: 'Surface Finish Check',
    description: 'Verify surface finish requirements',
    qualityTemplateId: 'WI-860-003', // Surface Roughness Inspection
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Check surface finish per drawing specifications',
    estimatedDurationMinutes: 15,
    as9100dClause: '8.6',
    category: 'quality'
  },
  {
    id: 'functional_test',
    name: 'Functional Test',
    description: 'Perform functional testing if required',
    qualityTemplateId: 'FRM-860-004', // Test Data Records
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Execute functional tests per customer requirements',
    estimatedDurationMinutes: 30,
    as9100dClause: '8.6',
    category: 'quality'
  },
  {
    id: 'quality_documentation',
    name: 'Quality Documentation',
    description: 'Complete final inspection documentation',
    qualityTemplateId: 'FRM-860-001', // Final Inspection Report
    isPrintable: true,
    hasCheckbox: true,
    instructions: 'Complete all final inspection documentation and certificates',
    estimatedDurationMinutes: 20,
    as9100dClause: '8.6',
    category: 'quality'
  }
];

// === Master Subtask Registry ===

export const ALL_SUBTASK_TEMPLATES: SubtaskTemplate[] = [
  ...CONTRACT_REVIEW_SUBTASKS,
  ...PRODUCTION_PLANNING_SUBTASKS,
  ...MATERIAL_VERIFICATION_SUBTASKS,
  ...MILLING_SUBTASKS,
  ...TURNING_SUBTASKS,
  ...MILLING_5AXIS_SUBTASKS,
  ...ANODIZING_SUBTASKS,
  ...TOOL_LIFE_VERIFICATION_SUBTASKS,
  ...FINAL_INSPECTION_SUBTASKS,
  // Add more subtask groups as needed
];

// === Helper Functions ===

export const getSubtaskTemplateById = (id: string): SubtaskTemplate | undefined => {
  return ALL_SUBTASK_TEMPLATES.find(template => template.id === id);
};

export const getSubtaskTemplatesByCategory = (category: string): SubtaskTemplate[] => {
  return ALL_SUBTASK_TEMPLATES.filter(template => template.category === category);
};

export const getSubtaskTemplatesByIds = (ids: string[]): SubtaskTemplate[] => {
  return ids.map(id => getSubtaskTemplateById(id)).filter(Boolean) as SubtaskTemplate[];
};

export const getPrintableSubtasks = (): SubtaskTemplate[] => {
  return ALL_SUBTASK_TEMPLATES.filter(template => template.isPrintable);
};

export const getSubtasksWithCheckboxes = (): SubtaskTemplate[] => {
  return ALL_SUBTASK_TEMPLATES.filter(template => template.hasCheckbox);
};

export const getSubtasksByQualityTemplate = (qualityTemplateId: string): SubtaskTemplate[] => {
  return ALL_SUBTASK_TEMPLATES.filter(template => template.qualityTemplateId === qualityTemplateId);
}; 