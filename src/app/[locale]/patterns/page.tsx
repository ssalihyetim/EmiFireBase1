'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Eye,
  Copy,
  Download,
  BarChart3,
  Factory,
  Users,
  Calendar
} from 'lucide-react';
import type { JobPattern, PatternSimilarity } from '@/types/archival';

// Mock data for demonstration
const mockPatterns: JobPattern[] = [
  {
    id: 'pattern_landing_gear_bracket_rev_a_1704067200000',
    patternName: 'Landing Gear Bracket - Rev A',
    sourceJobId: 'job_lg_bracket_001',
    partNumber: 'LG-BRACKET-001',
    revision: '2.1',
    
    frozenProcessData: {
      assignedProcesses: ['Turning', '3-Axis Milling', 'Heat Treatment', 'Anodizing'],
      processSequence: [
        {
          processName: 'Turning',
          orderIndex: 0,
          dependencies: [],
          estimatedDuration: 4.5,
          criticalControlPoints: ['Dimension tolerance ±0.005"']
        },
        {
          processName: '3-Axis Milling',
          orderIndex: 1,
          dependencies: ['Turning'],
          estimatedDuration: 6.0,
          criticalControlPoints: ['Surface finish Ra 1.6', 'Hole position ±0.002"']
        }
      ],
      taskTemplates: [],
      subtaskTemplates: [],
      criticalParameters: {
        materialType: 'AL-7075-T6',
        heatTreatment: 'T6',
        surfaceFinish: 'Anodized Type II'
      }
    },
    
    historicalPerformance: {
      avgDuration: 18.5,
      avgQualityScore: 9.2,
      successRate: 95.8,
      commonIssues: [],
      bestPractices: [
        'Use coolant flood for aluminum turning',
        'Verify heat treatment certification before anodizing',
        'Perform dimensional inspection after each operation'
      ]
    },
    
    qualitySignoff: {
      approvedBy: 'Quality Manager',
      approvalDate: '2024-01-01T10:00:00Z',
      qualityLevel: 'proven',
      complianceVerified: true
    },
    
    usage: {
      timesUsed: 24,
      successfulUses: 23,
      failedUses: 1,
      lastUsed: '2024-01-15T14:30:00Z',
      avgCustomerSatisfaction: 9.4
    },
    
    createdBy: 'Manufacturing Engineer',
    createdAt: '2024-01-01T10:00:00Z',
    lastUpdated: '2024-01-15T14:30:00Z',
    version: '2.1',
    status: 'active'
  },
  {
    id: 'pattern_engine_mount_precision_1704153600000',
    patternName: 'Engine Mount - Precision',
    sourceJobId: 'job_engine_mount_003',
    partNumber: 'ENG-MOUNT-003',
    revision: '1.0',
    
    frozenProcessData: {
      assignedProcesses: ['5-Axis Milling', 'Grinding', 'Heat Treatment'],
      processSequence: [
        {
          processName: '5-Axis Milling',
          orderIndex: 0,
          dependencies: [],
          estimatedDuration: 12.0,
          criticalControlPoints: ['Complex geometry tolerance ±0.001"']
        }
      ],
      taskTemplates: [],
      subtaskTemplates: [],
      criticalParameters: {
        materialType: 'TI-6AL-4V',
        heatTreatment: 'Solution + Age',
        surfaceFinish: 'Ground to 0.8 Ra'
      }
    },
    
    historicalPerformance: {
      avgDuration: 28.0,
      avgQualityScore: 9.8,
      successRate: 100.0,
      commonIssues: [],
      bestPractices: [
        'Use titanium-specific tooling',
        'Maintain constant feed rate',
        'Verify heat treatment cycle parameters'
      ]
    },
    
    qualitySignoff: {
      approvedBy: 'Senior Quality Engineer',
      approvalDate: '2024-01-05T15:30:00Z',
      qualityLevel: 'proven',
      complianceVerified: true
    },
    
    usage: {
      timesUsed: 8,
      successfulUses: 8,
      failedUses: 0,
      lastUsed: '2024-01-12T09:15:00Z',
      avgCustomerSatisfaction: 10.0
    },
    
    createdBy: 'Senior Manufacturing Engineer',
    createdAt: '2024-01-05T15:30:00Z',
    lastUpdated: '2024-01-12T09:15:00Z',
    version: '1.0',
    status: 'active'
  }
];

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<JobPattern[]>(mockPatterns);
  const [searchTerm, setSearchTerm] = useState('');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [processFilter, setProcessFilter] = useState<string>('all');
  const [selectedPattern, setSelectedPattern] = useState<JobPattern | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter patterns based on search and filters
  const filteredPatterns = patterns.filter(pattern => {
    const matchesSearch = pattern.patternName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pattern.partNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesQuality = qualityFilter === 'all' || pattern.qualitySignoff.qualityLevel === qualityFilter;
    
    const matchesProcess = processFilter === 'all' || 
                          pattern.frozenProcessData.assignedProcesses.includes(processFilter);
    
    return matchesSearch && matchesQuality && matchesProcess;
  });

  // Calculate statistics
  const stats = {
    totalPatterns: patterns.length,
    activePatterns: patterns.filter(p => p.status === 'active').length,
    avgSuccessRate: patterns.reduce((sum, p) => sum + p.historicalPerformance.successRate, 0) / patterns.length,
    totalUsage: patterns.reduce((sum, p) => sum + p.usage.timesUsed, 0)
  };

  const getQualityLevelColor = (level: string) => {
    switch (level) {
      case 'proven': return 'bg-green-100 text-green-800';
      case 'experimental': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manufacturing Patterns</h1>
          <p className="text-muted-foreground">
            Proven manufacturing processes for consistent quality production
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Factory className="mr-2 h-4 w-4" />
          Create New Pattern
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patterns</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatterns}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activePatterns} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgSuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Quality consistency
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Jobs created from patterns
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              New patterns created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patterns by name or part number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={qualityFilter} onValueChange={setQualityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Quality Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quality Levels</SelectItem>
                <SelectItem value="proven">Proven</SelectItem>
                <SelectItem value="experimental">Experimental</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={processFilter} onValueChange={setProcessFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Process Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Processes</SelectItem>
                <SelectItem value="Turning">Turning</SelectItem>
                <SelectItem value="3-Axis Milling">3-Axis Milling</SelectItem>
                <SelectItem value="4-Axis Milling">4-Axis Milling</SelectItem>
                <SelectItem value="5-Axis Milling">5-Axis Milling</SelectItem>
                <SelectItem value="Grinding">Grinding</SelectItem>
                <SelectItem value="Heat Treatment">Heat Treatment</SelectItem>
                <SelectItem value="Anodizing">Anodizing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Patterns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatterns.map((pattern) => (
          <Card key={pattern.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{pattern.patternName}</CardTitle>
                  <CardDescription className="text-sm">
                    {pattern.partNumber} • Rev {pattern.revision}
                  </CardDescription>
                </div>
                <Badge className={getQualityLevelColor(pattern.qualitySignoff.qualityLevel)}>
                  {pattern.qualitySignoff.qualityLevel}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span className="font-medium">Quality</span>
                  </div>
                  <div className="text-lg font-bold">
                    {pattern.historicalPerformance.avgQualityScore.toFixed(1)}/10
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="font-medium">Success</span>
                  </div>
                  <div className="text-lg font-bold">
                    {pattern.historicalPerformance.successRate.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Process Summary */}
              <div>
                <div className="text-sm font-medium mb-2">Processes</div>
                <div className="flex flex-wrap gap-1">
                  {pattern.frozenProcessData.assignedProcesses.map((process) => (
                    <Badge key={process} variant="secondary" className="text-xs">
                      {process}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Usage Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Used {pattern.usage.timesUsed} times</div>
                <div>Last used {formatDate(pattern.usage.lastUsed)}</div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setSelectedPattern(pattern)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{pattern.patternName}</DialogTitle>
                      <DialogDescription>
                        Manufacturing pattern details and performance history
                      </DialogDescription>
                    </DialogHeader>
                    
                    {selectedPattern && (
                      <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="processes">Processes</TabsTrigger>
                          <TabsTrigger value="performance">Performance</TabsTrigger>
                          <TabsTrigger value="quality">Quality</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="overview" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium">Basic Information</h4>
                              <div className="space-y-2 text-sm">
                                <div>Part Number: {selectedPattern.partNumber}</div>
                                <div>Version: {selectedPattern.version}</div>
                                <div>Created: {formatDate(selectedPattern.createdAt)}</div>
                                <div>Created by: {selectedPattern.createdBy}</div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium">Usage Statistics</h4>
                              <div className="space-y-2 text-sm">
                                <div>Times Used: {selectedPattern.usage.timesUsed}</div>
                                <div>Successful: {selectedPattern.usage.successfulUses}</div>
                                <div>Failed: {selectedPattern.usage.failedUses}</div>
                                <div>Last Used: {formatDate(selectedPattern.usage.lastUsed)}</div>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="processes" className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-3">Manufacturing Processes</h4>
                            <div className="space-y-3">
                              {selectedPattern.frozenProcessData.processSequence.map((process, index) => (
                                <div key={index} className="border rounded-lg p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <h5 className="font-medium">{process.processName}</h5>
                                    <Badge variant="outline">
                                      {process.estimatedDuration}h
                                    </Badge>
                                  </div>
                                  {process.criticalControlPoints.length > 0 && (
                                    <div>
                                      <div className="text-sm font-medium text-orange-600 mb-1">
                                        Critical Control Points:
                                      </div>
                                      <ul className="text-sm space-y-1">
                                        {process.criticalControlPoints.map((point, i) => (
                                          <li key={i} className="flex items-center gap-2">
                                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                                            {point}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="performance" className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Avg Duration</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">
                                  {selectedPattern.historicalPerformance.avgDuration}h
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Quality Score</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">
                                  {selectedPattern.historicalPerformance.avgQualityScore.toFixed(1)}/10
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Success Rate</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">
                                  {selectedPattern.historicalPerformance.successRate.toFixed(1)}%
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                          
                          {selectedPattern.historicalPerformance.bestPractices.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-3">Best Practices</h4>
                              <ul className="space-y-2">
                                {selectedPattern.historicalPerformance.bestPractices.map((practice, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                    <span className="text-sm">{practice}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="quality" className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-3">Quality Signoff</h4>
                            <div className="border rounded-lg p-4 space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm font-medium">Approved By</div>
                                  <div>{selectedPattern.qualitySignoff.approvedBy}</div>
                                </div>
                                <div>
                                  <div className="text-sm font-medium">Approval Date</div>
                                  <div>{formatDate(selectedPattern.qualitySignoff.approvalDate)}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Badge className={getQualityLevelColor(selectedPattern.qualitySignoff.qualityLevel)}>
                                    {selectedPattern.qualitySignoff.qualityLevel}
                                  </Badge>
                                </div>
                                {selectedPattern.qualitySignoff.complianceVerified && (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-sm">AS9100D Compliant</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}
                  </DialogContent>
                </Dialog>
                
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Copy className="mr-1 h-3 w-3" />
                  Use Pattern
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredPatterns.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Factory className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No patterns found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or create a new pattern.
            </p>
            <Button>Create New Pattern</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 