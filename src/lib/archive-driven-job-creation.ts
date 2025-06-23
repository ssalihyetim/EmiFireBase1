import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit 
} from 'firebase/firestore';
import { db } from './firebase';
import type { Job, JobTask, JobSubtask, OrderItem } from '@/types';
import type { JobArchive, TaskPerformance } from '@/types/archival';
import { searchJobArchives } from './job-archival';
import { generateQualityIntelligence } from './historical-quality-intelligence';
import { generateSetupIntelligence } from './historical-setup-intelligence';

// === Archive-Driven Job Creation Types ===

export interface ArchiveDrivenJobSuggestion {
  sourceArchiveId: string;
  partName: string;
  similarityScore: number; // 0-100
  confidenceLevel: number; // 0-100
  recommendationType: 'exact_match' | 'similar_part' | 'similar_process' | 'hybrid';
  suggestedJob: Job;
  suggestedTasks: JobTask[];
  suggestedSubtasks: JobSubtask[];
  historicalPerformance: HistoricalPerformance;
  optimizations: JobOptimization[];
  riskAssessment: JobCreationRisk[];
  recommendations: string[];
}

export interface HistoricalPerformance {
  averageCompletionTime: number; // hours
  averageQualityScore: number;
  successRate: number; // percentage
  onTimeDeliveryRate: number; // percentage
  averageCost: number;
  efficiencyRating: number;
  commonIssues: string[];
  lessonsLearned: string[];
}

export interface JobOptimization {
  area: 'scheduling' | 'process_sequence' | 'resource_allocation' | 'quality' | 'setup';
  optimization: string;
  expectedBenefit: string;
  implementationEffort: 'low' | 'medium' | 'high';
  timeImpact: number; // hours saved/added
  qualityImpact: number; // quality points
  costImpact: number; // cost change
  basedOnArchives: number;
}

export interface JobCreationRisk {
  riskType: 'quality' | 'schedule' | 'cost' | 'complexity' | 'resource';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  likelihood: number; // 0-100
  impact: string;
  mitigation: string;
  historicalEvidence: string;
}

export interface ProcessInheritance {
  sourceJobId: string;
  inheritedProcesses: InheritedProcess[];
  processOptimizations: ProcessOptimization[];
  qualityImprovements: QualityImprovement[];
  setupOptimizations: SetupOptimization[];
}

export interface InheritedProcess {
  originalTaskId: string;
  processType: string;
  processParameters: Record<string, any>;
  historicalSuccess: boolean;
  qualityOutcome: number;
  timeEfficiency: number;
  adaptationRequired: boolean;
  adaptationNotes: string[];
}

export interface ProcessOptimization {
  processStep: string;
  originalApproach: string;
  optimizedApproach: string;
  expectedImprovement: string;
  basedOnSuccessfulJobs: number;
}

export interface QualityImprovement {
  qualityAspect: string;
  currentApproach: string;
  improvedApproach: string;
  expectedQualityGain: number;
  implementationComplexity: 'simple' | 'moderate' | 'complex';
}

export interface SetupOptimization {
  setupAspect: string;
  optimizedApproach: string;
  timeReduction: number; // minutes
  qualityBenefit: string;
  toolingRequirements: string[];
}

// === Core Archive-Driven Job Creation Functions ===

/**
 * Generate job suggestions based on order items and archived data
 */
export async function generateArchiveDrivenJobSuggestions(
  orderItems: OrderItem[],
  deliveryDate: string,
  customerId?: string
): Promise<ArchiveDrivenJobSuggestion[]> {
  try {
    console.log(`🏭 Generating archive-driven job suggestions for ${orderItems.length} items`);
    
    const suggestions: ArchiveDrivenJobSuggestion[] = [];
    
    for (const item of orderItems) {
      console.log(`📋 Analyzing item: ${item.partName || item.description}`);
      
      // Search for similar archived jobs
      const archives = await findSimilarArchivedJobs(item, customerId);
      
      if (archives.length === 0) {
        console.log(`❌ No similar archived jobs found for ${item.partName}`);
        continue;
      }
      
      // Generate suggestions based on similarity
      const itemSuggestions = await generateSuggestionsFromArchives(
        item, 
        archives, 
        deliveryDate
      );
      
      suggestions.push(...itemSuggestions);
    }
    
    // Sort by confidence and similarity
    suggestions.sort((a, b) => 
      (b.confidenceLevel * b.similarityScore) - (a.confidenceLevel * a.similarityScore)
    );
    
    console.log(`✅ Generated ${suggestions.length} archive-driven job suggestions`);
    return suggestions.slice(0, 10); // Top 10 suggestions
    
  } catch (error) {
    console.error('Error generating archive-driven job suggestions:', error);
    return [];
  }
}

/**
 * Create optimized job from archive suggestion
 */
export async function createJobFromArchiveSuggestion(
  suggestion: ArchiveDrivenJobSuggestion,
  customizations?: {
    deliveryDate?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
    specialRequirements?: string[];
    qualityRequirements?: Record<string, any>;
  }
): Promise<{
  job: Job;
  tasks: JobTask[];
  subtasks: JobSubtask[];
  processingNotes: string[];
}> {
  try {
    console.log(`🔧 Creating job from archive suggestion: ${suggestion.sourceArchiveId}`);
    
    // Start with suggested job template
    let optimizedJob = { ...suggestion.suggestedJob };
    let optimizedTasks = [...suggestion.suggestedTasks];
    let optimizedSubtasks = [...suggestion.suggestedSubtasks];
    
    // Apply customizations if provided
    if (customizations) {
      if (customizations.deliveryDate) {
        optimizedJob.deliveryDate = customizations.deliveryDate;
      }
      if (customizations.priority) {
        optimizedJob.priority = customizations.priority;
      }
      if (customizations.specialRequirements) {
        optimizedJob.specialRequirements = [
          ...(optimizedJob.specialRequirements || []),
          ...customizations.specialRequirements
        ];
      }
    }
    
    // Apply archive-based optimizations
    const processingNotes: string[] = [];
    
    for (const optimization of suggestion.optimizations) {
      processingNotes.push(`Applied ${optimization.area} optimization: ${optimization.optimization}`);
      
      // Apply specific optimizations
      if (optimization.area === 'scheduling') {
        optimizedTasks = applySchedulingOptimizations(optimizedTasks, optimization);
      } else if (optimization.area === 'process_sequence') {
        optimizedTasks = applyProcessSequenceOptimizations(optimizedTasks, optimization);
      } else if (optimization.area === 'setup') {
        optimizedTasks = await applySetupOptimizations(optimizedTasks, optimization);
      }
    }
    
    // Update IDs and timestamps
    const now = new Date().toISOString();
    optimizedJob.id = `job_${Date.now()}_archive_driven`;
    optimizedJob.createdAt = now;
    optimizedJob.updatedAt = now;
    
    // Update task and subtask IDs
    optimizedTasks = optimizedTasks.map((task, index) => ({
      ...task,
      id: `${optimizedJob.id}_task_${index + 1}`,
      jobId: optimizedJob.id,
      createdAt: now,
      updatedAt: now
    }));
    
    optimizedSubtasks = optimizedSubtasks.map((subtask, index) => {
      const parentTask = optimizedTasks.find(t => t.id === subtask.taskId);
      return {
        ...subtask,
        id: `${parentTask?.id || optimizedJob.id}_subtask_${index + 1}`,
        taskId: parentTask?.id || subtask.taskId,
        jobId: optimizedJob.id,
        createdAt: now,
        updatedAt: now
      };
    });
    
    processingNotes.push(`Job created from archive ${suggestion.sourceArchiveId} with ${suggestion.optimizations.length} optimizations applied`);
    
    console.log(`✅ Created optimized job with ${optimizedTasks.length} tasks and ${optimizedSubtasks.length} subtasks`);
    
    return {
      job: optimizedJob,
      tasks: optimizedTasks,
      subtasks: optimizedSubtasks,
      processingNotes
    };
    
  } catch (error) {
    console.error('Error creating job from archive suggestion:', error);
    throw error;
  }
}

/**
 * Inherit and optimize process sequences from successful archives
 */
export async function inheritProcessFromArchive(
  sourceArchiveId: string,
  targetPartSpecs: {
    partName: string;
    material?: string;
    quantity?: number;
    dimensions?: Record<string, any>;
    tolerances?: Record<string, any>;
  }
): Promise<ProcessInheritance | null> {
  try {
    console.log(`🔄 Inheriting process from archive: ${sourceArchiveId}`);
    
    // Get source archive
    const archives = await searchJobArchives({
      archiveIds: [sourceArchiveId],
      includeProcessData: true,
      maxResults: 1
    });
    
    if (archives.length === 0) {
      console.log(`❌ Source archive ${sourceArchiveId} not found`);
      return null;
    }
    
    const sourceArchive = archives[0];
    
    // Extract processes from source
    const inheritedProcesses = extractInheritedProcesses(sourceArchive, targetPartSpecs);
    
    // Generate optimizations based on historical success
    const processOptimizations = await generateProcessOptimizations(sourceArchive, targetPartSpecs);
    
    // Generate quality improvements
    const qualityImprovements = await generateQualityImprovements(sourceArchive, targetPartSpecs);
    
    // Generate setup optimizations
    const setupOptimizations = await generateSetupOptimizations(sourceArchive, targetPartSpecs);
    
    const inheritance: ProcessInheritance = {
      sourceJobId: sourceArchive.originalJobId,
      inheritedProcesses,
      processOptimizations,
      qualityImprovements,
      setupOptimizations
    };
    
    console.log(`✅ Inherited ${inheritedProcesses.length} processes with ${processOptimizations.length} optimizations`);
    return inheritance;
    
  } catch (error) {
    console.error('Error inheriting process from archive:', error);
    return null;
  }
}

/**
 * Predict job performance based on archive analysis
 */
export async function predictJobPerformance(
  jobSpecs: {
    partName: string;
    processes: string[];
    quantity: number;
    complexity?: 'low' | 'medium' | 'high';
    material?: string;
  },
  targetDeliveryDate: string
): Promise<{
  predictedDuration: number; // hours
  predictedQualityScore: number;
  onTimeDeliveryProbability: number; // percentage
  riskFactors: string[];
  confidenceLevel: number;
  recommendedActions: string[];
}> {
  try {
    console.log(`📊 Predicting performance for ${jobSpecs.partName}`);
    
    // Search for similar jobs
    const archives = await searchJobArchives({
      partName: jobSpecs.partName,
      processTypes: jobSpecs.processes,
      includePerformanceData: true,
      maxResults: 20
    });
    
    if (archives.length === 0) {
      return {
        predictedDuration: 8, // Default 8 hours
        predictedQualityScore: 8,
        onTimeDeliveryProbability: 80,
        riskFactors: ['No historical data available'],
        confidenceLevel: 30,
        recommendedActions: ['Use standard procedures and allow extra time']
      };
    }
    
    // Calculate predictions from historical data
    const durations = archives.map(a => a.performanceData?.totalDuration || 8);
    const qualityScores = archives.map(a => a.performanceData?.qualityScore || 8);
    const onTimeDeliveries = archives.filter(a => a.performanceData?.onTimeDelivery).length;
    
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const avgQuality = qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length;
    const onTimeRate = (onTimeDeliveries / archives.length) * 100;
    
    // Adjust for quantity
    const quantityFactor = Math.log(jobSpecs.quantity + 1) / Math.log(10); // Logarithmic scaling
    const adjustedDuration = avgDuration * (1 + quantityFactor * 0.3);
    
    // Identify risk factors
    const riskFactors: string[] = [];
    if (avgQuality < 8) riskFactors.push('Historical quality below AS9100D standard');
    if (onTimeRate < 80) riskFactors.push('Historical on-time delivery challenges');
    if (adjustedDuration > 16) riskFactors.push('Extended duration predicted');
    
    // Generate recommendations
    const recommendedActions: string[] = [];
    if (riskFactors.length > 0) {
      recommendedActions.push('Implement additional monitoring and quality checks');
    }
    if (avgDuration > 12) {
      recommendedActions.push('Consider breaking into multiple operations');
    }
    
    const confidenceLevel = Math.min(95, archives.length * 5); // 5% per archive, max 95%
    
    console.log(`✅ Performance prediction complete - Duration: ${adjustedDuration.toFixed(1)}h, Quality: ${avgQuality.toFixed(1)}`);
    
    return {
      predictedDuration: adjustedDuration,
      predictedQualityScore: avgQuality,
      onTimeDeliveryProbability: onTimeRate,
      riskFactors,
      confidenceLevel,
      recommendedActions
    };
    
  } catch (error) {
    console.error('Error predicting job performance:', error);
    return {
      predictedDuration: 8,
      predictedQualityScore: 8,
      onTimeDeliveryProbability: 80,
      riskFactors: ['Error in prediction'],
      confidenceLevel: 20,
      recommendedActions: ['Use standard procedures']
    };
  }
}

// === Helper Functions ===

async function findSimilarArchivedJobs(
  orderItem: OrderItem, 
  customerId?: string
): Promise<JobArchive[]> {
  // Search for similar parts by name
  let archives = await searchJobArchives({
    partName: orderItem.partName || orderItem.description,
    customerId,
    includePerformanceData: true,
    maxResults: 20
  });
  
  // If exact matches not found, search by keywords
  if (archives.length === 0) {
    const keywords = extractKeywords(orderItem.partName || orderItem.description);
    for (const keyword of keywords) {
      const keywordArchives = await searchJobArchives({
        partName: keyword,
        maxResults: 10
      });
      archives.push(...keywordArchives);
    }
  }
  
  // Remove duplicates
  const uniqueArchives = archives.filter((archive, index, self) => 
    index === self.findIndex(a => a.id === archive.id)
  );
  
  return uniqueArchives.slice(0, 10);
}

async function generateSuggestionsFromArchives(
  orderItem: OrderItem,
  archives: JobArchive[],
  deliveryDate: string
): Promise<ArchiveDrivenJobSuggestion[]> {
  const suggestions: ArchiveDrivenJobSuggestion[] = [];
  
  for (const archive of archives.slice(0, 5)) { // Top 5 archives
    const similarity = calculateSimilarity(orderItem, archive);
    
    if (similarity < 30) continue; // Skip low similarity
    
    // Create suggested job from archive
    const suggestedJob = createJobFromArchive(archive, orderItem, deliveryDate);
    const suggestedTasks = createTasksFromArchive(archive, suggestedJob);
    const suggestedSubtasks = createSubtasksFromArchive(archive, suggestedTasks);
    
    // Analyze historical performance
    const historicalPerformance = analyzeHistoricalPerformance(archive);
    
    // Generate optimizations
    const optimizations = await generateOptimizations(archive, orderItem);
    
    // Assess risks
    const riskAssessment = assessJobCreationRisks(archive, orderItem);
    
    // Generate recommendations
    const recommendations = generateRecommendations(archive, optimizations, riskAssessment);
    
    const suggestion: ArchiveDrivenJobSuggestion = {
      sourceArchiveId: archive.id,
      partName: orderItem.partName || orderItem.description,
      similarityScore: similarity,
      confidenceLevel: calculateConfidence(archive, similarity),
      recommendationType: determineRecommendationType(similarity, archive),
      suggestedJob,
      suggestedTasks,
      suggestedSubtasks,
      historicalPerformance,
      optimizations,
      riskAssessment,
      recommendations
    };
    
    suggestions.push(suggestion);
  }
  
  return suggestions;
}

function calculateSimilarity(orderItem: OrderItem, archive: JobArchive): number {
  let similarity = 0;
  
  // Part name similarity
  const partNameSimilarity = calculateStringSimilarity(
    orderItem.partName || orderItem.description,
    archive.jobSnapshot.item.partName
  );
  similarity += partNameSimilarity * 0.4;
  
  // Material similarity
  if (orderItem.material && archive.jobSnapshot.item.material) {
    const materialSimilarity = calculateStringSimilarity(
      orderItem.material,
      archive.jobSnapshot.item.material
    );
    similarity += materialSimilarity * 0.2;
  }
  
  // Quantity similarity (logarithmic scale)
  if (orderItem.quantity && archive.jobSnapshot.item.quantity) {
    const qtyRatio = Math.min(orderItem.quantity, archive.jobSnapshot.item.quantity) / 
                    Math.max(orderItem.quantity, archive.jobSnapshot.item.quantity);
    similarity += qtyRatio * 0.2;
  }
  
  // Process type similarity
  const orderProcesses = extractProcessTypes(orderItem);
  const archiveProcesses = extractProcessTypes(archive.jobSnapshot.item);
  const processOverlap = calculateArrayOverlap(orderProcesses, archiveProcesses);
  similarity += processOverlap * 0.2;
  
  return Math.min(100, similarity);
}

function createJobFromArchive(
  archive: JobArchive, 
  orderItem: OrderItem, 
  deliveryDate: string
): Job {
  const baseJob = archive.jobSnapshot;
  
  return {
    ...baseJob,
    id: '', // Will be set later
    item: {
      ...baseJob.item,
      partName: orderItem.partName || orderItem.description,
      quantity: orderItem.quantity || baseJob.item.quantity,
      material: orderItem.material || baseJob.item.material,
      specifications: orderItem.specifications || baseJob.item.specifications
    },
    deliveryDate,
    status: 'pending',
    createdAt: '', // Will be set later
    updatedAt: '', // Will be set later
    isArchived: false
  };
}

function createTasksFromArchive(archive: JobArchive, job: Job): JobTask[] {
  if (!archive.taskSnapshot) return [];
  
  return archive.taskSnapshot.map((archiveTask, index) => ({
    ...archiveTask,
    id: '', // Will be set later
    jobId: job.id,
    status: 'pending',
    actualStart: undefined,
    actualEnd: undefined,
    actualDurationHours: undefined,
    createdAt: '', // Will be set later
    updatedAt: '' // Will be set later
  }));
}

function createSubtasksFromArchive(archive: JobArchive, tasks: JobTask[]): JobSubtask[] {
  if (!archive.subtaskSnapshot) return [];
  
  return archive.subtaskSnapshot.map((archiveSubtask, index) => {
    const parentTask = tasks.find(t => 
      t.name === archiveSubtask.name || 
      t.operationIndex === archiveSubtask.operationIndex
    );
    
    return {
      ...archiveSubtask,
      id: '', // Will be set later
      taskId: parentTask?.id || tasks[0]?.id || '',
      jobId: tasks[0]?.jobId || '',
      status: 'pending',
      actualStart: undefined,
      actualEnd: undefined,
      createdAt: '', // Will be set later
      updatedAt: '' // Will be set later
    };
  });
}

function analyzeHistoricalPerformance(archive: JobArchive): HistoricalPerformance {
  const performanceData = archive.performanceData;
  
  return {
    averageCompletionTime: performanceData?.totalDuration || 8,
    averageQualityScore: performanceData?.qualityScore || 8,
    successRate: performanceData?.onTimeDelivery ? 100 : 80,
    onTimeDeliveryRate: performanceData?.onTimeDelivery ? 100 : 80,
    averageCost: 1000, // Placeholder
    efficiencyRating: performanceData?.efficiencyRating || 8,
    commonIssues: performanceData?.issuesEncountered?.map(i => i.description) || [],
    lessonsLearned: performanceData?.lessonsLearned || []
  };
}

async function generateOptimizations(
  archive: JobArchive, 
  orderItem: OrderItem
): Promise<JobOptimization[]> {
  const optimizations: JobOptimization[] = [];
  
  // Setup optimization based on historical data
  if (archive.completedForms?.setupSheets && archive.completedForms.setupSheets.length > 0) {
    optimizations.push({
      area: 'setup',
      optimization: 'Use proven setup parameters from similar successful job',
      expectedBenefit: '20-30% setup time reduction',
      implementationEffort: 'low',
      timeImpact: -0.5,
      qualityImpact: 0.3,
      costImpact: -50,
      basedOnArchives: 1
    });
  }
  
  // Process sequence optimization
  if (archive.performanceData?.efficiencyRating && archive.performanceData.efficiencyRating > 8) {
    optimizations.push({
      area: 'process_sequence',
      optimization: 'Apply optimized process sequence from high-performing job',
      expectedBenefit: 'Improved efficiency and quality',
      implementationEffort: 'medium',
      timeImpact: -1,
      qualityImpact: 0.5,
      costImpact: -100,
      basedOnArchives: 1
    });
  }
  
  return optimizations;
}

function assessJobCreationRisks(
  archive: JobArchive, 
  orderItem: OrderItem
): JobCreationRisk[] {
  const risks: JobCreationRisk[] = [];
  
  // Quality risk assessment
  if (archive.performanceData?.qualityScore && archive.performanceData.qualityScore < 8) {
    risks.push({
      riskType: 'quality',
      riskLevel: 'medium',
      description: 'Historical quality performance below AS9100D standard',
      likelihood: 60,
      impact: 'Potential quality issues and rework',
      mitigation: 'Implement additional quality checks and inspections',
      historicalEvidence: `Previous job scored ${archive.performanceData.qualityScore}/10`
    });
  }
  
  // Schedule risk assessment
  if (archive.performanceData?.onTimeDelivery === false) {
    risks.push({
      riskType: 'schedule',
      riskLevel: 'medium',
      description: 'Historical on-time delivery challenges',
      likelihood: 50,
      impact: 'Potential delivery delays',
      mitigation: 'Add buffer time to schedule and monitor progress closely',
      historicalEvidence: 'Similar job had delivery delays'
    });
  }
  
  return risks;
}

function generateRecommendations(
  archive: JobArchive,
  optimizations: JobOptimization[],
  risks: JobCreationRisk[]
): string[] {
  const recommendations: string[] = [];
  
  // Add optimization recommendations
  optimizations.forEach(opt => {
    if (opt.expectedBenefit) {
      recommendations.push(`Apply ${opt.area} optimization: ${opt.expectedBenefit}`);
    }
  });
  
  // Add risk mitigation recommendations
  risks.forEach(risk => {
    if (risk.riskLevel === 'high' || risk.riskLevel === 'critical') {
      recommendations.push(`Mitigate ${risk.riskType} risk: ${risk.mitigation}`);
    }
  });
  
  // Add general recommendations
  if (archive.performanceData?.qualityScore && archive.performanceData.qualityScore > 9) {
    recommendations.push('High-quality historical performance - use proven methods');
  }
  
  return recommendations.slice(0, 5); // Top 5 recommendations
}

function calculateConfidence(archive: JobArchive, similarity: number): number {
  let confidence = similarity * 0.6; // Base confidence from similarity
  
  // Boost confidence for successful archives
  if (archive.performanceData?.qualityScore && archive.performanceData.qualityScore >= 8) {
    confidence += 20;
  }
  
  // Boost for on-time delivery
  if (archive.performanceData?.onTimeDelivery) {
    confidence += 10;
  }
  
  // Boost for recent archives (recency matters)
  const archiveAge = Date.now() - new Date(archive.archiveDate).getTime();
  const daysSinceArchive = archiveAge / (1000 * 60 * 60 * 24);
  if (daysSinceArchive < 180) { // Less than 6 months
    confidence += 10;
  }
  
  return Math.min(95, confidence);
}

function determineRecommendationType(
  similarity: number, 
  archive: JobArchive
): 'exact_match' | 'similar_part' | 'similar_process' | 'hybrid' {
  if (similarity > 90) return 'exact_match';
  if (similarity > 70) return 'similar_part';
  if (similarity > 50) return 'similar_process';
  return 'hybrid';
}

// === Utility Functions ===

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 100;
  
  const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return ((longer.length - distance) / longer.length) * 100;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

function calculateArrayOverlap(arr1: string[], arr2: string[]): number {
  if (arr1.length === 0 && arr2.length === 0) return 100;
  if (arr1.length === 0 || arr2.length === 0) return 0;
  
  const intersection = arr1.filter(item => arr2.includes(item));
  const union = [...new Set([...arr1, ...arr2])];
  
  return (intersection.length / union.length) * 100;
}

function extractKeywords(text: string): string[] {
  return text.toLowerCase()
    .split(/[\s\-_.,;:!?()[\]{}]+/)
    .filter(word => word.length > 2)
    .slice(0, 5);
}

function extractProcessTypes(item: any): string[] {
  const processes: string[] = [];
  
  if (item.processes) {
    processes.push(...item.processes);
  }
  
  if (item.manufacturingProcesses) {
    processes.push(...item.manufacturingProcesses);
  }
  
  // Extract from description or part name
  const text = (item.partName || item.description || '').toLowerCase();
  if (text.includes('mill')) processes.push('milling');
  if (text.includes('turn')) processes.push('turning');
  if (text.includes('drill')) processes.push('drilling');
  if (text.includes('grind')) processes.push('grinding');
  
  return [...new Set(processes)];
}

// === Optimization Application Functions ===

function applySchedulingOptimizations(tasks: JobTask[], optimization: JobOptimization): JobTask[] {
  return tasks.map(task => ({
    ...task,
    estimatedDurationHours: (task.estimatedDurationHours || 2) + optimization.timeImpact
  }));
}

function applyProcessSequenceOptimizations(tasks: JobTask[], optimization: JobOptimization): JobTask[] {
  // Reorder tasks based on optimization
  return tasks.sort((a, b) => (a.operationIndex || 0) - (b.operationIndex || 0));
}

async function applySetupOptimizations(tasks: JobTask[], optimization: JobOptimization): Promise<JobTask[]> {
  return tasks.map(task => ({
    ...task,
    setupTimeMinutes: Math.max(15, (task.setupTimeMinutes || 30) + optimization.timeImpact * 60)
  }));
}

// Additional helper functions for process inheritance
function extractInheritedProcesses(archive: JobArchive, targetSpecs: any): InheritedProcess[] {
  if (!archive.taskSnapshot) return [];
  
  return archive.taskSnapshot
    .filter(task => task.category === 'manufacturing_process')
    .map(task => ({
      originalTaskId: task.id,
      processType: task.manufacturingProcessType || 'unknown',
      processParameters: {
        setupTime: task.setupTimeMinutes,
        cycleTime: task.cycleTimeMinutes,
        machineType: task.machineType,
        tooling: task.requiredCapabilities
      },
      historicalSuccess: task.status === 'completed',
      qualityOutcome: archive.performanceData?.qualityScore || 8,
      timeEfficiency: archive.performanceData?.efficiencyRating || 8,
      adaptationRequired: targetSpecs.material !== archive.jobSnapshot.item.material,
      adaptationNotes: targetSpecs.material !== archive.jobSnapshot.item.material 
        ? [`Material change from ${archive.jobSnapshot.item.material} to ${targetSpecs.material}`]
        : []
    }));
}

async function generateProcessOptimizations(archive: JobArchive, targetSpecs: any): Promise<ProcessOptimization[]> {
  return [
    {
      processStep: 'Setup preparation',
      originalApproach: 'Manual setup verification',
      optimizedApproach: 'Use proven setup parameters and automated verification',
      expectedImprovement: '25% faster setup time',
      basedOnSuccessfulJobs: 1
    }
  ];
}

async function generateQualityImprovements(archive: JobArchive, targetSpecs: any): Promise<QualityImprovement[]> {
  const improvements: QualityImprovement[] = [];
  
  if (archive.performanceData?.qualityScore && archive.performanceData.qualityScore > 8.5) {
    improvements.push({
      qualityAspect: 'Dimensional accuracy',
      currentApproach: 'Standard inspection',
      improvedApproach: 'Use proven inspection sequence from high-quality job',
      expectedQualityGain: 0.5,
      implementationComplexity: 'simple'
    });
  }
  
  return improvements;
}

async function generateSetupOptimizations(archive: JobArchive, targetSpecs: any): Promise<SetupOptimization[]> {
  const optimizations: SetupOptimization[] = [];
  
  if (archive.completedForms?.setupSheets && archive.completedForms.setupSheets.length > 0) {
    optimizations.push({
      setupAspect: 'Tool preparation',
      optimizedApproach: 'Pre-stage tools using proven setup sheet parameters',
      timeReduction: 15,
      qualityBenefit: 'Reduced setup errors and improved first-piece accuracy',
      toolingRequirements: ['Standard tooling per setup sheet']
    });
  }
  
  return optimizations;
} 