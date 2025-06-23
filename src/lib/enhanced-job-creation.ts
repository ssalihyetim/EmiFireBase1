import type { Job, JobTask, Order, OfferItem } from '@/types';
import type { 
  JobPattern, 
  ManufacturingLot,
  PatternSimilarity,
  LotCreationResult
} from '@/types/archival';
import { generateTrackedUnifiedJobTasks } from './enhanced-task-automation';
import { saveJob } from './firebase-jobs';
import { saveJobTasks } from './firebase-tasks';
// Note: generateLotNumber will be implemented in lot-number-generator.ts
function generateLotNumber(): string {
  const timestamp = Date.now();
  const year = new Date().getFullYear();
  return `LOT-${year}-${String(timestamp).slice(-6)}`;
}

// === Pattern-Based Job Creation ===

/**
 * Create a job from an existing pattern
 */
export async function createJobFromPattern(
  patternId: string,
  orderData: {
    orderId: string;
    orderNumber: string;
    clientName: string;
    item: OfferItem;
    dueDate?: string;
    priority?: 'normal' | 'urgent' | 'critical';
    specialInstructions?: string;
  },
  lotId?: string
): Promise<{
  job: Job;
  tasks: JobTask[];
  patternUsed: string;
}> {
  try {
    // TODO: Load pattern from database (to be implemented in pattern system)
    // const pattern = await getJobPattern(patternId);
    // For now, create job with pattern reference
    
    const jobId = `${orderData.orderId}-item-${orderData.item.id || Date.now()}`;
    
    const job: Job = {
      id: jobId,
      orderId: orderData.orderId,
      orderNumber: orderData.orderNumber,
      clientName: orderData.clientName,
      item: orderData.item,
      status: 'Pending',
      dueDate: orderData.dueDate,
      priority: orderData.priority || 'normal',
      specialInstructions: orderData.specialInstructions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Pattern & archival tracking
      createdFromPatternId: patternId,
      lotId: lotId,
      isPatternCandidate: false // Already created from pattern
    };
    
    // Generate tasks with tracking enabled and pattern reference
    const tasks = await generateTrackedUnifiedJobTasks(job);
    
    // Mark tasks as created from pattern
    const enhancedTasks = tasks.map(task => ({
      ...task,
      patternTaskId: `${patternId}_${task.templateId}`, // Reference to pattern task
      trackingEnabled: true
    }));
    
    // Save job and tasks
    await saveJob(job);
    await saveJobTasks(jobId, enhancedTasks);
    
    console.log(`Created job ${jobId} from pattern ${patternId}`);
    
    return {
      job,
      tasks: enhancedTasks,
      patternUsed: patternId
    };
    
  } catch (error) {
    console.error('Error creating job from pattern:', error);
    throw error;
  }
}

/**
 * Create a regular job with enhanced tracking
 */
export async function createEnhancedJob(
  orderData: {
    orderId: string;
    orderNumber: string;
    clientName: string;
    item: OfferItem;
    dueDate?: string;
    priority?: 'normal' | 'urgent' | 'critical';
    specialInstructions?: string;
  },
  enableTracking: boolean = true
): Promise<{
  job: Job;
  tasks: JobTask[];
  isPatternCandidate: boolean;
}> {
  try {
    const jobId = `${orderData.orderId}-item-${orderData.item.id || Date.now()}`;
    
    const job: Job = {
      id: jobId,
      orderId: orderData.orderId,
      orderNumber: orderData.orderNumber,
      clientName: orderData.clientName,
      item: orderData.item,
      status: 'Pending',
      dueDate: orderData.dueDate,
      priority: orderData.priority || 'normal',
      specialInstructions: orderData.specialInstructions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Archival tracking
      isPatternCandidate: true // New jobs can become patterns
    };
    
    // Generate tasks with or without tracking
    const tasks = enableTracking 
      ? await generateTrackedUnifiedJobTasks(job)
      : await generateTrackedUnifiedJobTasks(job); // Always use tracked for now
    
    // Save job and tasks
    await saveJob(job);
    await saveJobTasks(jobId, tasks);
    
    console.log(`Created enhanced job ${jobId} with tracking: ${enableTracking}`);
    
    return {
      job,
      tasks,
      isPatternCandidate: true
    };
    
  } catch (error) {
    console.error('Error creating enhanced job:', error);
    throw error;
  }
}

// === Lot Management ===

/**
 * Create a manufacturing lot with multiple jobs from the same pattern
 */
export async function createManufacturingLot(
  patternId: string,
  lotData: {
    partNumber: string;
    partName: string;
    totalQuantity: number;
    orders: Array<{
      orderId: string;
      orderNumber: string;
      clientName: string;
      item: OfferItem;
      quantity: number;
      dueDate?: string;
      priority?: 'normal' | 'urgent' | 'critical';
    }>;
  }
): Promise<LotCreationResult> {
  try {
         const lotId = generateLotNumber();
     const lotNumber = lotId;
    
    // TODO: Create manufacturing lot record (to be implemented)
    // const lot: ManufacturingLot = { ... };
    
    const createdJobs: Job[] = [];
    let totalJobsCreated = 0;
    const errors: string[] = [];
    
    // Create jobs for each order in the lot
    for (const orderData of lotData.orders) {
      try {
        const { job, tasks } = await createJobFromPattern(
          patternId,
          {
            orderId: orderData.orderId,
            orderNumber: orderData.orderNumber,
            clientName: orderData.clientName,
            item: orderData.item,
            dueDate: orderData.dueDate,
            priority: orderData.priority
          },
          lotId
        );
        
        createdJobs.push(job);
        totalJobsCreated++;
        
      } catch (error) {
        const errorMsg = `Failed to create job for order ${orderData.orderNumber}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    const result: LotCreationResult = {
      success: errors.length === 0,
      lotId,
      lotNumber,
      jobsCreated: totalJobsCreated,
      errors: errors.length > 0 ? errors : undefined
    };
    
    if (result.success) {
      console.log(`Successfully created lot ${lotNumber} with ${totalJobsCreated} jobs`);
    } else {
      console.warn(`Lot creation completed with errors: ${errors.length} failures`);
    }
    
    return result;
    
  } catch (error) {
    console.error('Error creating manufacturing lot:', error);
    return {
      success: false,
      jobsCreated: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// === Pattern Discovery & Suggestions ===

/**
 * Find similar patterns for a given job configuration
 */
export async function findSimilarPatterns(
  jobData: {
    partNumber?: string;
    assignedProcesses: string[];
    rawMaterialType?: string;
    quantity: number;
  }
): Promise<PatternSimilarity[]> {
  try {
    // TODO: Implement pattern similarity search (to be implemented in pattern system)
    // This would analyze existing patterns and return similarity scores
    
    // For now, return empty array - to be implemented with pattern database
    console.log('Pattern similarity search not yet implemented');
    return [];
    
  } catch (error) {
    console.error('Error finding similar patterns:', error);
    return [];
  }
}

/**
 * Analyze job creation options with pattern suggestions
 */
export async function analyzeJobCreationOptions(
  orderItem: OfferItem
): Promise<{
  suggestedPatterns: PatternSimilarity[];
  recommendations: {
    action: 'use_pattern' | 'create_new' | 'modify_pattern';
    patternId?: string;
    reasoning: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
  estimatedBenefits: {
    timeReduction?: number; // Percentage
    qualityImprovement?: number; // Percentage
    riskReduction?: number; // Percentage
  };
}> {
  try {
    // Find similar patterns
    const similarPatterns = await findSimilarPatterns({
      partNumber: orderItem.partName, // Using part name as fallback
      assignedProcesses: orderItem.assignedProcesses || [],
      rawMaterialType: orderItem.rawMaterialType,
      quantity: orderItem.quantity
    });
    
    // Determine recommendation based on pattern availability
    let recommendation: any = {
      action: 'create_new' as const,
      reasoning: 'No similar patterns found - creating new job for future pattern creation',
      riskLevel: 'medium' as const
    };
    
    if (similarPatterns.length > 0) {
      const bestMatch = similarPatterns[0];
      
      if (bestMatch.similarityScore >= 90) {
        recommendation = {
          action: 'use_pattern' as const,
          patternId: bestMatch.patternId,
          reasoning: `High similarity (${bestMatch.similarityScore}%) - use existing pattern for consistent quality`,
          riskLevel: 'low' as const
        };
      } else if (bestMatch.similarityScore >= 70) {
        recommendation = {
          action: 'modify_pattern' as const,
          patternId: bestMatch.patternId,
          reasoning: `Good similarity (${bestMatch.similarityScore}%) - modify existing pattern to fit requirements`,
          riskLevel: 'medium' as const
        };
      }
    }
    
    // Estimate benefits based on pattern usage
    const estimatedBenefits = {
      timeReduction: recommendation.action === 'use_pattern' ? 25 : 
                    recommendation.action === 'modify_pattern' ? 15 : 0,
      qualityImprovement: recommendation.action === 'use_pattern' ? 20 : 
                         recommendation.action === 'modify_pattern' ? 10 : 0,
      riskReduction: recommendation.action === 'use_pattern' ? 30 : 
                    recommendation.action === 'modify_pattern' ? 15 : 0
    };
    
    return {
      suggestedPatterns: similarPatterns,
      recommendations: recommendation,
      estimatedBenefits
    };
    
  } catch (error) {
    console.error('Error analyzing job creation options:', error);
    
    // Return safe default
    return {
      suggestedPatterns: [],
      recommendations: {
        action: 'create_new',
        reasoning: 'Error analyzing patterns - creating new job',
        riskLevel: 'medium'
      },
      estimatedBenefits: {}
    };
  }
}

// === Validation & Quality Checks ===

/**
 * Validate job creation data before processing
 */
export function validateJobCreationData(
  orderData: {
    orderId: string;
    orderNumber: string;
    clientName: string;
    item: OfferItem;
    dueDate?: string;
  }
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required field validation
  if (!orderData.orderId) errors.push('Order ID is required');
  if (!orderData.orderNumber) errors.push('Order Number is required');
  if (!orderData.clientName) errors.push('Client Name is required');
  if (!orderData.item.partName) errors.push('Part Name is required');
  if (!orderData.item.assignedProcesses || orderData.item.assignedProcesses.length === 0) {
    errors.push('At least one manufacturing process must be assigned');
  }
  
  // Date validation
  if (orderData.dueDate) {
    const dueDate = new Date(orderData.dueDate);
    const today = new Date();
    
    if (dueDate < today) {
      errors.push('Due date cannot be in the past');
    }
    
    if (dueDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      warnings.push('Due date is less than 7 days away - may be challenging to meet');
    }
  }
  
  // Process validation
  const validProcesses = ['Turning', '3-Axis Milling', '4-Axis Milling', '5-Axis Milling', 'Grinding', 'Heat Treatment', 'Anodizing'];
  const invalidProcesses = orderData.item.assignedProcesses?.filter(
    process => !validProcesses.includes(process)
  ) || [];
  
  if (invalidProcesses.length > 0) {
    warnings.push(`Unknown processes: ${invalidProcesses.join(', ')}`);
  }
  
  // Quantity validation
  if (orderData.item.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  if (orderData.item.quantity > 1000) {
    warnings.push('Large quantity order - consider creating multiple lots');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// === Utility Functions ===

/**
 * Generate enhanced job ID with pattern reference
 */
export function generateEnhancedJobId(
  orderId: string, 
  itemId: string, 
  patternId?: string
): string {
  const timestamp = Date.now();
  const base = `${orderId}-item-${itemId}`;
  
  if (patternId) {
    return `${base}-pattern-${patternId.slice(-8)}-${timestamp}`;
  }
  
  return `${base}-${timestamp}`;
}

/**
 * Calculate estimated job completion time based on patterns or templates
 */
export function estimateJobCompletionTime(
  assignedProcesses: string[],
  quantity: number,
  patternId?: string
): {
  estimatedHours: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  basedOn: 'pattern' | 'template' | 'default';
} {
  // TODO: Implement pattern-based estimation (to be implemented with pattern system)
  
  // Fallback to template-based estimation
  const processEstimates: Record<string, number> = {
    'Turning': 4,
    '3-Axis Milling': 6,
    '4-Axis Milling': 8,
    '5-Axis Milling': 12,
    'Grinding': 3,
    'Heat Treatment': 2,
    'Anodizing': 1
  };
  
  const totalProcessHours = assignedProcesses.reduce((total, process) => {
    return total + (processEstimates[process] || 4); // Default 4 hours
  }, 0);
  
  // Add setup and overhead time
  const setupHours = assignedProcesses.length * 1; // 1 hour setup per process
  const overheadHours = 4; // Documentation, quality, etc.
  
  const estimatedHours = (totalProcessHours + setupHours + overheadHours) * Math.log10(quantity + 1);
  
  return {
    estimatedHours: Math.round(estimatedHours * 100) / 100,
    confidenceLevel: patternId ? 'high' : 'medium',
    basedOn: patternId ? 'pattern' : 'template'
  };
} 