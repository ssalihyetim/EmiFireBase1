#!/usr/bin/env tsx

/**
 * AS9100D Dialog System Test
 * 
 * This script demonstrates how the new AS9100D-compliant dialog system works:
 * 1. Material Approval Dialog (AS9100D 8.4.3)
 * 2. Contract Review Dialog (AS9100D 8.2.3.1) 
 * 3. Lot-Based Planning Dialog (AS9100D 8.1)
 * 4. Quality Completion Dialog (standard manufacturing operations)
 * 
 * Run with: npx tsx scripts/test-as9100d-dialogs.ts
 */

import { determineTaskDialogType, validateAS9100DCompliance, createAS9100DAuditTrail } from '../src/lib/as9100d-task-completion';
import type { JobTask } from '../src/types';

// Mock task data for testing
const testTasks: JobTask[] = [
  {
    id: 'task_material_001',
    jobId: 'job_001',
    templateId: 'template_material',
    name: 'Material Approval - Ti-6Al-4V Bar Stock',
    description: 'Review and approve incoming titanium material certificates',
    category: 'non_manufacturing_task',
    nonManufacturingTaskType: 'material_approval',
    status: 'pending',
    priority: 'high',
    subtasks: [],
    as9100dClause: '8.4.3 - Control of Externally Provided Processes, Products and Services',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'task_contract_001',
    jobId: 'job_001', 
    templateId: 'template_contract',
    name: 'Contract Review - Aerospace Propeller Order',
    description: 'Review customer requirements and technical specifications',
    category: 'non_manufacturing_task',
    nonManufacturingTaskType: 'contract_review',
    status: 'pending',
    priority: 'critical',
    subtasks: [],
    as9100dClause: '8.2.3.1 - Review of Requirements for Products and Services',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'task_planning_001',
    jobId: 'job_001',
    templateId: 'template_planning',
    name: 'Lot-Based Production Planning',
    description: 'Plan production schedule and resource allocation for lot manufacturing',
    category: 'non_manufacturing_task',
    nonManufacturingTaskType: 'lot_based_production_planning',
    status: 'pending',
    priority: 'medium',
    subtasks: [],
    as9100dClause: '8.1 - Operational Planning and Control',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'task_machining_001',
    jobId: 'job_001',
    templateId: 'template_5axis',
    name: '5-Axis Milling - Propeller Hub',
    description: 'Machine propeller hub using 5-axis milling operations',
    category: 'manufacturing_process',
    manufacturingProcessType: '5_axis_milling',
    status: 'pending',
    priority: 'high',
    subtasks: [],
    machineType: '5-axis CNC',
    setupTimeMinutes: 120,
    cycleTimeMinutes: 45,
    quantity: 2,
    partCode: 'PROP-HUB-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Mock completion results for testing validation
const mockCompletionResults = {
  material_approval: {
    id: 'material_approval_001',
    taskId: 'task_material_001',
    approvalType: 'material_certification' as const,
    status: 'approved' as const,
    approvedBy: 'John Smith - Quality Manager',
    approvalDate: new Date().toISOString(),
    lotNumber: 'LOT-20241210-1234',
    supplierName: 'Aerospace Materials Inc.',
    complianceChecks: {
      certificateVerified: true,
      traceabilityVerified: true,
      physicalInspection: true,
      as9100dCompliant: true
    },
    notes: 'Material certificates verified, full traceability confirmed'
  },
  
  contract_review: {
    id: 'contract_review_001',
    taskId: 'task_contract_001',
    reviewType: 'contract_analysis' as const,
    status: 'accepted' as const,
    reviewedBy: 'Jane Doe - Sales Engineering',
    reviewDate: new Date().toISOString(),
    complianceChecks: {
      requirementsUnderstood: true,
      deliverableDefined: true,
      resourcesAvailable: true,
      timelineRealistic: true,
      riskAssessmentComplete: true,
      customerRequirementsAccepted: true,
      as9100dCompliant: true
    },
    approvals: {
      salesManager: true,
      engineering: true
    },
    notes: 'All requirements reviewed and accepted, timeline feasible'
  },
  
  lot_planning: {
    id: 'lot_planning_001',
    taskId: 'task_planning_001',
    planningType: 'capacity_check' as const,
    status: 'approved' as const,
    plannedBy: 'Mike Johnson - Production Planner',
    planningDate: new Date().toISOString(),
    planningChecks: {
      capacityVerified: true,
      resourcesAllocated: true,
      routingSheetCreated: true,
      timelineDeveloped: true,
      qualityCheckpointsPlanned: true,
      riskMitigationPlanned: true,
      as9100dCompliant: true
    },
    approvals: {
      productionManager: true
    },
    estimatedDuration: '3 weeks',
    notes: 'Production schedule optimized for efficiency'
  }
};

function testAS9100DDialogSystem() {
  console.log('🔬 AS9100D Dialog System Test\n');
  console.log('='.repeat(60));
  
  testTasks.forEach((task, index) => {
    console.log(`\n📋 Task ${index + 1}: ${task.name}`);
    console.log(`   Category: ${task.category}`);
    console.log(`   Type: ${task.nonManufacturingTaskType || task.manufacturingProcessType || 'N/A'}`);
    console.log(`   AS9100D Clause: ${task.as9100dClause || 'N/A'}`);
    
    // Determine dialog type
    const dialogType = determineTaskDialogType(task);
    console.log(`   ✅ Dialog Type: ${dialogType}`);
    
    // Test completion validation if applicable
    if (dialogType in mockCompletionResults) {
      const mockResult = mockCompletionResults[dialogType as keyof typeof mockCompletionResults];
      const validation = validateAS9100DCompliance(dialogType, mockResult as any);
      
      console.log(`   🔍 Compliance Status: ${validation.isCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
      
      if (validation.violations.length > 0) {
        console.log(`   ⚠️  Violations:`);
        validation.violations.forEach(violation => {
          console.log(`      - ${violation}`);
        });
      }
      
      // Create audit trail
      const auditTrail = createAS9100DAuditTrail(task, dialogType, mockResult as any, validation);
      console.log(`   📝 Audit Trail Created: ${auditTrail.id}`);
      console.log(`   📊 Audit Status: ${auditTrail.complianceStatus}`);
    } else {
      console.log(`   🔧 Standard quality completion dialog`);
    }
    
    console.log('   ' + '-'.repeat(50));
  });
  
  console.log(`\n🎯 AS9100D Dialog System Summary:`);
  console.log(`   ✅ Material Approval Dialog - AS9100D 8.4.3`);
  console.log(`   ✅ Contract Review Dialog - AS9100D 8.2.3.1`);
  console.log(`   ✅ Lot Planning Dialog - AS9100D 8.1`);
  console.log(`   ✅ Quality Completion Dialog - Manufacturing Operations`);
  console.log(`   ✅ Compliance Validation System`);
  console.log(`   ✅ Audit Trail Generation`);
  
  console.log(`\n🔄 Usage in Jobs Page:`);
  console.log(`   1. When material approval checkbox is clicked → Material Approval Dialog`);
  console.log(`   2. When contract review task is completed → Contract Review Dialog`);
  console.log(`   3. When planning task is started → Lot Planning Dialog`);
  console.log(`   4. When manufacturing operation is completed → Quality Completion Dialog`);
  
  console.log(`\n📋 AS9100D Compliance Benefits:`);
  console.log(`   - Automatic compliance validation for each dialog type`);
  console.log(`   - Complete audit trail for AS9100D requirements`);
  console.log(`   - Traceability from task completion to AS9100D clauses`);
  console.log(`   - Automated violation detection and reporting`);
  console.log(`   - Integration with existing quality tracking system`);
}

// Test non-compliant scenario
function testNonCompliantScenario() {
  console.log(`\n\n🚨 Testing Non-Compliant Scenario:`);
  console.log('='.repeat(40));
  
  const nonCompliantResult = {
    ...mockCompletionResults.material_approval,
    complianceChecks: {
      certificateVerified: false, // ❌ Missing
      traceabilityVerified: true,
      physicalInspection: false,  // ❌ Missing
      as9100dCompliant: false     // ❌ Missing
    }
  };
  
  const validation = validateAS9100DCompliance('material_approval', nonCompliantResult as any);
  
  console.log(`Compliance Status: ${validation.isCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
  console.log(`Violations Found: ${validation.violations.length}`);
  
  validation.violations.forEach((violation, index) => {
    console.log(`   ${index + 1}. ${violation}`);
  });
  
  console.log(`\n🔧 System Response:`);
  console.log(`   - Task completion blocked until compliance achieved`);
  console.log(`   - Violations logged for quality manager review`);
  console.log(`   - Audit trail marks as non-compliant`);
  console.log(`   - Corrective action required before proceeding`);
}

if (require.main === module) {
  testAS9100DDialogSystem();
  testNonCompliantScenario();
} 