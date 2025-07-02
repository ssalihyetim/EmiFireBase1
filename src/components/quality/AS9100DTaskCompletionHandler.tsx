'use client';

import React, { useState } from 'react';
import type { JobTask } from '@/types';
import type { QualityResult } from '@/types/archival';
import TaskCompletionDialog from '@/components/quality/TaskCompletionDialog';
import MaterialApprovalDialog, { MaterialApprovalResult } from '@/components/quality/MaterialApprovalDialog';
import ContractReviewDialog, { ContractReviewResult } from '@/components/quality/ContractReviewDialog';
import LotPlanningDialog, { LotPlanningResult } from '@/components/quality/LotPlanningDialog';
import { 
  determineTaskDialogType, 
  validateAS9100DCompliance, 
  createAS9100DAuditTrail,
  requiresAS9100DDialog,
  type TaskDialogType,
  type AS9100DCompletionResult 
} from '@/lib/as9100d-task-completion';

interface AS9100DTaskCompletionHandlerProps {
  task: JobTask;
  job?: any; // Add job prop to get part and order information
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (completionData: QualityResult, operatorNotes?: string[]) => Promise<void>;
  isLoading?: boolean;
}

// Helper function to convert AS9100D results to QualityResult format
function convertAS9100DToQualityResult(
  task: JobTask,
  dialogType: TaskDialogType,
  result: AS9100DCompletionResult
): QualityResult {
  // Calculate dynamic quality score based on actual compliance
  let score = calculateAS9100DQualityScore(dialogType, result);
  let qualityResult: 'pass' | 'fail' | 'conditional' | 'rework_required' = 'pass';
  let inspectedBy = 'system';
  let notes = `AS9100D ${dialogType} completion`;
  
  // Determine result based on score
  if (score >= 9) {
    qualityResult = 'pass';
  } else if (score >= 7) {
    qualityResult = 'conditional';
  } else if (score >= 5) {
    qualityResult = 'rework_required';
  } else {
    qualityResult = 'fail';
  }
  
  // Handle different dialog result types
  if (dialogType === 'material_approval' && 'status' in result) {
    const materialResult = result as MaterialApprovalResult;
    inspectedBy = materialResult.approvedBy;
    notes = `Material approval: ${materialResult.status} - Lot: ${materialResult.lotNumber} - Score: ${score}/10`;
  } 
  else if (dialogType === 'contract_review' && 'status' in result) {
    const contractResult = result as ContractReviewResult;
    inspectedBy = contractResult.reviewedBy;
    notes = `Contract review: ${contractResult.status} - Score: ${score}/10`;
  }
  else if (dialogType === 'lot_planning' && 'status' in result) {
    const lotResult = result as LotPlanningResult;
    inspectedBy = lotResult.plannedBy;
    notes = `Lot planning: ${lotResult.status} - Score: ${score}/10`;
  }
  
  return {
    id: `qr-${task.id}-${Date.now()}`,
    taskId: task.id,
    inspectionType: 'final',
    result: qualityResult,
    score: score,
    inspectedBy: inspectedBy,
    inspectionDate: new Date().toISOString(),
    notes: notes,
    // Store complete AS9100D data for archival
    as9100dData: {
      dialogType: dialogType,
      complianceResult: result,
      calculationMethod: 'weighted_compliance_scoring'
    }
  };
}

// Helper function to calculate dynamic quality score based on compliance completeness
function calculateAS9100DQualityScore(
  dialogType: TaskDialogType,
  result: AS9100DCompletionResult
): number {
  let score = 5; // Base score
  
  if (dialogType === 'material_approval' && 'complianceChecks' in result) {
    const materialResult = result as MaterialApprovalResult;
    const checks = materialResult.complianceChecks;
    
    // Weighted scoring for material approval (AS9100D 8.4.3)
    let completionScore = 0;
    completionScore += checks.certificateVerified ? 2.5 : 0;    // Critical: Certificate verification
    completionScore += checks.traceabilityVerified ? 2.5 : 0;   // Critical: Traceability 
    completionScore += checks.physicalInspection ? 1.5 : 0;     // Important: Physical inspection
    completionScore += checks.as9100dCompliant ? 2.0 : 0;       // Critical: AS9100D compliance
    completionScore += materialResult.lotNumber ? 1.0 : 0;      // Required: Lot number
    completionScore += materialResult.approvedBy ? 0.5 : 0;     // Required: Approver
    
    score = Math.round(completionScore);
  }
  else if (dialogType === 'contract_review' && 'complianceChecks' in result) {
    const contractResult = result as ContractReviewResult;
    const checks = contractResult.complianceChecks;
    
    // Weighted scoring for contract review (AS9100D 8.2.3.1)
    let completionScore = 0;
    completionScore += checks.requirementsUnderstood ? 1.5 : 0;        // Critical
    completionScore += checks.deliverableDefined ? 1.5 : 0;            // Critical
    completionScore += checks.resourcesAvailable ? 1.5 : 0;            // Critical
    completionScore += checks.timelineRealistic ? 1.5 : 0;             // Critical
    completionScore += checks.riskAssessmentComplete ? 1.0 : 0;        // Important
    completionScore += checks.customerRequirementsAccepted ? 1.5 : 0;  // Critical
    completionScore += checks.as9100dCompliant ? 1.0 : 0;              // Required
    
    // Dual approval bonus
    if (contractResult.approvals.salesManager && contractResult.approvals.engineering) {
      completionScore += 1.0; // Bonus for dual approval
    }
    
    score = Math.round(completionScore);
  }
  else if (dialogType === 'lot_planning' && 'planningChecks' in result) {
    const lotResult = result as LotPlanningResult;
    const checks = lotResult.planningChecks;
    
    // Weighted scoring for lot planning (AS9100D 8.1)
    let completionScore = 0;
    completionScore += checks.capacityVerified ? 1.5 : 0;              // Critical
    completionScore += checks.resourcesAllocated ? 1.5 : 0;            // Critical
    completionScore += checks.routingSheetCreated ? 1.5 : 0;           // Critical
    completionScore += checks.timelineDeveloped ? 1.5 : 0;             // Critical
    completionScore += checks.qualityCheckpointsPlanned ? 1.0 : 0;     // Important
    completionScore += checks.riskMitigationPlanned ? 1.0 : 0;         // Important
    completionScore += checks.as9100dCompliant ? 1.0 : 0;              // Required
    
    // Production manager approval bonus
    if (lotResult.approvals.productionManager) {
      completionScore += 1.0;
    }
    
    score = Math.round(completionScore);
  }
  
  // Ensure score is within valid range
  return Math.min(Math.max(score, 1), 10);
}

// Helper function to store AS9100D completion data for archival
async function storeAS9100DCompletionData(
  task: JobTask,
  dialogType: TaskDialogType,
  result: AS9100DCompletionResult,
  auditTrail: any,
  qualityResult: QualityResult
): Promise<void> {
  try {
    // Store in a dedicated AS9100D compliance collection for detailed archival
    const { db } = await import('@/lib/firebase');
    const { collection, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    
    const as9100dRecord = {
      id: `as9100d_${task.id}_${Date.now()}`,
      taskId: task.id,
      jobId: task.jobId,
      dialogType: dialogType,
      completionDate: new Date().toISOString(),
      
      // Complete AS9100D result data
      complianceData: result,
      
      // Audit trail for compliance tracking
      auditTrail: auditTrail,
      
      // Quality result summary
      qualityScore: qualityResult.score,
      qualityResult: qualityResult.result,
      
      // Archival metadata
      archivedForCompliance: true,
      retentionRequired: true,
      complianceClause: getAS9100DClause(dialogType),
      
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(
      doc(db, 'as9100d_compliance_records', as9100dRecord.id), 
      as9100dRecord
    );
    
    console.log(`Stored AS9100D compliance record: ${as9100dRecord.id}`);
  } catch (error) {
    console.error('Error storing AS9100D compliance data:', error);
    // Don't throw - we don't want to block task completion if archival fails
  }
}

// Helper function to get AS9100D clause reference
function getAS9100DClause(dialogType: TaskDialogType): string {
  switch (dialogType) {
    case 'material_approval': return '8.4.3 - Control of Externally Provided Materials';
    case 'contract_review': return '8.2.3.1 - Review of Requirements';
    case 'lot_planning': return '8.1 - Operational Planning and Control';
    default: return 'N/A';
  }
}

export default function AS9100DTaskCompletionHandler({
  task,
  job,
  open,
  onOpenChange,
  onComplete,
  isLoading = false
}: AS9100DTaskCompletionHandlerProps) {
  const [currentDialogType] = useState<TaskDialogType>(() => determineTaskDialogType(task));

  const handleAS9100DCompletion = async (result: AS9100DCompletionResult) => {
    try {
      // Convert AS9100D result to QualityResult format
      const qualityResult = convertAS9100DToQualityResult(task, currentDialogType, result);
      
      // Validate AS9100D compliance
      const complianceValidation = validateAS9100DCompliance(currentDialogType, result);
      
      // Create audit trail
      const auditTrail = createAS9100DAuditTrail(task, currentDialogType, result, complianceValidation);
      
      // Create operator notes with AS9100D compliance info
      const operatorNotes = [
        `AS9100D ${currentDialogType} completion`,
        `Compliance: ${complianceValidation.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`,
        ...(complianceValidation.violations || []),
        `Audit Trail ID: ${auditTrail.id}`
      ];
      
      // Store AS9100D completion data for detailed archival
      await storeAS9100DCompletionData(task, currentDialogType, result, auditTrail, qualityResult);
      
      // Call the completion handler with QualityResult
      await onComplete(qualityResult, operatorNotes);
      
      // Log compliance status for debugging
      console.log(`AS9100D Task Completion - ${task.name}:`, {
        dialogType: currentDialogType,
        compliance: complianceValidation.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT',
        violations: complianceValidation.violations,
        qualityScore: qualityResult.score
      });
      
      // Store AS9100D completion data for archival
      await storeAS9100DCompletionData(task, currentDialogType, result, auditTrail, qualityResult);
      
    } catch (error) {
      console.error('AS9100D task completion error:', error);
      throw error;
    }
  };

  const handleQualityCompletion = async (qualityResult: QualityResult, operatorNotes?: string[]) => {
    try {
      // For standard quality completion, pass through to the handler
      await onComplete(qualityResult, operatorNotes);
      
    } catch (error) {
      console.error('Quality completion error:', error);
      throw error;
    }
  };

  // Render the appropriate dialog based on task type
  switch (currentDialogType) {
    case 'material_approval':
      return (
        <MaterialApprovalDialog
          open={open}
          onOpenChange={onOpenChange}
          task={task}
          jobId={job?.id}
          partNumber={job?.item?.partName}
          partName={job?.item?.partName}
          orderId={job?.orderId}
          onComplete={handleAS9100DCompletion}
          isLoading={isLoading}
        />
      );

    case 'contract_review':
      return (
        <ContractReviewDialog
          open={open}
          onOpenChange={onOpenChange}
          task={task}
          onComplete={handleAS9100DCompletion}
          isLoading={isLoading}
        />
      );

    case 'lot_planning':
      return (
        <LotPlanningDialog
          open={open}
          onOpenChange={onOpenChange}
          task={task}
          onComplete={handleAS9100DCompletion}
          isLoading={isLoading}
        />
      );

    case 'quality_completion':
      return (
        <TaskCompletionDialog
          open={open}
          onOpenChange={onOpenChange}
          task={task}
          onComplete={handleQualityCompletion}
          isLoading={isLoading}
        />
      );

    default:
      // For tasks that don't require specific dialogs, use standard quality completion
      return (
        <TaskCompletionDialog
          open={open}
          onOpenChange={onOpenChange}
          task={task}
          onComplete={handleQualityCompletion}
          isLoading={isLoading}
        />
      );
  }
}

// Export utility functions for external use
export {
  determineTaskDialogType,
  requiresAS9100DDialog,
  validateAS9100DCompliance,
  createAS9100DAuditTrail
}; 