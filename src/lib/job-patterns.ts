import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import type { Job, JobTask, JobSubtask } from '@/types';
import type { 
  JobPattern, 
  JobPatternFirestore,
  PatternCreationResult,
  PatternSearchCriteria,
  PatternSimilarity,
  ProcessSequence,
  QualityTarget
} from '@/types/archival';
import { 
  getJobPerformanceData,
  calculateJobPerformanceMetrics 
} from './task-tracking';
import { archiveJobForPattern } from './job-archival';

const JOB_PATTERNS_COLLECTION = 'job_patterns';

// === Pattern Creation ===

/**
 * Create a new manufacturing pattern from a successful job
 */
export async function createJobPattern(
  job: Job,
  tasks: JobTask[],
  subtasks: JobSubtask[],
  patternData: {
    patternName: string;
    approvedBy: string;
    qualityLevel: 'proven' | 'experimental' | 'under_review';
    complianceVerified: boolean;
  }
): Promise<PatternCreationResult> {
  try {
    console.log(`Creating pattern ${patternData.patternName} from job ${job.id}`);
    
    // Get and validate performance data
    const performanceData = await getJobPerformanceData(job.id);
    const metrics = calculateJobPerformanceMetrics(performanceData);
    
    // Validate pattern readiness
    const validation = validatePatternReadiness(performanceData, metrics);
    if (!validation.passed) {
      return {
        success: false,
        errors: validation.issues,
        qualityValidation: validation
      };
    }
    
    // Create pattern ID
    const patternId = generatePatternId(job.item.partName, patternData.patternName);
    
    // Build frozen process data
    const frozenProcessData = buildFrozenProcessData(tasks, subtasks, performanceData);
    
    // Calculate historical performance
    const historicalPerformance = calculateHistoricalPerformance(performanceData);
    
    // Create the pattern
    const pattern: JobPatternFirestore = {
      id: patternId,
      patternName: patternData.patternName,
      sourceJobId: job.id,
      partNumber: job.item.partName,
      revision: '1.0', // Initial version
      
      frozenProcessData,
      historicalPerformance,
      
      qualitySignoff: {
        approvedBy: patternData.approvedBy,
        approvalDate: serverTimestamp() as Timestamp,
        qualityLevel: patternData.qualityLevel,
        complianceVerified: patternData.complianceVerified
      },
      
      usage: {
        timesUsed: 0,
        successfulUses: 0,
        failedUses: 0,
        lastUsed: new Date().toISOString(),
        avgCustomerSatisfaction: 0
      },
      
      createdBy: patternData.approvedBy,
      createdAt: serverTimestamp() as Timestamp,
      lastUpdated: serverTimestamp() as Timestamp,
      version: '1.0',
      status: 'active'
    };
    
    // Save pattern to database
    await setDoc(doc(db, JOB_PATTERNS_COLLECTION, patternId), pattern);
    
    // Archive the source job
    await archiveJobForPattern(job, tasks, subtasks, patternData.patternName, patternData.approvedBy);
    
    console.log(`Successfully created pattern ${patternId}`);
    
    return {
      success: true,
      patternId,
      patternName: patternData.patternName,
      qualityValidation: validation
    };
    
  } catch (error) {
    console.error('Error creating job pattern:', error);
    
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown pattern creation error'],
      qualityValidation: {
        passed: false,
        score: 0,
        issues: ['Pattern creation failed']
      }
    };
  }
}

/**
 * Update an existing pattern with new performance data
 */
export async function updatePatternPerformance(
  patternId: string,
  jobPerformanceData: {
    successful: boolean;
    qualityScore: number;
    customerSatisfaction?: number;
    lessonsLearned: string[];
  }
): Promise<void> {
  try {
    const patternDoc = await getDoc(doc(db, JOB_PATTERNS_COLLECTION, patternId));
    if (!patternDoc.exists()) {
      throw new Error(`Pattern ${patternId} not found`);
    }
    
    const pattern = patternDoc.data() as JobPatternFirestore;
    
    // Update usage statistics
    const updates: Partial<JobPatternFirestore> = {
      usage: {
        ...pattern.usage,
        timesUsed: pattern.usage.timesUsed + 1,
        successfulUses: jobPerformanceData.successful 
          ? pattern.usage.successfulUses + 1 
          : pattern.usage.successfulUses,
        failedUses: !jobPerformanceData.successful 
          ? pattern.usage.failedUses + 1 
          : pattern.usage.failedUses,
        lastUsed: new Date().toISOString(),
        avgCustomerSatisfaction: jobPerformanceData.customerSatisfaction 
          ? (pattern.usage.avgCustomerSatisfaction + jobPerformanceData.customerSatisfaction) / 2
          : pattern.usage.avgCustomerSatisfaction
      },
      lastUpdated: serverTimestamp() as Timestamp
    };
    
    // Update historical performance
    if (jobPerformanceData.qualityScore) {
      updates.historicalPerformance = {
        ...pattern.historicalPerformance,
        avgQualityScore: (pattern.historicalPerformance.avgQualityScore + jobPerformanceData.qualityScore) / 2,
        successRate: (pattern.usage.successfulUses + (jobPerformanceData.successful ? 1 : 0)) / 
                    (pattern.usage.timesUsed + 1) * 100
      };
    }
    
    await updateDoc(doc(db, JOB_PATTERNS_COLLECTION, patternId), updates);
    
    console.log(`Updated pattern ${patternId} performance`);
    
  } catch (error) {
    console.error('Error updating pattern performance:', error);
    throw error;
  }
}

// === Pattern Retrieval & Search ===

/**
 * Get a pattern by ID
 */
export async function getJobPattern(patternId: string): Promise<JobPattern | null> {
  try {
    const docRef = await getDoc(doc(db, JOB_PATTERNS_COLLECTION, patternId));
    if (!docRef.exists()) return null;
    
    return convertJobPatternFromFirestore(docRef.data() as JobPatternFirestore);
  } catch (error) {
    console.error('Error retrieving job pattern:', error);
    return null;
  }
}

/**
 * Search patterns by criteria
 */
export async function searchJobPatterns(
  criteria: PatternSearchCriteria,
  maxResults: number = 20
): Promise<JobPattern[]> {
  try {
    let q = collection(db, JOB_PATTERNS_COLLECTION);
    const constraints = [];
    
    // Build query constraints
    if (criteria.partNumber) {
      constraints.push(where('partNumber', '==', criteria.partNumber));
    }
    
    if (criteria.processTypes && criteria.processTypes.length > 0) {
      constraints.push(where('frozenProcessData.assignedProcesses', 'array-contains-any', criteria.processTypes));
    }
    
    if (criteria.qualityLevel && criteria.qualityLevel.length > 0) {
      constraints.push(where('qualitySignoff.qualityLevel', 'in', criteria.qualityLevel));
    }
    
    if (criteria.minQualityScore) {
      constraints.push(where('historicalPerformance.avgQualityScore', '>=', criteria.minQualityScore));
    }
    
    // Add active status filter
    constraints.push(where('status', '==', 'active'));
    
    // Order by success rate and limit
    constraints.push(orderBy('historicalPerformance.successRate', 'desc'));
    constraints.push(limit(maxResults));
    
    const querySnapshot = await getDocs(query(q, ...constraints));
    
    return querySnapshot.docs.map(doc => 
      convertJobPatternFromFirestore(doc.data() as JobPatternFirestore)
    );
    
  } catch (error) {
    console.error('Error searching job patterns:', error);
    return [];
  }
}

/**
 * Find similar patterns for a given part/process configuration
 */
export async function findSimilarPatterns(
  targetData: {
    partNumber?: string;
    assignedProcesses: string[];
    rawMaterialType?: string;
    quantity: number;
  }
): Promise<PatternSimilarity[]> {
  try {
    // Get all active patterns
    const allPatterns = await searchJobPatterns({}, 100);
    
    const similarities: PatternSimilarity[] = [];
    
    for (const pattern of allPatterns) {
      const similarity = calculatePatternSimilarity(targetData, pattern);
      if (similarity.similarityScore >= 30) { // Minimum 30% similarity
        similarities.push(similarity);
      }
    }
    
    // Sort by similarity score
    return similarities.sort((a, b) => b.similarityScore - a.similarityScore);
    
  } catch (error) {
    console.error('Error finding similar patterns:', error);
    return [];
  }
}

/**
 * Get top performing patterns
 */
export async function getTopPerformingPatterns(limit: number = 10): Promise<JobPattern[]> {
  return searchJobPatterns({ minQualityScore: 8 }, limit);
}

/**
 * Get recently used patterns
 */
export async function getRecentlyUsedPatterns(limit: number = 5): Promise<JobPattern[]> {
  try {
    const q = query(
      collection(db, JOB_PATTERNS_COLLECTION),
      where('status', '==', 'active'),
      where('usage.timesUsed', '>', 0),
      orderBy('usage.lastUsed', 'desc'),
      orderBy('usage.timesUsed', 'desc'),
      limit(limit)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      convertJobPatternFromFirestore(doc.data() as JobPatternFirestore)
    );
    
  } catch (error) {
    console.error('Error getting recently used patterns:', error);
    return [];
  }
}

// === Pattern Analysis & Utilities ===

/**
 * Calculate similarity between target configuration and existing pattern
 */
function calculatePatternSimilarity(
  target: {
    partNumber?: string;
    assignedProcesses: string[];
    rawMaterialType?: string;
    quantity: number;
  },
  pattern: JobPattern
): PatternSimilarity {
  let totalScore = 0;
  let maxScore = 0;
  const differences: PatternSimilarity['differences'] = [];
  
  // Part number similarity (40% weight)
  const partWeight = 40;
  maxScore += partWeight;
  if (target.partNumber && target.partNumber === pattern.partNumber) {
    totalScore += partWeight;
  } else if (target.partNumber) {
    differences.push({
      field: 'partNumber',
      patternValue: pattern.partNumber,
      currentValue: target.partNumber,
      impact: 'high'
    });
  }
  
  // Process similarity (50% weight)
  const processWeight = 50;
  maxScore += processWeight;
  const patternProcesses = pattern.frozenProcessData.assignedProcesses;
  const matchingProcesses = target.assignedProcesses.filter(p => 
    patternProcesses.includes(p)
  );
  
  const processScore = (matchingProcesses.length / Math.max(target.assignedProcesses.length, patternProcesses.length)) * processWeight;
  totalScore += processScore;
  
  if (matchingProcesses.length < target.assignedProcesses.length) {
    differences.push({
      field: 'assignedProcesses',
      patternValue: patternProcesses,
      currentValue: target.assignedProcesses,
      impact: 'high'
    });
  }
  
  // Quantity similarity (10% weight)
  const quantityWeight = 10;
  maxScore += quantityWeight;
  // Assume similar quantities are within 50% of each other
  const quantityRatio = Math.min(target.quantity, 100) / Math.min(100, 100); // Simplified
  totalScore += quantityRatio * quantityWeight;
  
  const similarityScore = (totalScore / maxScore) * 100;
  
  // Determine risk assessment and recommendation
  let riskAssessment: PatternSimilarity['riskAssessment'];
  let recommendation: PatternSimilarity['recommendation'];
  
  if (similarityScore >= 90) {
    riskAssessment = 'low';
    recommendation = 'use_exact';
  } else if (similarityScore >= 70) {
    riskAssessment = 'medium';
    recommendation = 'use_with_modifications';
  } else {
    riskAssessment = 'high';
    recommendation = 'create_new';
  }
  
  return {
    patternId: pattern.id,
    similarityScore: Math.round(similarityScore),
    matchingProcesses,
    differences,
    riskAssessment,
    recommendation
  };
}

/**
 * Validate if a job is ready to become a pattern
 */
function validatePatternReadiness(
  performanceData: any[],
  metrics: ReturnType<typeof calculateJobPerformanceMetrics>
): {
  passed: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 0;
  
  // Check if this is a legacy job (no quality data recorded)
  const hasQualityData = performanceData.some(p => p.qualityResult && p.qualityResult.score > 0);
  
  if (hasQualityData) {
    // Standard validation for jobs with quality data
    
    // Quality score check (40% weight)
    if (metrics.avgQualityScore >= 8) {
      score += 40;
    } else {
      issues.push(`Quality score ${metrics.avgQualityScore.toFixed(1)} below required 8.0`);
    }
    
    // Efficiency check (30% weight)
    if (metrics.overallEfficiency >= 80) {
      score += 30;
    } else {
      issues.push(`Efficiency ${metrics.overallEfficiency.toFixed(1)}% below required 80%`);
    }
    
    // On-time completion (20% weight)
    if (metrics.onTimeCompletion) {
      score += 20;
    } else {
      issues.push('Job was not completed on time');
    }
    
    // Critical issues check (10% weight)
    if (metrics.criticalIssues === 0) {
      score += 10;
    } else {
      issues.push(`${metrics.criticalIssues} critical issues remain unresolved`);
    }
    
    return {
      passed: score >= 80, // 80% threshold for pattern creation
      score,
      issues
    };
  } else {
    // Legacy validation for jobs without quality data
    // More relaxed criteria for completed jobs
    
    // Basic completion check (50% weight)
    if (performanceData.length > 0) {
      score += 50;
    } else {
      issues.push('No performance data available');
    }
    
    // Efficiency check (30% weight) - more lenient
    if (metrics.overallEfficiency >= 60) {
      score += 30;
    } else {
      issues.push(`Efficiency ${metrics.overallEfficiency.toFixed(1)}% below required 60%`);
    }
    
    // Basic timing check (20% weight)
    if (metrics.onTimeCompletion || performanceData.every(p => p.status === 'completed')) {
      score += 20;
    } else {
      issues.push('Job completion status unclear');
    }
    
    // For legacy jobs, we're more permissive
    return {
      passed: score >= 70, // Lower threshold for legacy jobs
      score,
      issues: issues.length > 0 ? [...issues, 'Legacy job - quality data will be estimated'] : ['Legacy job - quality data will be estimated']
    };
  }
}

/**
 * Build frozen process data from job tasks
 */
function buildFrozenProcessData(
  tasks: JobTask[],
  subtasks: JobSubtask[],
  performanceData: any[]
): JobPattern['frozenProcessData'] {
  // Extract assigned processes from job
  const assignedProcesses = tasks
    .filter(task => task.category === 'manufacturing_process')
    .map(task => task.name);
  
  // Build process sequence
  const processSequence: ProcessSequence[] = tasks
    .filter(task => task.category === 'manufacturing_process')
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
    .map((task, index) => ({
      processName: task.name,
      orderIndex: index,
      dependencies: task.dependencies || [],
      estimatedDuration: task.estimatedDurationHours || 0,
      criticalControlPoints: [] // To be extracted from task details
    }));
  
  // Create task templates from successful tasks
  const taskTemplates = tasks.map(task => ({
    id: task.templateId || task.id,
    name: task.name,
    category: task.category,
    estimatedDurationHours: task.estimatedDurationHours || 0,
    assignedTo: task.assignedTo,
    dependencies: task.dependencies || [],
    orderIndex: task.orderIndex || 0,
    priority: task.priority || 'medium',
    status: 'pending' as const,
    description: task.description || ''
  }));
  
  // Create subtask templates
  const subtaskTemplates = subtasks.map(subtask => ({
    id: subtask.templateId || subtask.id,
    taskId: subtask.taskId,
    name: subtask.name,
    estimatedDurationMinutes: subtask.estimatedDurationMinutes || 0,
    orderIndex: subtask.orderIndex || 0,
    status: 'pending' as const,
    assignedTo: subtask.assignedTo
  }));
  
  return {
    assignedProcesses,
    processSequence,
    taskTemplates,
    subtaskTemplates,
    criticalParameters: {} // To be populated with process-specific parameters
  };
}

/**
 * Calculate historical performance from job data
 */
function calculateHistoricalPerformance(performanceData: any[]): JobPattern['historicalPerformance'] {
  if (performanceData.length === 0) {
    return {
      avgDuration: 0,
      avgQualityScore: 0,
      successRate: 0,
      commonIssues: [],
      bestPractices: []
    };
  }
  
  const avgDuration = performanceData.reduce((sum, p) => sum + (p.actualDuration || 0), 0) / performanceData.length;
  const avgQualityScore = performanceData.reduce((sum, p) => sum + (p.qualityResult?.score || 0), 0) / performanceData.length;
  const successRate = performanceData.filter(p => (p.qualityResult?.score || 0) >= 8).length / performanceData.length * 100;
  
  // Extract common issues
  const allIssues = performanceData.flatMap(p => p.issuesEncountered || []);
  const issueMap = new Map<string, number>();
  allIssues.forEach(issue => {
    const key = `${issue.type}:${issue.description}`;
    issueMap.set(key, (issueMap.get(key) || 0) + 1);
  });
  
  const commonIssues = Array.from(issueMap.entries())
    .filter(([_, count]) => count > 1)
    .map(([key, count]) => {
      const [type, description] = key.split(':');
      return {
        id: `common_${Date.now()}_${Math.random()}`,
        type: type as any,
        severity: 'medium' as any,
        description,
        reportedBy: 'pattern_analysis',
        reportedAt: new Date().toISOString()
      };
    });
  
  // Extract best practices from lessons learned
  const bestPractices = performanceData
    .flatMap(p => p.lessonsLearned || [])
    .filter((practice, index, arr) => arr.indexOf(practice) === index) // Remove duplicates
    .slice(0, 5); // Top 5 practices
  
  return {
    avgDuration,
    avgQualityScore,
    successRate,
    commonIssues,
    bestPractices
  };
}

/**
 * Generate unique pattern ID
 */
function generatePatternId(partNumber: string, patternName: string): string {
  const cleanPartNumber = partNumber.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanPatternName = patternName.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = Date.now();
  
  return `pattern_${cleanPartNumber}_${cleanPatternName}_${timestamp}`.toLowerCase();
}

/**
 * Convert Firestore data to TypeScript interface
 */
function convertJobPatternFromFirestore(data: JobPatternFirestore): JobPattern {
  return {
    ...data,
    qualitySignoff: {
      ...data.qualitySignoff,
      approvalDate: data.qualitySignoff.approvalDate.toDate().toISOString()
    },
    createdAt: data.createdAt.toDate().toISOString(),
    lastUpdated: data.lastUpdated.toDate().toISOString()
  };
}

// === Pattern Management ===

/**
 * Deprecate a pattern (mark as inactive)
 */
export async function deprecatePattern(
  patternId: string,
  reason: string,
  deprecatedBy: string
): Promise<void> {
  try {
    await updateDoc(doc(db, JOB_PATTERNS_COLLECTION, patternId), {
      status: 'deprecated',
      deprecatedReason: reason,
      deprecatedBy,
      deprecatedAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });
    
    console.log(`Deprecated pattern ${patternId}: ${reason}`);
  } catch (error) {
    console.error('Error deprecating pattern:', error);
    throw error;
  }
}

/**
 * Get pattern usage statistics
 */
export async function getPatternStatistics(): Promise<{
  totalPatterns: number;
  activePatterns: number;
  avgSuccessRate: number;
  mostUsedPatterns: Array<{
    id: string;
    name: string;
    timesUsed: number;
    successRate: number;
  }>;
}> {
  try {
    const patterns = await searchJobPatterns({}, 1000);
    
    const activePatterns = patterns.filter(p => p.status === 'active');
    const avgSuccessRate = activePatterns.length > 0
      ? activePatterns.reduce((sum, p) => sum + p.historicalPerformance.successRate, 0) / activePatterns.length
      : 0;
    
    const mostUsedPatterns = patterns
      .filter(p => p.usage.timesUsed > 0)
      .sort((a, b) => b.usage.timesUsed - a.usage.timesUsed)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        name: p.patternName,
        timesUsed: p.usage.timesUsed,
        successRate: p.historicalPerformance.successRate
      }));
    
    return {
      totalPatterns: patterns.length,
      activePatterns: activePatterns.length,
      avgSuccessRate,
      mostUsedPatterns
    };
    
  } catch (error) {
    console.error('Error getting pattern statistics:', error);
    return {
      totalPatterns: 0,
      activePatterns: 0,
      avgSuccessRate: 0,
      mostUsedPatterns: []
    };
  }
} 