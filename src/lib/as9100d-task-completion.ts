// AS9100D Task Completion Handler
// Determines appropriate dialog based on task type and AS9100D clauses

import type { JobTask } from '@/types';
import { MaterialApprovalResult } from '@/components/quality/MaterialApprovalDialog';
import { ContractReviewResult } from '@/components/quality/ContractReviewDialog';
import { LotPlanningResult } from '@/components/quality/LotPlanningDialog';

export type TaskDialogType = 
  | 'material_approval'     // AS9100D 8.4.3 - Control of Externally Provided Materials
  | 'contract_review'       // AS9100D 8.2.3.1 - Review of Requirements
  | 'lot_planning'          // AS9100D 8.1 - Operational Planning & Control
  | 'quality_completion'    // Standard quality assessment for manufacturing operations
  | 'none';                 // No specific dialog required

export type AS9100DCompletionResult = 
  | MaterialApprovalResult 
  | ContractReviewResult 
  | LotPlanningResult;

/**
 * Determines which dialog should be used for task completion based on AS9100D clauses
 */
export function determineTaskDialogType(task: JobTask): TaskDialogType {
  const taskName = task.name.toLowerCase();
  const taskCategory = task.category?.toLowerCase() || '';
  const nonManufacturingType = task.nonManufacturingTaskType?.toLowerCase() || '';
  const manufacturingType = task.manufacturingProcessType?.toLowerCase() || '';
  
  // Check by non-manufacturing task type first (most specific)
  if (nonManufacturingType === 'material_approval') {
    return 'material_approval';
  }
  
  if (nonManufacturingType === 'contract_review') {
    return 'contract_review';
  }
  
  if (nonManufacturingType === 'lot_based_production_planning') {
    return 'lot_planning';
  }
  
  // Check by task name patterns for backwards compatibility
  if (taskName.includes('material') && 
      (taskName.includes('approval') || taskName.includes('review') || taskName.includes('inspection'))) {
    return 'material_approval';
  }
  
  if (taskName.includes('contract') || 
      taskName.includes('requirement') || 
      taskName.includes('drawing review')) {
    return 'contract_review';
  }
  
  if (taskName.includes('planning') || 
      taskName.includes('scheduling') || 
      taskName.includes('capacity') ||
      taskName.includes('resource')) {
    return 'lot_planning';
  }
  
  // Manufacturing operations use quality completion
  if (taskCategory === 'manufacturing_process' || 
      manufacturingType) {
    return 'quality_completion';
  }
  
  return 'none';
}

/**
 * Validates AS9100D compliance for task completion
 */
export function validateAS9100DCompliance(
  dialogType: TaskDialogType,
  result: AS9100DCompletionResult
): { isCompliant: boolean; violations: string[] } {
  const violations: string[] = [];
  
  switch (dialogType) {
    case 'material_approval':
      const materialResult = result as MaterialApprovalResult;
      if (!materialResult.complianceChecks.certificateVerified) {
        violations.push('Material certificate verification required (AS9100D 8.4.3)');
      }
      if (!materialResult.complianceChecks.traceabilityVerified) {
        violations.push('Material traceability verification required (AS9100D 8.4.3)');
      }
      if (!materialResult.complianceChecks.as9100dCompliant) {
        violations.push('AS9100D clause 8.4.3 compliance confirmation required');
      }
      if (!materialResult.lotNumber) {
        violations.push('Lot number assignment required for traceability');
      }
      break;
      
    case 'contract_review':
      const contractResult = result as ContractReviewResult;
      if (!contractResult.complianceChecks.requirementsUnderstood) {
        violations.push('Requirements understanding confirmation required (AS9100D 8.2.3.1)');
      }
      if (!contractResult.complianceChecks.customerRequirementsAccepted) {
        violations.push('Customer requirements acceptance required (AS9100D 8.2.3.1)');
      }
      if (!contractResult.complianceChecks.as9100dCompliant) {
        violations.push('AS9100D clause 8.2.3.1 compliance confirmation required');
      }
      if (!contractResult.approvals.salesManager || !contractResult.approvals.engineering) {
        violations.push('Both sales and engineering approvals required');
      }
      break;
      
    case 'lot_planning':
      const planningResult = result as LotPlanningResult;
      if (!planningResult.planningChecks.capacityVerified) {
        violations.push('Capacity verification required (AS9100D 8.1)');
      }
      if (!planningResult.planningChecks.resourcesAllocated) {
        violations.push('Resource allocation planning required (AS9100D 8.1)');
      }
      if (!planningResult.planningChecks.as9100dCompliant) {
        violations.push('AS9100D clause 8.1 compliance confirmation required');
      }
      if (!planningResult.approvals.productionManager) {
        violations.push('Production manager approval required');
      }
      break;
      
    default:
      // No specific validation for other dialog types
      break;
  }
  
  return {
    isCompliant: violations.length === 0,
    violations
  };
}

/**
 * Creates audit trail entry for AS9100D task completion
 */
export function createAS9100DAuditTrail(
  task: JobTask,
  dialogType: TaskDialogType,
  result: AS9100DCompletionResult,
  complianceValidation: { isCompliant: boolean; violations: string[] }
) {
  return {
    id: `audit_${task.id}_${Date.now()}`,
    taskId: task.id,
    taskName: task.name,
    completionType: dialogType,
    timestamp: new Date().toISOString(),
    as9100dClause: getAS9100DClause(dialogType),
    complianceStatus: complianceValidation.isCompliant ? 'compliant' : 'non_compliant',
    violations: complianceValidation.violations,
    completionData: result,
    auditRequired: !complianceValidation.isCompliant
  };
}

/**
 * Maps dialog type to AS9100D clause reference
 */
function getAS9100DClause(dialogType: TaskDialogType): string {
  switch (dialogType) {
    case 'material_approval':
      return '8.4.3 - Control of Externally Provided Processes, Products and Services';
    case 'contract_review':
      return '8.2.3.1 - Review of Requirements for Products and Services';
    case 'lot_planning':
      return '8.1 - Operational Planning and Control';
    default:
      return 'N/A';
  }
}

/**
 * Determines if task requires special AS9100D handling
 */
export function requiresAS9100DDialog(task: JobTask): boolean {
  const dialogType = determineTaskDialogType(task);
  return dialogType !== 'quality_completion' && dialogType !== 'none';
} 