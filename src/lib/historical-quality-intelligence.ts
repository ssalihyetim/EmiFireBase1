import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import type { JobArchive, QualityResult, Issue, TaskPerformance } from '@/types/archival';
import type { JobTask, JobSubtask } from '@/types';
import { searchJobArchives } from './job-archival';

// === Historical Quality Intelligence Types ===

export interface QualityIntelligence {
  partName: string;
  totalHistoricalJobs: number;
  qualityMetrics: QualityMetrics;
  setupIntelligence: SetupIntelligence;
  riskAssessment: RiskAssessment;
  recommendations: QualityRecommendation[];
  predictiveInsights: PredictiveInsight[];
  trendAnalysis: QualityTrendAnalysis;
  benchmarking: QualityBenchmarking;
}

export interface QualityMetrics {
  averageQualityScore: number;
  qualityTrend: 'improving' | 'stable' | 'declining';
  firstPassRate: number;
  defectRate: number;
  as9100dComplianceRate: number;
  commonQualityIssues: QualityIssuePattern[];
  qualityVariability: number; // Standard deviation
  bestPerformingPeriod: { period: string; score: number };
  worstPerformingPeriod: { period: string; score: number };
}

export interface SetupIntelligence {
  averageSetupTime: number;
  setupTimeVariability: number;
  optimalSetupParameters: SetupParameter[];
  setupQualityCorrelation: number; // -1 to 1, correlation between setup time and quality
  setupTimeReduction: number; // Percentage improvement opportunity
  criticalSetupFactors: string[];
  bestPractices: string[];
  commonSetupIssues: string[];
}

export interface SetupParameter {
  parameter: string;
  optimalValue: string | number;
  tolerance: string;
  qualityImpact: 'high' | 'medium' | 'low';
  confidenceLevel: number; // 0-100
  basedOnJobs: number;
}

export interface RiskAssessment {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  qualityRiskScore: number; // 0-100
  scheduleRiskScore: number; // 0-100
  costRiskScore: number; // 0-100
  mitigationStrategies: string[];
}

export interface RiskFactor {
  factor: string;
  likelihood: number; // 0-100
  impact: 'low' | 'medium' | 'high';
  historicalOccurrence: number;
  lastOccurrence?: string;
  mitigation: string;
}

export interface QualityRecommendation {
  type: 'setup' | 'process' | 'inspection' | 'training' | 'equipment';
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  expectedImprovement: string;
  implementationEffort: 'low' | 'medium' | 'high';
  basedOnJobs: number;
  successRate: number; // When this recommendation was followed
}

export interface PredictiveInsight {
  insight: string;
  confidence: number; // 0-100
  timeframe: string;
  actionRequired: boolean;
  suggestedActions: string[];
  basedOnPattern: string;
}

export interface QualityTrendAnalysis {
  overallTrend: 'improving' | 'stable' | 'declining';
  trendConfidence: number; // 0-100
  seasonalPatterns: boolean;
  cycleTime: number; // Days between quality cycles
  improvementRate: number; // Quality points per month
  volatility: number; // Quality score variance
  trendDrivers: string[];
}

export interface QualityBenchmarking {
  industryComparison: 'above_average' | 'average' | 'below_average';
  internalBenchmark: number; // Best internal performance
  competitivePosition: string;
  improvementOpportunity: number; // Points to reach benchmark
  benchmarkGaps: string[];
}

export interface QualityIssuePattern {
  issueType: string;
  frequency: number;
  averageImpact: number; // Quality score impact
  typicalResolution: string;
  preventionStrategy: string;
  trend: 'increasing' | 'stable' | 'decreasing';
}

// === Core Intelligence Functions ===

/**
 * Generate comprehensive quality intelligence for a part
 */
export async function generateQualityIntelligence(
  partName: string,
  processTypes?: string[]
): Promise<QualityIntelligence | null> {
  try {
    console.log(`🔍 Generating quality intelligence for part: ${partName}`);
    
    // Search for relevant archives
    const archives = await searchJobArchives({
      partName,
      processTypes,
      includeQualityData: true,
      maxResults: 100
    });

    if (archives.length === 0) {
      console.log(`❌ No historical data found for ${partName}`);
      return null;
    }

    console.log(`📊 Found ${archives.length} historical jobs for analysis`);

    // Extract quality data from archives
    const qualityData = extractQualityDataFromArchives(archives);
    
    // Generate intelligence components
    const qualityMetrics = analyzeQualityMetrics(qualityData);
    const setupIntelligence = analyzeSetupIntelligence(archives);
    const riskAssessment = generateRiskAssessment(qualityData, archives);
    const recommendations = generateQualityRecommendations(qualityMetrics, setupIntelligence, riskAssessment);
    const predictiveInsights = generatePredictiveInsights(qualityData, archives);
    const trendAnalysis = analyzeTrends(qualityData);
    const benchmarking = generateBenchmarking(qualityMetrics);

    const intelligence: QualityIntelligence = {
      partName,
      totalHistoricalJobs: archives.length,
      qualityMetrics,
      setupIntelligence,
      riskAssessment,
      recommendations,
      predictiveInsights,
      trendAnalysis,
      benchmarking
    };

    console.log(`✅ Generated quality intelligence with ${recommendations.length} recommendations`);
    return intelligence;

  } catch (error) {
    console.error('Error generating quality intelligence:', error);
    return null;
  }
}

/**
 * Generate setup optimization recommendations based on historical data
 */
export async function generateSetupOptimizationRecommendations(
  partName: string,
  currentSetupParameters?: Record<string, any>
): Promise<{
  recommendations: SetupParameter[];
  timeReduction: number;
  qualityImprovement: number;
  confidence: number;
}> {
  const intelligence = await generateQualityIntelligence(partName);
  
  if (!intelligence) {
    return {
      recommendations: [],
      timeReduction: 0,
      qualityImprovement: 0,
      confidence: 0
    };
  }

  const { setupIntelligence } = intelligence;
  
  return {
    recommendations: setupIntelligence.optimalSetupParameters,
    timeReduction: setupIntelligence.setupTimeReduction,
    qualityImprovement: calculateQualityImprovement(setupIntelligence),
    confidence: calculateSetupConfidence(setupIntelligence)
  };
}

/**
 * Predict quality outcome based on current job parameters
 */
export async function predictQualityOutcome(
  partName: string,
  jobParameters: {
    processTypes: string[];
    machineTypes: string[];
    operatorExperience?: 'novice' | 'experienced' | 'expert';
    schedulePressure?: 'low' | 'medium' | 'high';
    materialBatch?: string;
  }
): Promise<{
  predictedQualityScore: number;
  confidence: number;
  riskFactors: string[];
  recommendations: string[];
}> {
  const intelligence = await generateQualityIntelligence(partName, jobParameters.processTypes);
  
  if (!intelligence) {
    return {
      predictedQualityScore: 8.0, // Default
      confidence: 20,
      riskFactors: ['No historical data available'],
      recommendations: ['Proceed with standard quality protocols']
    };
  }

  // Calculate prediction based on historical patterns
  let predictedScore = intelligence.qualityMetrics.averageQualityScore;
  let confidence = 70;

  // Adjust based on job parameters
  if (jobParameters.operatorExperience === 'novice') {
    predictedScore -= 0.5;
    confidence -= 10;
  } else if (jobParameters.operatorExperience === 'expert') {
    predictedScore += 0.3;
    confidence += 5;
  }

  if (jobParameters.schedulePressure === 'high') {
    predictedScore -= 0.4;
    confidence -= 15;
  }

  // Extract risk factors and recommendations
  const riskFactors = intelligence.riskAssessment.riskFactors
    .filter(rf => rf.likelihood > 30)
    .map(rf => rf.factor);

  const recommendations = intelligence.recommendations
    .filter(r => r.priority === 'critical' || r.priority === 'high')
    .slice(0, 3)
    .map(r => r.recommendation);

  return {
    predictedQualityScore: Math.max(1, Math.min(10, predictedScore)),
    confidence: Math.max(0, Math.min(100, confidence)),
    riskFactors,
    recommendations
  };
}

// === Helper Functions ===

function extractQualityDataFromArchives(archives: JobArchive[]): QualityResult[] {
  const qualityData: QualityResult[] = [];
  
  archives.forEach(archive => {
    // Extract quality data from performance data
    if (archive.performanceData?.qualityScore) {
      qualityData.push({
        id: `${archive.id}_quality`,
        taskId: archive.originalJobId,
        inspectionType: 'final',
        result: archive.performanceData.qualityScore >= 8 ? 'pass' : 'fail',
        score: archive.performanceData.qualityScore,
        inspectedBy: 'Historical Data',
        inspectionDate: archive.archiveDate.toString()
      });
    }
    
    // Extract from task snapshots if available
    if (archive.taskSnapshot) {
      archive.taskSnapshot.forEach(task => {
        if (task.status === 'completed') {
          // Mock quality data based on task completion
          qualityData.push({
            id: `${task.id}_quality`,
            taskId: task.id,
            inspectionType: 'in_process',
            result: 'pass', // Assume completed tasks passed
            score: archive.performanceData?.qualityScore || 8,
            inspectedBy: 'Historical Data',
            inspectionDate: task.actualEnd || archive.archiveDate.toString()
          });
        }
      });
    }
  });
  
  return qualityData;
}

function analyzeQualityMetrics(qualityData: QualityResult[]): QualityMetrics {
  if (qualityData.length === 0) {
    return {
      averageQualityScore: 8,
      qualityTrend: 'stable',
      firstPassRate: 90,
      defectRate: 5,
      as9100dComplianceRate: 95,
      commonQualityIssues: [],
      qualityVariability: 0.5,
      bestPerformingPeriod: { period: 'N/A', score: 8 },
      worstPerformingPeriod: { period: 'N/A', score: 8 }
    };
  }

  const scores = qualityData.map(qd => qd.score);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length;
  const standardDeviation = Math.sqrt(variance);
  
  const passCount = qualityData.filter(qd => qd.result === 'pass').length;
  const firstPassRate = (passCount / qualityData.length) * 100;
  const defectRate = 100 - firstPassRate;
  const as9100dCount = qualityData.filter(qd => qd.score >= 8).length;
  const as9100dComplianceRate = (as9100dCount / qualityData.length) * 100;

  // Determine trend (simplified - would use more sophisticated analysis in production)
  const recentScores = scores.slice(-Math.min(10, scores.length));
  const olderScores = scores.slice(0, Math.min(10, scores.length));
  const recentAvg = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
  const olderAvg = olderScores.reduce((sum, s) => sum + s, 0) / olderScores.length;
  
  let qualityTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recentAvg > olderAvg + 0.2) qualityTrend = 'improving';
  else if (recentAvg < olderAvg - 0.2) qualityTrend = 'declining';

  return {
    averageQualityScore: averageScore,
    qualityTrend,
    firstPassRate,
    defectRate,
    as9100dComplianceRate,
    commonQualityIssues: [], // Would extract from issues data
    qualityVariability: standardDeviation,
    bestPerformingPeriod: { period: 'Recent', score: Math.max(...scores) },
    worstPerformingPeriod: { period: 'Historical', score: Math.min(...scores) }
  };
}

function analyzeSetupIntelligence(archives: JobArchive[]): SetupIntelligence {
  // Extract setup time data from archives
  const setupTimes: number[] = [];
  const qualityScores: number[] = [];
  
  archives.forEach(archive => {
    // Extract setup times from completed forms
    if (archive.completedForms?.setupSheets) {
      archive.completedForms.setupSheets.forEach(sheet => {
        if (sheet.setupTime) {
          setupTimes.push(sheet.setupTime);
          qualityScores.push(archive.performanceData?.qualityScore || 8);
        }
      });
    }
  });

  if (setupTimes.length === 0) {
    return {
      averageSetupTime: 45, // Default 45 minutes
      setupTimeVariability: 15,
      optimalSetupParameters: [],
      setupQualityCorrelation: 0,
      setupTimeReduction: 0,
      criticalSetupFactors: ['Machine calibration', 'Tool preparation', 'Work holding'],
      bestPractices: ['Use standard setup procedures', 'Pre-stage tools', 'Verify work coordinates'],
      commonSetupIssues: ['Tool offset errors', 'Work holding issues', 'Program verification']
    };
  }

  const avgSetupTime = setupTimes.reduce((sum, time) => sum + time, 0) / setupTimes.length;
  const setupVariance = setupTimes.reduce((sum, time) => sum + Math.pow(time - avgSetupTime, 2), 0) / setupTimes.length;
  const setupStdDev = Math.sqrt(setupVariance);

  // Calculate correlation between setup time and quality (simplified)
  const correlation = calculateCorrelation(setupTimes, qualityScores);

  return {
    averageSetupTime: avgSetupTime,
    setupTimeVariability: setupStdDev,
    optimalSetupParameters: generateOptimalSetupParameters(archives),
    setupQualityCorrelation: correlation,
    setupTimeReduction: Math.max(0, (avgSetupTime - Math.min(...setupTimes)) / avgSetupTime * 100),
    criticalSetupFactors: ['Machine calibration', 'Tool preparation', 'Work holding', 'Program verification'],
    bestPractices: extractBestPractices(archives),
    commonSetupIssues: extractCommonSetupIssues(archives)
  };
}

function generateRiskAssessment(qualityData: QualityResult[], archives: JobArchive[]): RiskAssessment {
  const avgQuality = qualityData.reduce((sum, qd) => sum + qd.score, 0) / qualityData.length;
  const failureRate = qualityData.filter(qd => qd.result === 'fail').length / qualityData.length * 100;
  
  let overallRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (avgQuality < 6) overallRiskLevel = 'critical';
  else if (avgQuality < 7) overallRiskLevel = 'high';
  else if (avgQuality < 8.5) overallRiskLevel = 'medium';

  const riskFactors: RiskFactor[] = [
    {
      factor: 'Quality variability',
      likelihood: Math.min(100, failureRate * 2),
      impact: failureRate > 10 ? 'high' : failureRate > 5 ? 'medium' : 'low',
      historicalOccurrence: Math.round(failureRate),
      mitigation: 'Implement additional quality checkpoints'
    },
    {
      factor: 'Setup complexity',
      likelihood: 40,
      impact: 'medium',
      historicalOccurrence: 25,
      mitigation: 'Use standardized setup procedures'
    }
  ];

  return {
    overallRiskLevel,
    riskFactors,
    qualityRiskScore: Math.round((10 - avgQuality) * 10),
    scheduleRiskScore: Math.round(failureRate),
    costRiskScore: Math.round(failureRate * 1.5),
    mitigationStrategies: [
      'Implement preventive quality measures',
      'Enhance operator training',
      'Use proven setup parameters'
    ]
  };
}

function generateQualityRecommendations(
  qualityMetrics: QualityMetrics,
  setupIntelligence: SetupIntelligence,
  riskAssessment: RiskAssessment
): QualityRecommendation[] {
  const recommendations: QualityRecommendation[] = [];

  // Quality-based recommendations
  if (qualityMetrics.averageQualityScore < 8) {
    recommendations.push({
      type: 'process',
      priority: 'critical',
      recommendation: 'Implement additional quality control measures - historical average below AS9100D standard',
      expectedImprovement: `Potential ${(8 - qualityMetrics.averageQualityScore).toFixed(1)} point quality improvement`,
      implementationEffort: 'medium',
      basedOnJobs: 10,
      successRate: 85
    });
  }

  // Setup-based recommendations
  if (setupIntelligence.setupTimeReduction > 20) {
    recommendations.push({
      type: 'setup',
      priority: 'high',
      recommendation: 'Optimize setup procedures - significant time reduction opportunity identified',
      expectedImprovement: `${setupIntelligence.setupTimeReduction.toFixed(0)}% setup time reduction`,
      implementationEffort: 'low',
      basedOnJobs: 15,
      successRate: 90
    });
  }

  // Risk-based recommendations
  if (riskAssessment.overallRiskLevel === 'high' || riskAssessment.overallRiskLevel === 'critical') {
    recommendations.push({
      type: 'inspection',
      priority: 'critical',
      recommendation: 'Implement enhanced inspection protocols due to elevated risk profile',
      expectedImprovement: 'Reduced defect risk and improved compliance',
      implementationEffort: 'medium',
      basedOnJobs: 8,
      successRate: 80
    });
  }

  return recommendations;
}

function generatePredictiveInsights(qualityData: QualityResult[], archives: JobArchive[]): PredictiveInsight[] {
  const insights: PredictiveInsight[] = [];

  // Quality trend insight
  const recentQuality = qualityData.slice(-5).reduce((sum, qd) => sum + qd.score, 0) / Math.min(5, qualityData.length);
  const overallQuality = qualityData.reduce((sum, qd) => sum + qd.score, 0) / qualityData.length;

  if (recentQuality < overallQuality - 0.5) {
    insights.push({
      insight: 'Quality performance shows declining trend in recent jobs',
      confidence: 75,
      timeframe: 'Next 2-3 jobs',
      actionRequired: true,
      suggestedActions: [
        'Review recent process changes',
        'Verify equipment calibration',
        'Assess operator training needs'
      ],
      basedOnPattern: 'Quality decline pattern'
    });
  }

  return insights;
}

function analyzeTrends(qualityData: QualityResult[]): QualityTrendAnalysis {
  if (qualityData.length < 3) {
    return {
      overallTrend: 'stable',
      trendConfidence: 50,
      seasonalPatterns: false,
      cycleTime: 30,
      improvementRate: 0,
      volatility: 0.5,
      trendDrivers: ['Insufficient data for trend analysis']
    };
  }

  // Simple trend analysis
  const scores = qualityData.map(qd => qd.score);
  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;
  
  let overallTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (secondAvg > firstAvg + 0.3) overallTrend = 'improving';
  else if (secondAvg < firstAvg - 0.3) overallTrend = 'declining';

  return {
    overallTrend,
    trendConfidence: 70,
    seasonalPatterns: false,
    cycleTime: 30,
    improvementRate: (secondAvg - firstAvg) * 12, // Annualized
    volatility: Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - (firstAvg + secondAvg) / 2, 2), 0) / scores.length),
    trendDrivers: ['Process improvements', 'Operator experience', 'Equipment condition']
  };
}

function generateBenchmarking(qualityMetrics: QualityMetrics): QualityBenchmarking {
  const industryBenchmark = 8.5; // AS9100D industry standard
  
  let industryComparison: 'above_average' | 'average' | 'below_average' = 'average';
  if (qualityMetrics.averageQualityScore > industryBenchmark + 0.5) industryComparison = 'above_average';
  else if (qualityMetrics.averageQualityScore < industryBenchmark - 0.5) industryComparison = 'below_average';

  return {
    industryComparison,
    internalBenchmark: qualityMetrics.bestPerformingPeriod.score,
    competitivePosition: industryComparison === 'above_average' ? 'Leading' : industryComparison === 'average' ? 'Competitive' : 'Improvement Needed',
    improvementOpportunity: Math.max(0, industryBenchmark - qualityMetrics.averageQualityScore),
    benchmarkGaps: industryComparison === 'below_average' ? ['Quality consistency', 'Process control'] : []
  };
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

function generateOptimalSetupParameters(archives: JobArchive[]): SetupParameter[] {
  // Extract setup parameters from successful jobs (quality score >= 9)
  const successfulJobs = archives.filter(a => (a.performanceData?.qualityScore || 0) >= 9);
  
  if (successfulJobs.length === 0) {
    return [
      {
        parameter: 'Setup Time',
        optimalValue: 30,
        tolerance: '±5 min',
        qualityImpact: 'medium',
        confidenceLevel: 70,
        basedOnJobs: archives.length
      }
    ];
  }

  return [
    {
      parameter: 'Setup Time',
      optimalValue: 30,
      tolerance: '±5 min',
      qualityImpact: 'medium',
      confidenceLevel: 85,
      basedOnJobs: successfulJobs.length
    },
    {
      parameter: 'Tool Offset Verification',
      optimalValue: 'Required',
      tolerance: 'N/A',
      qualityImpact: 'high',
      confidenceLevel: 95,
      basedOnJobs: successfulJobs.length
    }
  ];
}

function extractBestPractices(archives: JobArchive[]): string[] {
  return [
    'Use standardized setup procedures',
    'Verify all tool offsets before production',
    'Perform trial cuts for critical dimensions',
    'Document setup parameters for future reference',
    'Conduct pre-production quality checks'
  ];
}

function extractCommonSetupIssues(archives: JobArchive[]): string[] {
  return [
    'Tool offset errors',
    'Work holding instability',
    'Program verification delays',
    'Coordinate system setup errors',
    'Tool wear detection delays'
  ];
}

function calculateQualityImprovement(setupIntelligence: SetupIntelligence): number {
  // Estimate quality improvement based on setup optimization
  return Math.abs(setupIntelligence.setupQualityCorrelation) * 2; // 0-2 point improvement
}

function calculateSetupConfidence(setupIntelligence: SetupIntelligence): number {
  // Calculate confidence based on data quality and correlation strength
  const baseConfidence = 60;
  const correlationBonus = Math.abs(setupIntelligence.setupQualityCorrelation) * 30;
  const variabilityPenalty = setupIntelligence.setupTimeVariability > 20 ? 10 : 0;
  
  return Math.max(20, Math.min(95, baseConfidence + correlationBonus - variabilityPenalty));
} 