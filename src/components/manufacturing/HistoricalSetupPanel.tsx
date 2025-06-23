'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wrench, 
  Clock, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Zap,
  BarChart3,
  Settings,
  Lightbulb,
  History,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateSetupIntelligence, getOptimizedSetupParameters, predictSetupSuccess } from '@/lib/historical-setup-intelligence';
import type { SetupIntelligence } from '@/lib/historical-setup-intelligence';
import type { JobTask } from '@/types';

interface HistoricalSetupPanelProps {
  task: JobTask;
  partName: string;
  processType: string;
  onSetupOptimization?: (optimizations: any) => void;
  className?: string;
}

export default function HistoricalSetupPanel({
  task,
  partName,
  processType,
  onSetupOptimization,
  className
}: HistoricalSetupPanelProps) {
  const [setupIntelligence, setSetupIntelligence] = useState<SetupIntelligence | null>(null);
  const [optimizedParameters, setOptimizedParameters] = useState<any>(null);
  const [setupPrediction, setSetupPrediction] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadSetupIntelligence();
  }, [partName, processType]);

  const loadSetupIntelligence = async () => {
    if (!partName || !processType) return;

    setIsLoading(true);
    try {
      // Load comprehensive setup intelligence
      const intelligence = await generateSetupIntelligence(partName, processType);
      setSetupIntelligence(intelligence);

      // Get optimized parameters
      const optimized = await getOptimizedSetupParameters(partName, processType);
      setOptimizedParameters(optimized);

      // Predict setup success with current conditions
      const prediction = await predictSetupSuccess(partName, processType, {
        operatorExperience: 'experienced', // Default assumption
        machineCondition: 'good',
        timeAvailable: task.setupTimeMinutes || 45,
        toolCondition: 'good',
        schedulePressure: task.priority === 'urgent' || task.priority === 'critical' ? 'high' : 'medium'
      });
      setSetupPrediction(prediction);

      // Notify parent of optimizations
      if (onSetupOptimization && optimized.recommendations.length > 0) {
        onSetupOptimization({
          timeReduction: optimized.timeReduction,
          qualityImprovement: optimized.qualityImprovement,
          recommendations: optimized.recommendations,
          confidence: optimized.confidence
        });
      }

    } catch (error) {
      console.error('Error loading setup intelligence:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'critical': return 'text-red-700 bg-red-100 border-red-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading setup intelligence...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!setupIntelligence) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No historical setup data available for {partName} - {processType}</p>
          <p className="text-sm">This appears to be a new or unique part/process combination</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Historical Setup Intelligence
          <Badge variant="outline" className="ml-auto">
            {setupIntelligence.totalHistoricalSetups} setups analyzed
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
            <TabsTrigger value="prediction">Prediction</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Clock className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <div className="text-lg font-bold text-blue-900">
                  {setupIntelligence.setupMetrics.averageSetupTime.toFixed(0)}min
                </div>
                <div className="text-xs text-blue-700">Avg Setup Time</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Target className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <div className="text-lg font-bold text-green-900">
                  {setupIntelligence.setupMetrics.averageQualityScore.toFixed(1)}/10
                </div>
                <div className="text-xs text-green-700">Avg Quality</div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <CheckCircle className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                <div className="text-lg font-bold text-purple-900">
                  {setupIntelligence.setupMetrics.setupSuccessRate.toFixed(0)}%
                </div>
                <div className="text-xs text-purple-700">Success Rate</div>
              </div>
              
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <TrendingUp className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                <div className="text-lg font-bold text-orange-900">
                  {setupIntelligence.setupMetrics.toolChangeFrequency.toFixed(1)}
                </div>
                <div className="text-xs text-orange-700">Avg Tools</div>
              </div>
            </div>

            {/* Quality Correlation */}
            {setupIntelligence.qualityCorrelation.overallCorrelation !== 0 && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium text-indigo-900">Setup-Quality Correlation</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Overall Correlation:</span>
                    <span className={cn("ml-2 font-medium", 
                      Math.abs(setupIntelligence.qualityCorrelation.overallCorrelation) > 0.5 ? 'text-green-600' : 'text-yellow-600'
                    )}>
                      {(setupIntelligence.qualityCorrelation.overallCorrelation * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Significance:</span>
                    <span className="ml-2 font-medium text-indigo-600">
                      {setupIntelligence.qualityCorrelation.significantFactors[0]?.significance || 'Medium'}
                    </span>
                  </div>
                </div>
                {setupIntelligence.qualityCorrelation.significantFactors[0] && (
                  <p className="text-xs text-indigo-700 mt-2">
                    📈 {setupIntelligence.qualityCorrelation.significantFactors[0].recommendation}
                  </p>
                )}
              </div>
            )}

            {/* Time Ranges */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Historical Time Ranges
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Best:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {setupIntelligence.setupMetrics.setupTimeRange.min}min
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Average:</span>
                  <span className="ml-2 font-medium">
                    {setupIntelligence.setupMetrics.averageSetupTime.toFixed(0)}min
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Worst:</span>
                  <span className="ml-2 font-medium text-red-600">
                    {setupIntelligence.setupMetrics.setupTimeRange.max}min
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4">
            {optimizedParameters && (
              <>
                {/* Time Optimization */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">Setup Time Optimization</span>
                    <Badge variant="outline" className={getConfidenceColor(optimizedParameters.confidence)}>
                      {optimizedParameters.confidence}% confidence
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-700 flex items-center justify-center gap-1">
                        <ArrowDown className="h-5 w-5" />
                        {optimizedParameters.timeReduction.toFixed(0)}%
                      </div>
                      <div className="text-sm text-green-600">Time Reduction</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-700 flex items-center justify-center gap-1">
                        <ArrowUp className="h-5 w-5" />
                        {optimizedParameters.qualityImprovement.toFixed(1)}pts
                      </div>
                      <div className="text-sm text-green-600">Quality Improvement</div>
                    </div>
                  </div>

                  {/* Current vs Optimized */}
                  {setupIntelligence.optimizedParameters.recommendedSetupTime && (
                    <div className="bg-white p-3 rounded border">
                      <div className="flex justify-between items-center text-sm">
                        <span>Current Target: {task.setupTimeMinutes || 45}min</span>
                        <span className="font-medium text-green-600">
                          Optimized: {setupIntelligence.optimizedParameters.recommendedSetupTime}min
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Critical Parameters */}
                {setupIntelligence.optimizedParameters.criticalParameters.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Critical Setup Parameters
                    </h4>
                    {setupIntelligence.optimizedParameters.criticalParameters.slice(0, 3).map((param, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{param.parameter}</span>
                          <Badge variant="outline" className={
                            param.impact === 'critical' ? 'border-red-500 text-red-700' :
                            param.impact === 'high' ? 'border-orange-500 text-orange-700' :
                            'border-blue-500 text-blue-700'
                          }>
                            {param.impact} impact
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="text-muted-foreground">Optimal Value:</span>
                            <span className="ml-2 font-medium">{param.optimalValue}</span>
                            {param.tolerance && (
                              <span className="ml-1 text-muted-foreground">({param.tolerance})</span>
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Based on:</span>
                            <span className="ml-2">{param.basedOnJobs} successful setups</span>
                            <span className="ml-2 text-green-600">({param.confidenceLevel}% confidence)</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {optimizedParameters.recommendations.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      Setup Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {optimizedParameters.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="prediction" className="space-y-4">
            {setupPrediction && (
              <>
                {/* Success Probability */}
                <div className={cn(
                  "p-4 rounded-lg border",
                  setupPrediction.successProbability >= 80 ? "bg-green-50 border-green-200" :
                  setupPrediction.successProbability >= 60 ? "bg-yellow-50 border-yellow-200" :
                  "bg-red-50 border-red-200"
                )}>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className={cn("h-5 w-5",
                      setupPrediction.successProbability >= 80 ? "text-green-600" :
                      setupPrediction.successProbability >= 60 ? "text-yellow-600" :
                      "text-red-600"
                    )} />
                    <span className="font-medium">Setup Success Prediction</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className={cn("text-3xl font-bold",
                        setupPrediction.successProbability >= 80 ? "text-green-700" :
                        setupPrediction.successProbability >= 60 ? "text-yellow-700" :
                        "text-red-700"
                      )}>
                        {setupPrediction.successProbability.toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Success Probability</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-700">
                        {setupPrediction.expectedSetupTime.toFixed(0)}min
                      </div>
                      <div className="text-sm text-muted-foreground">Expected Time</div>
                    </div>
                  </div>
                </div>

                {/* Quality Prediction */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Predicted Quality Outcome</span>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-700">
                      {setupPrediction.qualityPrediction.toFixed(1)}/10
                    </div>
                    <div className="text-sm text-purple-600">Expected Quality Score</div>
                  </div>
                </div>

                {/* Risk Factors */}
                {setupPrediction.riskFactors.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Risk Factors
                    </h4>
                    {setupPrediction.riskFactors.map((risk, index) => (
                      <div key={index} className="bg-red-50 p-3 rounded border border-red-200">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium text-red-700">{risk}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {setupPrediction.recommendations.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      Recommended Actions
                    </h4>
                    <ul className="space-y-2">
                      {setupPrediction.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {/* Best Practices */}
            {setupIntelligence.bestPractices.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Proven Best Practices
                </h4>
                {setupIntelligence.bestPractices.map((practice, index) => (
                  <div key={index} className="bg-green-50 p-3 rounded border border-green-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-green-900">{practice.practice}</span>
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        {practice.successRate}% success rate
                      </Badge>
                    </div>
                    <p className="text-sm text-green-700">{practice.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">{practice.category}</Badge>
                      <Badge variant="secondary" className="text-xs">{practice.impact}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Common Issues */}
            {setupIntelligence.setupMetrics.reworkRate > 5 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Common Setup Issues
                </h4>
                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-muted-foreground">Rework Rate:</span>
                      <span className="ml-2 font-medium text-orange-700">
                        {setupIntelligence.setupMetrics.reworkRate.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-orange-700 mt-2">
                      Historical data shows setup-related quality issues. Consider additional verification steps.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Time Optimization History */}
            {setupIntelligence.timeOptimization.optimizationOpportunities.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <History className="h-4 w-4 text-blue-500" />
                  Historical Optimization Opportunities
                </h4>
                {setupIntelligence.timeOptimization.optimizationOpportunities.slice(0, 3).map((opp, index) => (
                  <div key={index} className="bg-blue-50 p-3 rounded border border-blue-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-blue-900">{opp.area}</span>
                      <Badge variant="outline" className="text-blue-700 border-blue-300">
                        {opp.timeSavings.toFixed(0)}min saved
                      </Badge>
                    </div>
                    <p className="text-sm text-blue-700 mb-2">{opp.description}</p>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">{opp.difficultyLevel} difficulty</Badge>
                      <Badge variant="secondary" className="text-xs">{opp.investmentRequired} investment</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 