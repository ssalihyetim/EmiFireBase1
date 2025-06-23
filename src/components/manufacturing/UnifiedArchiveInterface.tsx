'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Wrench,
  History,
  Eye,
  Database,
  Archive,
  Target,
  Award,
  AlertCircle,
  Info
} from 'lucide-react';
import ProductionDocumentViewer from './ProductionDocumentViewer';
import { 
  getPartArchiveHistory, 
  searchJobArchives, 
  calculateArchiveStatistics 
} from '@/lib/job-archival';
import type { JobArchive } from '@/types/archival';

export interface UnifiedArchiveInterfaceProps {
  // Display modes
  mode?: 'dialog' | 'panel' | 'embedded';
  
  // Context-specific props
  partName?: string;
  jobId?: string;
  initialLoad?: boolean;
  
  // UI customization
  title?: string;
  description?: string;
  showTrigger?: boolean;
  triggerLabel?: string;
  
  // Size constraints
  maxHeight?: string;
  className?: string;
  
  // Feature toggles
  showStatistics?: boolean;
  showIntelligence?: boolean;
  showArchiveTable?: boolean;
  enableSearch?: boolean;
}

export default function UnifiedArchiveInterface({
  mode = 'panel',
  partName,
  jobId,
  initialLoad = false,
  title,
  description,
  showTrigger = true,
  triggerLabel = "Manufacturing History & Archives",
  maxHeight = "80vh",
  className = "",
  showStatistics = true,
  showIntelligence = true,
  showArchiveTable = true,
  enableSearch = true
}: UnifiedArchiveInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState(partName || '');
  const [archives, setArchives] = useState<JobArchive[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [selectedArchive, setSelectedArchive] = useState<JobArchive | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Search criteria for advanced filtering
  const [searchCriteria, setSearchCriteria] = useState({
    partNumber: partName || '',
    jobId: jobId || '',
    archiveType: undefined as string | undefined,
    qualityMin: undefined as number | undefined,
    dateFrom: undefined as string | undefined,
    dateTo: undefined as string | undefined
  });

  // Load data automatically if initialLoad is true
  useEffect(() => {
    if (initialLoad) {
      handleSearch();
    }
  }, [initialLoad]);

  // Load statistics on component mount
  useEffect(() => {
    if (showStatistics) {
      loadStatistics();
    }
  }, [showStatistics]);

  // Debug: Log when archives change
  useEffect(() => {
    console.log('📊 Archives state changed:', archives.length, 'archives');
    if (archives.length > 0) {
      console.log('📋 First archive:', archives[0]);
      console.log('🏗️ First archive part name:', archives[0]?.jobSnapshot?.item?.partName);
      console.log('🔧 First archive completed forms:', Object.keys(archives[0]?.completedForms || {}));
    }
  }, [archives]);

  const loadStatistics = async () => {
    try {
      const stats = await calculateArchiveStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleSearch = async () => {
    // Determine if this is a wildcard search (load all archives)
    const isWildcardSearch = searchQuery === "*" || partName === "*" || (initialLoad && (!searchQuery.trim() || !partName));
    
    // Only proceed if we have search criteria or it's a wildcard search
    if (!searchQuery.trim() && !searchCriteria.jobId && !searchCriteria.partNumber && !isWildcardSearch) return;

    setIsLoading(true);
    try {
      let foundArchives: JobArchive[] = [];

      // Load all archives for wildcard search
      if (isWildcardSearch) {
        console.log('🌟 Loading all archived jobs (wildcard search)');
        foundArchives = await searchJobArchives({
          archiveType: searchCriteria.archiveType ? [searchCriteria.archiveType as any] : undefined,
        });
      } else if (searchQuery.trim()) {
        console.log('🔍 Searching for specific part:', searchQuery);
        foundArchives = await getPartArchiveHistory(searchQuery);
      } else {
        // Use advanced search criteria
        console.log('🎯 Using advanced search criteria');
        foundArchives = await searchJobArchives({
          partNumber: searchCriteria.partNumber || undefined,
          jobId: searchCriteria.jobId || undefined,
          archiveType: searchCriteria.archiveType ? [searchCriteria.archiveType as any] : undefined,
          // qualityScoreMin: searchCriteria.qualityMin,
          // dateRange: (searchCriteria.dateFrom && searchCriteria.dateTo) ? {
          //   start: searchCriteria.dateFrom,
          //   end: searchCriteria.dateTo
          // } : undefined
        });
      }

      console.log('📋 Found archives:', foundArchives.length);
      console.log('🔍 Setting archives to state...');
      setArchives(foundArchives);
      console.log('✅ Archives state should be updated now');

      // Calculate insights if intelligence is enabled
      if (showIntelligence && foundArchives.length > 0) {
        const calculatedInsights = calculateInsights(foundArchives);
        setInsights(calculatedInsights);
      } else {
        setInsights(null);
      }

    } catch (error) {
      console.error('Error loading archive data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateInsights = (archives: JobArchive[]) => {
    const completed = archives.filter(a => a.archiveType === 'completed');
    const failed = archives.filter(a => a.archiveType === 'quality_failure');
    
    const avgQuality = completed.length > 0 
      ? completed.reduce((sum, a) => sum + (a.performanceData.qualityScore || 0), 0) / completed.length
      : 0;
    const avgDuration = completed.length > 0
      ? completed.reduce((sum, a) => sum + (a.performanceData.totalDuration || 0), 0) / completed.length
      : 0;
    const successRate = archives.length > 0 ? (completed.length / archives.length) * 100 : 0;
    
    // Extract common issues
    const allIssues = completed.flatMap(a => a.performanceData.issuesEncountered || []);
    const issueFrequency = allIssues.reduce((acc, issue) => {
      const key = typeof issue === 'string' ? issue : issue.type || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Extract lessons learned
    const allLessons = completed.flatMap(a => a.performanceData.lessonsLearned || []);
    
    // Group archives by lot number if available
    const lotGroups = archives.reduce((acc, archive) => {
      const lotInfo = archive.jobSnapshot.lotInfo;
      const key = lotInfo ? `${lotInfo.partNumber}-Lot-${lotInfo.lotNumber}` : 'No Lot Info';
      if (!acc[key]) acc[key] = [];
      acc[key].push(archive);
      return acc;
    }, {} as Record<string, JobArchive[]>);

    return {
      totalJobs: archives.length,
      totalLots: Object.keys(lotGroups).length,
      lotBreakdown: lotGroups,
      successRate,
      avgQuality,
      avgDuration,
      riskLevel: avgQuality > 8 ? 'low' : avgQuality > 6 ? 'medium' : 'high',
      commonIssues: Object.entries(issueFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3),
      keyLessons: allLessons.slice(0, 3),
      recommendation: generateRecommendation(avgQuality, successRate, avgDuration)
    };
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

  const renderContent = () => (
    <div className={`space-y-6 ${className}`} style={{ maxHeight: maxHeight, overflowY: 'auto' }}>
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Archive className="h-6 w-6" />
          {title || "Manufacturing History & Archive Intelligence"}
        </h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
        
        {/* Status Indicator */}
        <div className="flex items-center gap-4 text-sm">
          {isLoading && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              Loading archives...
            </div>
          )}
          {!isLoading && archives.length > 0 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-3 w-3" />
              Found {archives.length} archived jobs
            </div>
          )}
          {!isLoading && archives.length === 0 && searchQuery && (
            <div className="flex items-center gap-2 text-gray-500">
              <Info className="h-3 w-3" />
              No archives found
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="archives" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
          <TabsTrigger value="archives">Archive Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Statistics Cards */}
          {showStatistics && statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{statistics.totalArchives}</div>
                  <div className="text-sm text-muted-foreground">Total Archived Jobs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{statistics.totalFormsArchived}</div>
                  <div className="text-sm text-muted-foreground">Manufacturing Forms</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{statistics.avgQualityScore?.toFixed(1) || 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">Avg Quality Score</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{statistics.storageUsedMB?.toFixed(1) || 'N/A'} MB</div>
                  <div className="text-sm text-muted-foreground">Archive Storage</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search Interface */}
          {enableSearch && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Archives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder="Search by part name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Input
                    placeholder="Job ID..."
                    value={searchCriteria.jobId}
                    onChange={(e) => setSearchCriteria({ ...searchCriteria, jobId: e.target.value })}
                  />
                  <Select 
                    value={searchCriteria.archiveType || 'all'} 
                    onValueChange={(value) => setSearchCriteria({ 
                      ...searchCriteria, 
                      archiveType: value === 'all' ? undefined : value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Archive Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="quality_failure">Quality Failure</SelectItem>
                      <SelectItem value="pattern_creation">Pattern Creation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSearch} disabled={isLoading} className="w-full">
                  <Search className="mr-2 h-4 w-4" />
                  {isLoading ? 'Searching...' : 'Search Archives'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Intelligence Tab */}
        <TabsContent value="intelligence" className="space-y-4">
          {showIntelligence && insights ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{insights.totalJobs}</div>
                      <div className="text-sm text-muted-foreground">Historical Jobs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{insights.totalLots}</div>
                      <div className="text-sm text-muted-foreground">Production Lots</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{insights.successRate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{insights.avgQuality.toFixed(1)}/10</div>
                      <div className="text-sm text-muted-foreground">Avg Quality</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <Badge 
                      variant={insights.riskLevel === 'low' ? 'default' : insights.riskLevel === 'medium' ? 'secondary' : 'destructive'}
                      className="flex items-center gap-1"
                    >
                      {insights.riskLevel === 'low' && <CheckCircle className="h-3 w-3" />}
                      {insights.riskLevel === 'medium' && <AlertTriangle className="h-3 w-3" />}
                      {insights.riskLevel === 'high' && <AlertCircle className="h-3 w-3" />}
                      {insights.riskLevel.toUpperCase()} RISK
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Lot Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Lot Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Object.entries(insights.lotBreakdown).map(([lotKey, lotArchives]) => (
                      <div key={lotKey} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="font-medium">{lotKey}</span>
                        <Badge variant="outline">{(lotArchives as JobArchive[]).length} jobs</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">{insights.recommendation.message}</p>
                        <ul className="list-disc list-inside space-y-1">
                          {insights.recommendation.actions.map((action: string, index: number) => (
                            <li key={index} className="text-sm">{action}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 
                    `No manufacturing history found for "${searchQuery}". This appears to be a new or unique part.` :
                    'Search for a part to see intelligence insights.'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Archive Details Tab */}
        <TabsContent value="archives" className="space-y-4">
          {showArchiveTable && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Archive Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part Name</TableHead>
                        <TableHead>Lot Info</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Archive Type</TableHead>
                        <TableHead>Quality Score</TableHead>
                        <TableHead>Archived Date</TableHead>
                        <TableHead>Forms</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archives.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            {isLoading ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                                Loading manufacturing history...
                              </div>
                            ) : (
                              <div className="text-muted-foreground">
                                No archived jobs found. Archive a job to see manufacturing history here.
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        archives.map((archive) => (
                          <TableRow key={archive.id}>
                            <TableCell className="font-medium">
                              {archive.jobSnapshot.item.partName}
                            </TableCell>
                            <TableCell>
                              {archive.jobSnapshot.lotInfo ? (
                                <Badge variant="outline">
                                  Lot {archive.jobSnapshot.lotInfo.lotNumber}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">No lot info</span>
                              )}
                            </TableCell>
                            <TableCell>{archive.jobSnapshot.clientName}</TableCell>
                            <TableCell>
                              <Badge variant={archive.archiveType === 'completed' ? 'default' : 'secondary'}>
                                {archive.archiveType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {archive.performanceData.qualityScore ? 
                                <Badge variant={archive.performanceData.qualityScore >= 8 ? 'default' : 'secondary'}>
                                  {archive.performanceData.qualityScore.toFixed(1)}
                                </Badge> : 'N/A'
                              }
                            </TableCell>
                            <TableCell>
                              {new Date(archive.archiveDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {Object.keys(archive.completedForms).length} forms
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedArchive(archive);
                                  setDetailDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Archive Detail Dialog */}
      {selectedArchive && (
        <ArchiveDetailDialog
          archive={selectedArchive}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />
      )}
    </div>
  );

  // Return different layouts based on mode
  if (mode === 'dialog') {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {showTrigger && (
          <DialogTrigger asChild>
            <Button variant="outline">
              <History className="mr-2 h-4 w-4" />
              {triggerLabel}
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className={`max-w-7xl max-h-[90vh] overflow-y-auto ${className}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              {title || "Manufacturing History & Archive Intelligence"}
            </DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>
    );
  }

  // For panel and embedded modes, render content directly
  return renderContent();
}

// Archive Detail Dialog Component with full production document viewer
function ArchiveDetailDialog({ archive, open, onOpenChange }: {
  archive: JobArchive;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Complete Production Archive - {archive.jobSnapshot.item.partName}
            {archive.jobSnapshot.lotInfo && (
              <Badge variant="outline" className="ml-2">
                Lot {archive.jobSnapshot.lotInfo.lotNumber}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            View all manufacturing documents exactly as they were completed in production
          </DialogDescription>
        </DialogHeader>
        
        {/* Use the comprehensive ProductionDocumentViewer */}
        <ProductionDocumentViewer archive={archive} />
      </DialogContent>
    </Dialog>
  );
} 