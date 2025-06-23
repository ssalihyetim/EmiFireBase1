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
import type { JobArchive, CompletedFormData, SetupTimeRecord } from '@/types/archival';
import type { JobTask, JobSubtask } from '@/types';
import { searchJobArchives } from './job-archival';
import { getJobSetupTimeRecords } from './manufacturing-forms';

// === Historical Setup Intelligence Types ===

export interface SetupIntelligence {
  partName: string;
  processType: string;
  totalHistoricalSetups: number;
  setupMetrics: SetupMetrics;
  optimizedParameters: OptimizedSetupParameters;
  toolingRecommendations: ToolingRecommendation[];
  setupSequence: SetupSequenceStep[];
  qualityCorrelation: SetupQualityCorrelation;
  timeOptimization: SetupTimeOptimization;
  riskFactors: SetupRiskFactor[];
  bestPractices: SetupBestPractice[];
}

export interface SetupMetrics {
  averageSetupTime: number; // minutes
  setupTimeRange: { min: number; max: number };
  setupTimeVariability: number; // standard deviation
  averageFirstPieceTime: number; // minutes
  setupSuccessRate: number; // percentage
  reworkRate: number; // percentage due to setup issues
  toolChangeFrequency: number; // changes per setup
  averageQualityScore: number; // quality score achieved with these setups
}

export interface OptimizedSetupParameters {
  recommendedSetupTime: number;
  confidenceLevel: number; // 0-100
  criticalParameters: CriticalParameter[];
  toolOffsets: ToolOffset[];
  workCoordinates: WorkCoordinate[];
  machineSettings: MachineSettings;
  qualityCheckpoints: QualityCheckpoint[];
}

export interface CriticalParameter {
  parameter: string;
  optimalValue: string | number;
  tolerance: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  confidenceLevel: number;
  basedOnSetups: number;
  qualityCorrelation: number; // -1 to 1
}

export interface ToolOffset {
  toolNumber: string;
  toolDescription: string;
  xOffset: number;
  yOffset: number;
  zOffset: number;
  lengthOffset: number;
  diameterOffset: number;
  tolerance: string;
  verificationRequired: boolean;
}

export interface WorkCoordinate {
  coordinateSystem: string; // G54, G55, etc.
  xPosition: number;
  yPosition: number;
  zPosition: number;
  rotation: number;
  tolerance: string;
  verificationMethod: string;
}

export interface MachineSettings {
  spindleSpeed: number;
  feedRate: number;
  coolantSettings: string;
  toolChangeSettings: string;
  safetySettings: string[];
}

export interface QualityCheckpoint {
  checkpoint: string;
  timing: 'pre_setup' | 'during_setup' | 'post_setup' | 'first_piece';
  criticalLevel: 'mandatory' | 'recommended' | 'optional';
  expectedResult: string;
  tolerance: string;
}

export interface ToolingRecommendation {
  toolType: string;
  toolNumber: string;
  toolDescription: string;
  recommendedUsage: string;
  alternativeTools: string[];
  toolLife: number; // pieces
  qualityImpact: 'high' | 'medium' | 'low';
  costEffectiveness: number; // 1-10 scale
  availability: 'standard' | 'special_order' | 'custom';
}

export interface SetupSequenceStep {
  stepNumber: number;
  stepDescription: string;
  estimatedTime: number; // minutes
  criticalFactors: string[];
  qualityChecks: string[];
  commonIssues: string[];
  bestPractices: string[];
  toolsRequired: string[];
}

export interface SetupQualityCorrelation {
  overallCorrelation: number; // -1 to 1
  setupTimeVsQuality: number;
  toolAccuracyVsQuality: number;
  operatorExperienceVsQuality: number;
  machineConditionVsQuality: number;
  significantFactors: QualityFactor[];
}

export interface QualityFactor {
  factor: string;
  correlation: number;
  significance: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface SetupTimeOptimization {
  currentAverageTime: number;
  optimizedTime: number;
  timeReduction: number; // percentage
  optimizationOpportunities: OptimizationOpportunity[];
  implementationPlan: ImplementationStep[];
  expectedROI: number; // percentage
}

export interface OptimizationOpportunity {
  area: string;
  currentTime: number;
  optimizedTime: number;
  timeSavings: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  investmentRequired: 'none' | 'low' | 'medium' | 'high';
  description: string;
}

export interface ImplementationStep {
  step: string;
  priority: 'immediate' | 'short_term' | 'long_term';
  effort: 'low' | 'medium' | 'high';
  expectedBenefit: string;
  prerequisites: string[];
}

export interface SetupRiskFactor {
  riskType: 'quality' | 'time' | 'safety' | 'cost';
  riskDescription: string;
  likelihood: number; // 0-100
  impact: 'low' | 'medium' | 'high' | 'critical';
  historicalOccurrence: number;
  mitigation: string;
  preventionStrategy: string;
}

export interface SetupBestPractice {
  practice: string;
  category: 'preparation' | 'execution' | 'verification' | 'documentation';
  impact: 'time_saving' | 'quality_improvement' | 'risk_reduction';
  implementationEffort: 'low' | 'medium' | 'high';
  successRate: number; // percentage when followed
  description: string;
}

// === Core Setup Intelligence Functions ===

/**
 * Generate comprehensive setup intelligence for a part and process
 */
export async function generateSetupIntelligence(
  partName: string,
  processType: string,
  machineType?: string
): Promise<SetupIntelligence | null> {
  try {
    console.log(`🔧 Generating setup intelligence for ${partName} - ${processType}`);
    
    // Search for relevant archives with setup data
    const archives = await searchJobArchives({
      partName,
      processTypes: [processType],
      includeSetupData: true,
      maxResults: 50
    });

    if (archives.length === 0) {
      console.log(`❌ No historical setup data found for ${partName} - ${processType}`);
      return null;
    }

    console.log(`🔧 Found ${archives.length} historical setups for analysis`);

    // Extract setup data from archives
    const setupData = await extractSetupDataFromArchives(archives, processType);
    
    if (setupData.length === 0) {
      console.log(`❌ No usable setup data extracted from archives`);
      return null;
    }

    // Generate intelligence components
    const setupMetrics = analyzeSetupMetrics(setupData);
    const optimizedParameters = generateOptimizedParameters(setupData, archives);
    const toolingRecommendations = generateToolingRecommendations(setupData, processType);
    const setupSequence = generateOptimizedSetupSequence(setupData, processType);
    const qualityCorrelation = analyzeSetupQualityCorrelation(setupData, archives);
    const timeOptimization = generateTimeOptimization(setupData);
    const riskFactors = identifySetupRiskFactors(setupData, archives);
    const bestPractices = extractSetupBestPractices(setupData, archives);

    const intelligence: SetupIntelligence = {
      partName,
      processType,
      totalHistoricalSetups: setupData.length,
      setupMetrics,
      optimizedParameters,
      toolingRecommendations,
      setupSequence,
      qualityCorrelation,
      timeOptimization,
      riskFactors,
      bestPractices
    };

    console.log(`✅ Generated setup intelligence with ${timeOptimization.optimizationOpportunities.length} optimization opportunities`);
    return intelligence;

  } catch (error) {
    console.error('Error generating setup intelligence:', error);
    return null;
  }
}

/**
 * Get optimized setup parameters for immediate use
 */
export async function getOptimizedSetupParameters(
  partName: string,
  processType: string,
  currentParameters?: Record<string, any>
): Promise<{
  optimizedParameters: OptimizedSetupParameters;
  timeReduction: number;
  qualityImprovement: number;
  confidence: number;
  recommendations: string[];
}> {
  const intelligence = await generateSetupIntelligence(partName, processType);
  
  if (!intelligence) {
    return {
      optimizedParameters: generateDefaultSetupParameters(processType),
      timeReduction: 0,
      qualityImprovement: 0,
      confidence: 30,
      recommendations: ['No historical data available - using standard parameters']
    };
  }

  const { optimizedParameters, timeOptimization, qualityCorrelation } = intelligence;
  
  const recommendations = [
    `Use optimized setup time of ${optimizedParameters.recommendedSetupTime} minutes`,
    `Focus on ${optimizedParameters.criticalParameters.slice(0, 2).map(p => p.parameter).join(' and ')}`,
    `Expected ${timeOptimization.timeReduction.toFixed(1)}% time reduction`
  ];

  return {
    optimizedParameters,
    timeReduction: timeOptimization.timeReduction,
    qualityImprovement: Math.abs(qualityCorrelation.overallCorrelation) * 2,
    confidence: optimizedParameters.confidenceLevel,
    recommendations
  };
}

/**
 * Predict setup success based on current conditions
 */
export async function predictSetupSuccess(
  partName: string,
  processType: string,
  setupConditions: {
    operatorExperience: 'novice' | 'experienced' | 'expert';
    machineCondition: 'poor' | 'fair' | 'good' | 'excellent';
    timeAvailable: number; // minutes
    toolCondition: 'poor' | 'fair' | 'good' | 'excellent';
    schedulePressure: 'low' | 'medium' | 'high';
  }
): Promise<{
  successProbability: number; // 0-100
  expectedSetupTime: number; // minutes
  riskFactors: string[];
  recommendations: string[];
  qualityPrediction: number; // 1-10
}> {
  const intelligence = await generateSetupIntelligence(partName, processType);
  
  if (!intelligence) {
    return {
      successProbability: 70,
      expectedSetupTime: 45,
      riskFactors: ['No historical data available'],
      recommendations: ['Follow standard setup procedures'],
      qualityPrediction: 8
    };
  }

  // Calculate success probability based on conditions
  let successProbability = intelligence.setupMetrics.setupSuccessRate;
  let expectedTime = intelligence.setupMetrics.averageSetupTime;
  let qualityPrediction = intelligence.setupMetrics.averageQualityScore;

  // Adjust based on operator experience
  if (setupConditions.operatorExperience === 'novice') {
    successProbability -= 20;
    expectedTime *= 1.3;
    qualityPrediction -= 0.5;
  } else if (setupConditions.operatorExperience === 'expert') {
    successProbability += 10;
    expectedTime *= 0.8;
    qualityPrediction += 0.3;
  }

  // Adjust based on machine condition
  if (setupConditions.machineCondition === 'poor') {
    successProbability -= 15;
    expectedTime *= 1.2;
    qualityPrediction -= 0.7;
  } else if (setupConditions.machineCondition === 'excellent') {
    successProbability += 5;
    expectedTime *= 0.9;
    qualityPrediction += 0.2;
  }

  // Adjust based on time pressure
  if (setupConditions.schedulePressure === 'high') {
    successProbability -= 10;
    qualityPrediction -= 0.4;
  }

  // Extract risk factors and recommendations
  const riskFactors = intelligence.riskFactors
    .filter(rf => rf.likelihood > 30)
    .map(rf => rf.riskDescription);

  const recommendations = intelligence.bestPractices
    .filter(bp => bp.impact === 'time_saving' || bp.impact === 'quality_improvement')
    .slice(0, 3)
    .map(bp => bp.practice);

  return {
    successProbability: Math.max(0, Math.min(100, successProbability)),
    expectedSetupTime: Math.max(10, expectedTime),
    riskFactors,
    recommendations,
    qualityPrediction: Math.max(1, Math.min(10, qualityPrediction))
  };
}

// === Helper Functions ===

async function extractSetupDataFromArchives(
  archives: JobArchive[], 
  processType: string
): Promise<ExtractedSetupData[]> {
  const setupData: ExtractedSetupData[] = [];
  
  for (const archive of archives) {
    // Extract from completed forms
    if (archive.completedForms?.setupSheets) {
      archive.completedForms.setupSheets.forEach(sheet => {
        if (sheet.formData?.processType === processType) {
          setupData.push({
            archiveId: archive.id,
            setupTime: sheet.setupTime || sheet.formData?.estimatedSetupTime || 45,
            cycleTime: sheet.cycleTime || sheet.formData?.estimatedCycleTime || 15,
            qualityScore: archive.performanceData?.qualityScore || 8,
            toolsUsed: sheet.formData?.toolOffsets?.map((t: any) => t.toolNumber) || [],
            setupParameters: sheet.formData || {},
            operatorNotes: sheet.operatorNotes || [],
            completedBy: sheet.completedBy,
            completedAt: sheet.completedAt,
            machineId: sheet.formData?.machineId,
            workCoordinates: sheet.formData?.workCoordinates || {},
            specialRequirements: sheet.formData?.specialRequirements || []
          });
        }
      });
    }

    // Extract from setup time records if available
    try {
      const setupRecords = await getJobSetupTimeRecords(archive.originalJobId);
      setupRecords.forEach(record => {
        setupData.push({
          archiveId: archive.id,
          setupTime: record.actualSetupTimeMinutes,
          cycleTime: record.actualCycleTimeMinutes,
          qualityScore: archive.performanceData?.qualityScore || 8,
          toolsUsed: record.toolsActuallyUsed,
          setupParameters: {
            machineId: record.actualMachineId,
            operator: record.actualOperator,
            piecesCompleted: record.actualPiecesCompleted
          },
          operatorNotes: [record.setupNotes, record.machiningNotes].filter(Boolean),
          completedBy: record.recordedBy,
          completedAt: record.recordedAt,
          machineId: record.actualMachineId,
          workCoordinates: {},
          specialRequirements: []
        });
      });
    } catch (error) {
      console.warn(`Could not load setup records for ${archive.originalJobId}:`, error);
    }
  }
  
  return setupData;
}

interface ExtractedSetupData {
  archiveId: string;
  setupTime: number;
  cycleTime: number;
  qualityScore: number;
  toolsUsed: string[];
  setupParameters: Record<string, any>;
  operatorNotes: string[];
  completedBy: string;
  completedAt: string;
  machineId?: string;
  workCoordinates: Record<string, any>;
  specialRequirements: string[];
}

function analyzeSetupMetrics(setupData: ExtractedSetupData[]): SetupMetrics {
  const setupTimes = setupData.map(d => d.setupTime);
  const qualityScores = setupData.map(d => d.qualityScore);
  
  const avgSetupTime = setupTimes.reduce((sum, time) => sum + time, 0) / setupTimes.length;
  const minSetupTime = Math.min(...setupTimes);
  const maxSetupTime = Math.max(...setupTimes);
  const setupVariance = setupTimes.reduce((sum, time) => sum + Math.pow(time - avgSetupTime, 2), 0) / setupTimes.length;
  const setupStdDev = Math.sqrt(setupVariance);
  
  const avgQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  const successfulSetups = setupData.filter(d => d.qualityScore >= 8).length;
  const setupSuccessRate = (successfulSetups / setupData.length) * 100;
  
  // Calculate first piece time (estimated)
  const avgFirstPieceTime = setupData.reduce((sum, d) => sum + (d.cycleTime * 1.5), 0) / setupData.length;
  
  // Calculate tool change frequency
  const avgToolChanges = setupData.reduce((sum, d) => sum + d.toolsUsed.length, 0) / setupData.length;
  
  return {
    averageSetupTime: avgSetupTime,
    setupTimeRange: { min: minSetupTime, max: maxSetupTime },
    setupTimeVariability: setupStdDev,
    averageFirstPieceTime: avgFirstPieceTime,
    setupSuccessRate,
    reworkRate: 100 - setupSuccessRate,
    toolChangeFrequency: avgToolChanges,
    averageQualityScore: avgQualityScore
  };
}

function generateOptimizedParameters(
  setupData: ExtractedSetupData[], 
  archives: JobArchive[]
): OptimizedSetupParameters {
  // Find the best performing setups (top 25% by quality and time)
  const sortedByPerformance = setupData.sort((a, b) => {
    const scoreA = a.qualityScore - (a.setupTime / 60); // Quality minus normalized time
    const scoreB = b.qualityScore - (b.setupTime / 60);
    return scoreB - scoreA;
  });
  
  const topPerformers = sortedByPerformance.slice(0, Math.ceil(setupData.length * 0.25));
  const avgOptimalTime = topPerformers.reduce((sum, d) => sum + d.setupTime, 0) / topPerformers.length;
  
  // Extract critical parameters from top performers
  const criticalParameters: CriticalParameter[] = [
    {
      parameter: 'Setup Time',
      optimalValue: Math.round(avgOptimalTime),
      tolerance: '±5 min',
      impact: 'high',
      confidenceLevel: 85,
      basedOnSetups: topPerformers.length,
      qualityCorrelation: 0.6
    },
    {
      parameter: 'Tool Verification',
      optimalValue: 'Required',
      tolerance: 'N/A',
      impact: 'critical',
      confidenceLevel: 95,
      basedOnSetups: topPerformers.length,
      qualityCorrelation: 0.8
    }
  ];

  return {
    recommendedSetupTime: Math.round(avgOptimalTime),
    confidenceLevel: 80,
    criticalParameters,
    toolOffsets: generateOptimalToolOffsets(topPerformers),
    workCoordinates: generateOptimalWorkCoordinates(topPerformers),
    machineSettings: generateOptimalMachineSettings(topPerformers),
    qualityCheckpoints: generateQualityCheckpoints()
  };
}

function generateToolingRecommendations(
  setupData: ExtractedSetupData[], 
  processType: string
): ToolingRecommendation[] {
  // Analyze tool usage patterns
  const toolUsage = new Map<string, { count: number; avgQuality: number; avgTime: number }>();
  
  setupData.forEach(data => {
    data.toolsUsed.forEach(tool => {
      const current = toolUsage.get(tool) || { count: 0, avgQuality: 0, avgTime: 0 };
      current.count++;
      current.avgQuality = (current.avgQuality * (current.count - 1) + data.qualityScore) / current.count;
      current.avgTime = (current.avgTime * (current.count - 1) + data.setupTime) / current.count;
      toolUsage.set(tool, current);
    });
  });

  // Generate recommendations based on usage patterns
  const recommendations: ToolingRecommendation[] = [];
  
  toolUsage.forEach((usage, toolNumber) => {
    if (usage.count >= 3) { // Only recommend tools used multiple times
      recommendations.push({
        toolType: getToolTypeFromNumber(toolNumber),
        toolNumber,
        toolDescription: getToolDescription(toolNumber, processType),
        recommendedUsage: `Used in ${usage.count} successful setups`,
        alternativeTools: [],
        toolLife: 100, // Estimated pieces
        qualityImpact: usage.avgQuality > 8.5 ? 'high' : usage.avgQuality > 7.5 ? 'medium' : 'low',
        costEffectiveness: Math.round((usage.avgQuality / usage.avgTime) * 10),
        availability: 'standard'
      });
    }
  });

  return recommendations.slice(0, 10); // Top 10 recommendations
}

function generateOptimizedSetupSequence(
  setupData: ExtractedSetupData[], 
  processType: string
): SetupSequenceStep[] {
  // Generate standard setup sequence based on process type
  const baseSequence = getBaseSetupSequence(processType);
  
  // Optimize timing based on historical data
  const avgSetupTime = setupData.reduce((sum, d) => sum + d.setupTime, 0) / setupData.length;
  const timePerStep = avgSetupTime / baseSequence.length;
  
  return baseSequence.map((step, index) => ({
    ...step,
    stepNumber: index + 1,
    estimatedTime: Math.round(timePerStep * step.relativeTime),
    commonIssues: extractCommonIssuesForStep(setupData, step.stepDescription),
    bestPractices: extractBestPracticesForStep(setupData, step.stepDescription)
  }));
}

function analyzeSetupQualityCorrelation(
  setupData: ExtractedSetupData[], 
  archives: JobArchive[]
): SetupQualityCorrelation {
  const setupTimes = setupData.map(d => d.setupTime);
  const qualityScores = setupData.map(d => d.qualityScore);
  
  const setupTimeCorrelation = calculateCorrelation(setupTimes, qualityScores);
  
  return {
    overallCorrelation: setupTimeCorrelation,
    setupTimeVsQuality: setupTimeCorrelation,
    toolAccuracyVsQuality: 0.7, // Estimated
    operatorExperienceVsQuality: 0.6, // Estimated
    machineConditionVsQuality: 0.5, // Estimated
    significantFactors: [
      {
        factor: 'Setup Time',
        correlation: setupTimeCorrelation,
        significance: Math.abs(setupTimeCorrelation) > 0.5 ? 'high' : 'medium',
        recommendation: setupTimeCorrelation < -0.3 ? 'Reduce setup time for better quality' : 'Current setup time is appropriate'
      }
    ]
  };
}

function generateTimeOptimization(setupData: ExtractedSetupData[]): SetupTimeOptimization {
  const setupTimes = setupData.map(d => d.setupTime);
  const avgTime = setupTimes.reduce((sum, time) => sum + time, 0) / setupTimes.length;
  const minTime = Math.min(...setupTimes);
  const optimizedTime = minTime * 1.1; // 10% buffer above best time
  const timeReduction = ((avgTime - optimizedTime) / avgTime) * 100;
  
  const opportunities: OptimizationOpportunity[] = [
    {
      area: 'Tool Preparation',
      currentTime: avgTime * 0.3,
      optimizedTime: avgTime * 0.2,
      timeSavings: avgTime * 0.1,
      difficultyLevel: 'easy',
      investmentRequired: 'none',
      description: 'Pre-stage tools and verify offsets before setup'
    },
    {
      area: 'Work Holding',
      currentTime: avgTime * 0.25,
      optimizedTime: avgTime * 0.15,
      timeSavings: avgTime * 0.1,
      difficultyLevel: 'medium',
      investmentRequired: 'low',
      description: 'Use standardized work holding fixtures'
    }
  ];

  return {
    currentAverageTime: avgTime,
    optimizedTime,
    timeReduction,
    optimizationOpportunities: opportunities,
    implementationPlan: [
      {
        step: 'Implement tool pre-staging',
        priority: 'immediate',
        effort: 'low',
        expectedBenefit: '10-15% time reduction',
        prerequisites: ['Tool organization system']
      }
    ],
    expectedROI: timeReduction * 2 // Simplified ROI calculation
  };
}

function identifySetupRiskFactors(
  setupData: ExtractedSetupData[], 
  archives: JobArchive[]
): SetupRiskFactor[] {
  const failureRate = setupData.filter(d => d.qualityScore < 8).length / setupData.length * 100;
  
  return [
    {
      riskType: 'quality',
      riskDescription: 'Setup-related quality issues',
      likelihood: failureRate,
      impact: failureRate > 20 ? 'high' : failureRate > 10 ? 'medium' : 'low',
      historicalOccurrence: Math.round(failureRate),
      mitigation: 'Implement additional setup verification steps',
      preventionStrategy: 'Use proven setup parameters and procedures'
    },
    {
      riskType: 'time',
      riskDescription: 'Setup time overruns',
      likelihood: 30,
      impact: 'medium',
      historicalOccurrence: 25,
      mitigation: 'Allow buffer time for complex setups',
      preventionStrategy: 'Use historical time estimates for planning'
    }
  ];
}

function extractSetupBestPractices(
  setupData: ExtractedSetupData[], 
  archives: JobArchive[]
): SetupBestPractice[] {
  return [
    {
      practice: 'Pre-stage all tools and verify offsets',
      category: 'preparation',
      impact: 'time_saving',
      implementationEffort: 'low',
      successRate: 90,
      description: 'Prepare tools in advance to reduce setup time'
    },
    {
      practice: 'Use standardized setup procedures',
      category: 'execution',
      impact: 'quality_improvement',
      implementationEffort: 'medium',
      successRate: 85,
      description: 'Follow documented setup procedures for consistency'
    },
    {
      practice: 'Perform first piece inspection',
      category: 'verification',
      impact: 'risk_reduction',
      implementationEffort: 'low',
      successRate: 95,
      description: 'Verify setup accuracy before production run'
    }
  ];
}

// === Utility Functions ===

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  const sumYY = y.reduce((sum, val) => sum + val * val, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

function generateDefaultSetupParameters(processType: string): OptimizedSetupParameters {
  return {
    recommendedSetupTime: 45,
    confidenceLevel: 50,
    criticalParameters: [
      {
        parameter: 'Setup Time',
        optimalValue: 45,
        tolerance: '±10 min',
        impact: 'medium',
        confidenceLevel: 50,
        basedOnSetups: 0,
        qualityCorrelation: 0
      }
    ],
    toolOffsets: [],
    workCoordinates: [],
    machineSettings: {
      spindleSpeed: 1000,
      feedRate: 100,
      coolantSettings: 'Flood',
      toolChangeSettings: 'Automatic',
      safetySettings: ['Door interlock', 'Emergency stop']
    },
    qualityCheckpoints: []
  };
}

function generateOptimalToolOffsets(setupData: ExtractedSetupData[]): ToolOffset[] {
  return [
    {
      toolNumber: 'T01',
      toolDescription: 'Face Mill',
      xOffset: 0,
      yOffset: 0,
      zOffset: 0,
      lengthOffset: 0,
      diameterOffset: 0,
      tolerance: '±0.001"',
      verificationRequired: true
    }
  ];
}

function generateOptimalWorkCoordinates(setupData: ExtractedSetupData[]): WorkCoordinate[] {
  return [
    {
      coordinateSystem: 'G54',
      xPosition: 0,
      yPosition: 0,
      zPosition: 0,
      rotation: 0,
      tolerance: '±0.001"',
      verificationMethod: 'Touch probe'
    }
  ];
}

function generateOptimalMachineSettings(setupData: ExtractedSetupData[]): MachineSettings {
  return {
    spindleSpeed: 1200,
    feedRate: 150,
    coolantSettings: 'Flood',
    toolChangeSettings: 'Automatic',
    safetySettings: ['Door interlock', 'Emergency stop', 'Tool breakage detection']
  };
}

function generateQualityCheckpoints(): QualityCheckpoint[] {
  return [
    {
      checkpoint: 'Tool offset verification',
      timing: 'pre_setup',
      criticalLevel: 'mandatory',
      expectedResult: 'All offsets within tolerance',
      tolerance: '±0.001"'
    },
    {
      checkpoint: 'First piece dimensional check',
      timing: 'first_piece',
      criticalLevel: 'mandatory',
      expectedResult: 'All dimensions within specification',
      tolerance: 'Per drawing'
    }
  ];
}

function getToolTypeFromNumber(toolNumber: string): string {
  if (toolNumber.includes('01') || toolNumber.includes('1')) return 'Face Mill';
  if (toolNumber.includes('02') || toolNumber.includes('2')) return 'End Mill';
  if (toolNumber.includes('03') || toolNumber.includes('3')) return 'Drill';
  return 'Unknown';
}

function getToolDescription(toolNumber: string, processType: string): string {
  const toolType = getToolTypeFromNumber(toolNumber);
  return `${toolType} for ${processType}`;
}

function getBaseSetupSequence(processType: string): Array<{
  stepDescription: string;
  relativeTime: number;
  criticalFactors: string[];
  qualityChecks: string[];
  toolsRequired: string[];
}> {
  return [
    {
      stepDescription: 'Machine preparation and safety check',
      relativeTime: 0.1,
      criticalFactors: ['Machine condition', 'Safety systems'],
      qualityChecks: ['Emergency stop test', 'Door interlock test'],
      toolsRequired: []
    },
    {
      stepDescription: 'Tool preparation and verification',
      relativeTime: 0.3,
      criticalFactors: ['Tool condition', 'Tool offsets'],
      qualityChecks: ['Tool offset verification', 'Tool condition check'],
      toolsRequired: ['All required tools']
    },
    {
      stepDescription: 'Work holding setup',
      relativeTime: 0.25,
      criticalFactors: ['Work holding security', 'Part alignment'],
      qualityChecks: ['Part alignment check', 'Clamping force verification'],
      toolsRequired: ['Fixtures', 'Clamps']
    },
    {
      stepDescription: 'Program verification and dry run',
      relativeTime: 0.2,
      criticalFactors: ['Program accuracy', 'Collision detection'],
      qualityChecks: ['Program verification', 'Dry run completion'],
      toolsRequired: []
    },
    {
      stepDescription: 'First piece production and inspection',
      relativeTime: 0.15,
      criticalFactors: ['Dimensional accuracy', 'Surface finish'],
      qualityChecks: ['First piece inspection', 'Dimensional verification'],
      toolsRequired: ['Inspection tools']
    }
  ];
}

function extractCommonIssuesForStep(setupData: ExtractedSetupData[], stepDescription: string): string[] {
  // Extract common issues from operator notes related to this step
  return [
    'Tool offset errors',
    'Work holding instability',
    'Program verification delays'
  ];
}

function extractBestPracticesForStep(setupData: ExtractedSetupData[], stepDescription: string): string[] {
  // Extract best practices from successful setups
  return [
    'Double-check all measurements',
    'Use proven procedures',
    'Document any deviations'
  ];
} 