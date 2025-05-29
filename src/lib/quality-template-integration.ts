import type { QualitySystemDocument } from '@/types';
import type { JobSubtask, QualityCheckpoint } from '@/types/tasks';
import { qualitySystemDocuments } from '@/lib/quality-system-data';

/**
 * Get quality template document for a subtask
 */
export function getQualityTemplateForSubtask(subtaskId: string, qualityTemplateId?: string): QualitySystemDocument | null {
  if (!qualityTemplateId) return null;
  
  return qualitySystemDocuments.find(doc => doc.docId === qualityTemplateId) || null;
}

/**
 * Generate printable document URL/path for a subtask
 */
export function generatePrintableDocument(subtask: JobSubtask, jobData?: any): string {
  const qualityDoc = getQualityTemplateForSubtask(subtask.id, subtask.qualityTemplateId);
  if (!qualityDoc || !subtask.isPrintable) return '';
  
  // Return path to the template file
  // In a real implementation, this would generate a job-specific document
  return qualityDoc.filePath || '';
}

/**
 * Get all quality checkpoints for a subtask
 */
export function getQualityCheckpoints(subtask: JobSubtask): QualityCheckpoint[] {
  if (!subtask.qualityTemplateId) return [];
  
  const qualityDoc = getQualityTemplateForSubtask(subtask.id, subtask.qualityTemplateId);
  if (!qualityDoc) return [];
  
  // Generate quality checkpoints based on subtask type and AS9100D requirements
  const checkpoints: QualityCheckpoint[] = [];
  
  // Add checkpoint based on subtask category
  switch (subtask.category) {
    case 'quality':
      checkpoints.push({
        subtaskId: subtask.id,
        checkpointName: 'Quality Verification Required',
        qualityTemplateId: subtask.qualityTemplateId,
        requiredSignoff: true,
        inspectionRequired: true,
        measurementRequired: subtask.name.toLowerCase().includes('inspection'),
        documentationRequired: true
      });
      break;
      
    case 'production':
      if (subtask.name.toLowerCase().includes('first article')) {
        checkpoints.push({
          subtaskId: subtask.id,
          checkpointName: 'First Article Inspection',
          qualityTemplateId: subtask.qualityTemplateId,
          requiredSignoff: true,
          inspectionRequired: true,
          measurementRequired: true,
          documentationRequired: true
        });
      }
      break;
      
    case 'special_process':
      checkpoints.push({
        subtaskId: subtask.id,
        checkpointName: 'Special Process Verification',
        qualityTemplateId: subtask.qualityTemplateId,
        requiredSignoff: true,
        inspectionRequired: false,
        measurementRequired: false,
        documentationRequired: true
      });
      break;
  }
  
  return checkpoints;
}

/**
 * Validate subtask against AS9100D requirements
 */
export function validateAS9100DCompliance(subtask: JobSubtask): {
  isCompliant: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check if quality template is linked for quality-critical subtasks
  if (subtask.category === 'quality' && !subtask.qualityTemplateId) {
    issues.push('Quality subtask missing quality template reference');
  }
  
  // Check if completed subtasks have proper verification
  if (subtask.status === 'completed' && subtask.category === 'quality') {
    if (!subtask.verifiedBy) {
      issues.push('Completed quality subtask requires verification signature');
    }
    
    if (!subtask.completedAt) {
      issues.push('Completed subtask missing completion timestamp');
    }
  }
  
  // Check for first article inspection requirements
  if (subtask.name.toLowerCase().includes('first article') && subtask.status === 'completed') {
    if (!subtask.attachments || subtask.attachments.length === 0) {
      recommendations.push('Consider attaching FAIR documentation for traceability');
    }
  }
  
  // Check AS9100D clause compliance
  if (subtask.as9100dClause && subtask.status === 'completed') {
    const criticalClauses = ['8.5.1.3', '8.6', '8.7']; // FAI, Final Inspection, Nonconforming Output
    if (criticalClauses.includes(subtask.as9100dClause) && !subtask.verifiedBy) {
      issues.push(`AS9100D clause ${subtask.as9100dClause} requires verification signature`);
    }
  }
  
  return {
    isCompliant: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * Get required documents for a subtask
 */
export function getRequiredDocuments(subtask: JobSubtask): string[] {
  const baseDocuments = subtask.requiredDocuments || [];
  const qualityDoc = getQualityTemplateForSubtask(subtask.id, subtask.qualityTemplateId);
  
  if (!qualityDoc) return baseDocuments;
  
  // Add quality template document to required documents
  return [...baseDocuments, qualityDoc.title];
}

/**
 * Generate quality documentation package for a job
 */
export function generateQualityPackage(subtasks: JobSubtask[], jobInfo: any): {
  documents: QualitySystemDocument[];
  missingDocuments: string[];
  complianceStatus: 'compliant' | 'partial' | 'non-compliant';
} {
  const documents: QualitySystemDocument[] = [];
  const missingDocuments: string[] = [];
  
  // Collect all quality templates used in subtasks
  const qualityTemplateIds = new Set(
    subtasks
      .filter(s => s.qualityTemplateId)
      .map(s => s.qualityTemplateId!)
  );
  
  // Get corresponding quality documents
  qualityTemplateIds.forEach(templateId => {
    const doc = qualitySystemDocuments.find(d => d.docId === templateId);
    if (doc) {
      documents.push(doc);
    } else {
      missingDocuments.push(templateId);
    }
  });
  
  // Check compliance status
  const totalQualitySubtasks = subtasks.filter(s => s.category === 'quality').length;
  const compliantSubtasks = subtasks.filter(s => {
    const validation = validateAS9100DCompliance(s);
    return validation.isCompliant;
  }).length;
  
  let complianceStatus: 'compliant' | 'partial' | 'non-compliant';
  if (compliantSubtasks === totalQualitySubtasks) {
    complianceStatus = 'compliant';
  } else if (compliantSubtasks > 0) {
    complianceStatus = 'partial';
  } else {
    complianceStatus = 'non-compliant';
  }
  
  return {
    documents,
    missingDocuments,
    complianceStatus
  };
}

/**
 * Link subtask to quality template with validation
 */
export function linkSubtaskToTemplate(subtaskId: string, templateId: string): {
  success: boolean;
  message: string;
  qualityDocument?: QualitySystemDocument;
} {
  const qualityDoc = qualitySystemDocuments.find(doc => doc.docId === templateId);
  
  if (!qualityDoc) {
    return {
      success: false,
      message: `Quality template ${templateId} not found in system`
    };
  }
  
  // Validate template is appropriate for subtask (could add more sophisticated logic)
  return {
    success: true,
    message: `Successfully linked subtask ${subtaskId} to quality template ${templateId}`,
    qualityDocument: qualityDoc
  };
}

/**
 * Get AS9100D clause information for a quality template
 */
export function getAS9100DClauseInfo(templateId: string): {
  clause: string;
  title: string;
  description: string;
} | null {
  const qualityDoc = qualitySystemDocuments.find(doc => doc.docId === templateId);
  if (!qualityDoc || !qualityDoc.relevantClauses) return null;
  
  // Map common AS9100D clauses to descriptions
  const clauseDescriptions: Record<string, { title: string; description: string }> = {
    '8.1': {
      title: 'Operational Planning and Control',
      description: 'Requirements for planning and controlling production and service provision'
    },
    '8.2': {
      title: 'Requirements for Products and Services',
      description: 'Customer communication and contract review requirements'
    },
    '8.4': {
      title: 'Control of Externally Provided Processes, Products and Services',
      description: 'Supplier control and procurement requirements'
    },
    '8.5.1': {
      title: 'Control of Production and Service Provision',
      description: 'General requirements for production control'
    },
    '8.5.1.2': {
      title: 'Validation of Special Processes',
      description: 'Requirements for special processes that cannot be fully verified by inspection'
    },
    '8.5.1.3': {
      title: 'First Article Inspection',
      description: 'Requirements for first article inspection and verification'
    },
    '8.5.2': {
      title: 'Identification and Traceability',
      description: 'Requirements for product identification and traceability'
    },
    '8.5.4': {
      title: 'Preservation',
      description: 'Requirements for product preservation during production and delivery'
    },
    '8.6': {
      title: 'Release of Products and Services',
      description: 'Requirements for final inspection and product release'
    },
    '8.7': {
      title: 'Control of Nonconforming Outputs',
      description: 'Requirements for handling nonconforming products'
    }
  };
  
  const clauseInfo = clauseDescriptions[qualityDoc.relevantClauses];
  if (!clauseInfo) return null;
  
  return {
    clause: qualityDoc.relevantClauses,
    title: clauseInfo.title,
    description: clauseInfo.description
  };
} 