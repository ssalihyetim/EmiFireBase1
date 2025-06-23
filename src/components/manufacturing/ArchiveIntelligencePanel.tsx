'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  TrendingUp, 
  Clock, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  FileText,
  Cog,
  Wrench
} from 'lucide-react';
import ProductionDocumentViewer from './ProductionDocumentViewer';
import { 
  getPartArchiveHistory, 
  searchJobArchives, 
  calculateArchiveStatistics 
} from '@/lib/job-archival';
import type { JobArchive } from '@/types/archival';

interface ArchiveIntelligencePanelProps {
  partName?: string;
  initialLoad?: boolean;
}

export default function ArchiveIntelligencePanel({ 
  partName, 
  initialLoad = false 
}: ArchiveIntelligencePanelProps) {
  const [searchQuery, setSearchQuery] = useState(partName || '');
  const [archives, setArchives] = useState<JobArchive[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  // Load data automatically if initialLoad is true
  useEffect(() => {
    if (initialLoad && partName) {
      handleSearch();
    }
  }, [initialLoad, partName]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      // Search for archives
      const foundArchives = await getPartArchiveHistory(searchQuery);
      setArchives(foundArchives);

      // Calculate insights from the archives
      if (foundArchives.length > 0) {
        const calculatedInsights = calculateInsights(foundArchives);
        setInsights(calculatedInsights);
      } else {
        setInsights(null);
      }

      // Get overall statistics for context
      const overallStats = await calculateArchiveStatistics();
      setStats(overallStats);

    } catch (error) {
      console.error('Error loading archive data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateInsights = (archives: JobArchive[]) => {
    const completed = archives.filter(a => a.archiveType === 'completed');
    const failed = archives.filter(a => a.archiveType === 'quality_failure');
    
    const avgQuality = completed.reduce((sum, a) => sum + a.performanceData.qualityScore, 0) / completed.length;
    const avgDuration = completed.reduce((sum, a) => sum + a.performanceData.totalDuration, 0) / completed.length;
    const successRate = (completed.length / archives.length) * 100;
    
    // Extract common issues
    const allIssues = completed.flatMap(a => a.performanceData.issuesEncountered || []);
    const issueFrequency = allIssues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Extract lessons learned
    const allLessons = completed.flatMap(a => a.performanceData.lessonsLearned || []);
    
    return {
      totalJobs: archives.length,
      successRate,
      avgQuality: avgQuality || 0,
      avgDuration: avgDuration || 0,
      riskLevel: avgQuality > 8 ? 'low' : avgQuality > 6 ? 'medium' : 'high',
      commonIssues: Object.entries(issueFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3),
      keyLessons: allLessons.slice(0, 3),
      recommendation: generateRecommendation(avgQuality, successRate, avgDuration)
    };
  };

  const handleViewForm = (form: any, formType: string, archiveName: string, fullArchive?: JobArchive) => {
    setSelectedForm({
      ...form,
      formType,
      archiveName,
      fullArchive
    });
    setFormDialogOpen(true);
  };

  const generateRecommendation = (quality: number, successRate: number, duration: number) => {
    if (quality > 8 && successRate > 90) {
      return {
        type: 'success',
        message: 'Excellent historical performance. Proceed with confidence using proven methods.',
        actions: ['Use historical setup parameters', 'Apply proven tool configurations']
      };
    } else if (quality > 6 && successRate > 70) {
      return {
        type: 'caution',
        message: 'Good historical performance with some variability. Review past issues.',
        actions: ['Review common issues', 'Implement additional quality checks', 'Monitor setup closely']
      };
    } else {
      return {
        type: 'warning',
        message: 'Historical challenges detected. Plan for extra time and quality measures.',
        actions: ['Extensive pre-production planning', 'Additional operator training', 'Enhanced quality monitoring']
      };
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Archive Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter part name to analyze historical data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? 'Searching...' : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{insights.totalJobs}</div>
                  <div className="text-sm text-muted-foreground">Historical Jobs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{insights.successRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{insights.avgQuality.toFixed(1)}/10</div>
                  <div className="text-sm text-muted-foreground">Avg Quality</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{insights.avgDuration.toFixed(1)}h</div>
                  <div className="text-sm text-muted-foreground">Avg Duration</div>
                </div>
              </div>
              
              <div className="flex items-center justify-center">
                <Badge 
                  variant={insights.riskLevel === 'low' ? 'default' : insights.riskLevel === 'medium' ? 'secondary' : 'destructive'}
                  className="flex items-center gap-1"
                >
                  {insights.riskLevel === 'low' ? <CheckCircle className="h-3 w-3" /> : 
                   insights.riskLevel === 'medium' ? <Clock className="h-3 w-3" /> : 
                   <AlertTriangle className="h-3 w-3" />}
                  {insights.riskLevel.toUpperCase()} RISK
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Insights & Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manufacturing Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert className={
                insights.recommendation.type === 'success' ? 'border-green-200 bg-green-50' :
                insights.recommendation.type === 'caution' ? 'border-yellow-200 bg-yellow-50' :
                'border-red-200 bg-red-50'
              }>
                <AlertDescription>
                  {insights.recommendation.message}
                </AlertDescription>
              </Alert>

              <div>
                <h4 className="font-medium mb-2">Recommended Actions:</h4>
                <ul className="text-sm space-y-1">
                  {insights.recommendation.actions.map((action: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-blue-600 rounded-full" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              {insights.commonIssues.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Common Issues:</h4>
                  <div className="flex flex-wrap gap-1">
                    {insights.commonIssues.map(([issue, count]: [string, number], index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {issue} ({count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manufacturing Forms Archive */}
      {archives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Manufacturing Forms Archive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {archives.slice(0, 3).map((archive) => (
                <div key={archive.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium">{archive.jobSnapshot.item.partName}</div>
                      <div className="text-sm text-muted-foreground">
                        {archive.jobSnapshot.clientName} • {new Date(archive.archiveDate).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="outline">
                      Quality: {archive.performanceData.qualityScore}/10
                    </Badge>
                  </div>

                  {/* Forms Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Routing Sheet */}
                    {archive.completedForms.routingSheet && (
                      <div 
                        className="border rounded p-3 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => handleViewForm(archive.completedForms.routingSheet, 'Routing Sheet', archive.jobSnapshot.item.partName, archive)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">Routing Sheet</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Completed: {new Date(archive.completedForms.routingSheet.completedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          By: {archive.completedForms.routingSheet.completedBy}
                        </div>
                      </div>
                    )}

                    {/* Setup Sheets */}
                    {archive.completedForms.setupSheets?.map((setupSheet, index) => (
                      <div 
                        key={index} 
                        className="border rounded p-3 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
                        onClick={() => handleViewForm(setupSheet, `Setup Sheet #${index + 1}`, archive.jobSnapshot.item.partName, archive)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Cog className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-sm">Setup Sheet #{index + 1}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Completed: {new Date(setupSheet.completedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          By: {setupSheet.completedBy}
                        </div>
                      </div>
                    ))}

                    {/* Tool Lists */}
                    {archive.completedForms.toolLists?.map((toolList, index) => (
                      <div 
                        key={index} 
                        className="border rounded p-3 bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors"
                        onClick={() => handleViewForm(toolList, `Tool List #${index + 1}`, archive.jobSnapshot.item.partName, archive)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Wrench className="h-4 w-4 text-purple-600" />
                          <span className="font-medium text-sm">Tool List #{index + 1}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Completed: {new Date(toolList.completedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          By: {toolList.completedBy}
                        </div>
                      </div>
                    ))}

                    {/* FAI Reports */}
                    {archive.completedForms.faiReports?.map((faiReport, index) => (
                      <div 
                        key={index} 
                        className="border rounded p-3 bg-yellow-50 cursor-pointer hover:bg-yellow-100 transition-colors"
                        onClick={() => handleViewForm(faiReport, `FAI Report #${index + 1}`, archive.jobSnapshot.item.partName, archive)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium text-sm">FAI Report #{index + 1}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Completed: {new Date(faiReport.completedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          By: {faiReport.completedBy}
                        </div>
                      </div>
                    ))}

                    {/* Inspection Records */}
                    {archive.completedForms.inspectionRecords?.map((inspection, index) => (
                      <div 
                        key={index} 
                        className="border rounded p-3 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors"
                        onClick={() => handleViewForm(inspection, `Inspection #${index + 1}`, archive.jobSnapshot.item.partName, archive)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-sm">Inspection #{index + 1}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Completed: {new Date(inspection.completedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          By: {inspection.completedBy}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Forms Count */}
                  <div className="mt-3 text-center">
                    <span className="text-sm text-muted-foreground">
                      Total Forms: {
                        (archive.completedForms.routingSheet ? 1 : 0) +
                        (archive.completedForms.setupSheets?.length || 0) +
                        (archive.completedForms.toolLists?.length || 0) +
                        (archive.completedForms.faiReports?.length || 0) +
                        (archive.completedForms.inspectionRecords?.length || 0)
                      } completed
                    </span>
                  </div>
                </div>
              ))}
              
              {archives.length > 3 && (
                <div className="text-center text-sm text-muted-foreground py-2">
                  ... and {archives.length - 3} more historical jobs with archived forms
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Archive List Summary */}
      {archives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Historical Records Summary ({archives.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {archives.slice(0, 5).map((archive) => (
                <div key={archive.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div>
                    <div className="font-medium">{archive.jobSnapshot.item.partName}</div>
                    <div className="text-sm text-muted-foreground">
                      {archive.jobSnapshot.clientName} • {new Date(archive.archiveDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">Quality: {archive.performanceData.qualityScore}/10</div>
                    <div className="text-sm text-muted-foreground">{archive.performanceData.totalDuration}h</div>
                  </div>
                </div>
              ))}
              {archives.length > 5 && (
                <div className="text-center text-sm text-muted-foreground py-2">
                  ... and {archives.length - 5} more historical records
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!isLoading && searchQuery && archives.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Historical Data</h3>
            <p className="text-muted-foreground">
              No manufacturing history found for "{searchQuery}". This appears to be a new or unique part.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Complete Production Archive Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Complete Production Archive - {selectedForm?.archiveName}
            </DialogTitle>
            <DialogDescription>
              View all manufacturing documents exactly as they were completed in production
            </DialogDescription>
          </DialogHeader>
          
          {selectedForm?.fullArchive && (
            <ProductionDocumentViewer archive={selectedForm.fullArchive} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 