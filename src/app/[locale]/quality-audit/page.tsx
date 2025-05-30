'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  TrendingUp,
  BarChart3,
  Target,
  ClipboardCheck,
  AlertCircle,
  Eye,
  Download,
  Printer
} from 'lucide-react';
import { getAllQualityTemplates, validateAS9100DCompliance } from '@/lib/quality-template-integration';
import { loadJobTasks } from '@/lib/firebase-tasks';
import type { JobTask, JobSubtask, QualityTemplate, AS9100DClause } from '@/types';

// Mock audit data for demo
const mockAuditData = {
  overallCompliance: 94.2,
  totalJobs: 15,
  compliantJobs: 14,
  nonCompliantJobs: 1,
  totalSubtasks: 128,
  compliantSubtasks: 121,
  nonCompliantSubtasks: 7,
  auditDate: '2024-01-15',
  auditor: 'Sarah Johnson, AS9100 Lead Auditor',
  nextAuditDue: '2024-07-15'
};

const mockNCRs = [
  {
    id: 'NCR-2024-001',
    title: 'Missing First Article Inspection Documentation',
    severity: 'Major',
    clause: '8.5.1',
    description: 'Job ORD-2024-003 lacks complete first article inspection records',
    status: 'Open',
    assignee: 'Quality Manager',
    dueDate: '2024-01-25',
    corrective_action: 'Implement mandatory FAI checklist validation'
  },
  {
    id: 'NCR-2024-002', 
    title: 'Calibration Records Out of Date',
    severity: 'Minor',
    clause: '7.1.5',
    description: 'CMM measurement equipment calibration expired',
    status: 'Closed',
    assignee: 'Metrology Technician',
    dueDate: '2024-01-20',
    corrective_action: 'Updated calibration schedule and performed recalibration'
  },
  {
    id: 'NCR-2024-003',
    title: 'Incomplete Risk Assessment Documentation',
    severity: 'Major',
    clause: '9.1.2',
    description: 'Risk assessment missing for new aerospace component design',
    status: 'In Progress',
    assignee: 'Design Engineer',
    dueDate: '2024-01-30',
    corrective_action: 'Complete FMEA analysis and update design controls'
  }
];

const as9100dClauses = [
  { clause: '4.1', title: 'Understanding the organization and its context', compliance: 100 },
  { clause: '4.2', title: 'Understanding the needs and expectations', compliance: 95 },
  { clause: '5.1', title: 'Leadership and commitment', compliance: 98 },
  { clause: '6.1', title: 'Actions to address risks and opportunities', compliance: 92 },
  { clause: '7.1', title: 'Resources', compliance: 88 },
  { clause: '8.1', title: 'Operational planning and control', compliance: 96 },
  { clause: '8.4', title: 'Control of externally provided processes', compliance: 90 },
  { clause: '8.5', title: 'Production and service provision', compliance: 94 },
  { clause: '9.1', title: 'Monitoring, measurement, analysis and evaluation', compliance: 85 },
  { clause: '10.1', title: 'Improvement', compliance: 89 }
];

function ComplianceOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-600">{mockAuditData.overallCompliance}%</p>
              <p className="text-sm text-muted-foreground">Overall Compliance</p>
            </div>
            <Shield className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-blue-600">{mockAuditData.compliantJobs}/{mockAuditData.totalJobs}</p>
              <p className="text-sm text-muted-foreground">Compliant Jobs</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-orange-600">{mockNCRs.filter(ncr => ncr.status === 'Open').length}</p>
              <p className="text-sm text-muted-foreground">Open NCRs</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-purple-600">{mockAuditData.nextAuditDue}</p>
              <p className="text-sm text-muted-foreground">Next Audit Due</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AS9100DClausesTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="mr-2 h-5 w-5" />
          AS9100D Clause Compliance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clause</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {as9100dClauses.map((item) => (
              <TableRow key={item.clause}>
                <TableCell className="font-mono font-medium">{item.clause}</TableCell>
                <TableCell>{item.title}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Progress value={item.compliance} className="w-24 h-2" />
                    <span className="text-sm font-medium">{item.compliance}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={item.compliance >= 95 ? 'default' : item.compliance >= 85 ? 'secondary' : 'destructive'}>
                    {item.compliance >= 95 ? 'Excellent' : item.compliance >= 85 ? 'Good' : 'Needs Attention'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NCRManagement() {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-300';
      case 'Major': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'Minor': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-red-100 text-red-700 border-red-300';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Closed': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" />
            Non-Conformance Reports (NCRs)
          </div>
          <Button size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Create NCR
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NCR ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>AS9100D Clause</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockNCRs.map((ncr) => (
              <TableRow key={ncr.id}>
                <TableCell className="font-mono font-medium">{ncr.id}</TableCell>
                <TableCell>{ncr.title}</TableCell>
                <TableCell className="font-mono">{ncr.clause}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getSeverityColor(ncr.severity)}>
                    {ncr.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(ncr.status)}>
                    {ncr.status}
                  </Badge>
                </TableCell>
                <TableCell>{ncr.assignee}</TableCell>
                <TableCell>{ncr.dueDate}</TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function QualityMetrics() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Quality Metrics Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>First Pass Yield</span>
                <span className="font-medium">96.8%</span>
              </div>
              <Progress value={96.8} className="h-2 mt-1" />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Customer Satisfaction</span>
                <span className="font-medium">98.2%</span>
              </div>
              <Progress value={98.2} className="h-2 mt-1" />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Delivery Performance</span>
                <span className="font-medium">94.5%</span>
              </div>
              <Progress value={94.5} className="h-2 mt-1" />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Process Capability</span>
                <span className="font-medium">99.1%</span>
              </div>
              <Progress value={99.1} className="h-2 mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Improvement Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Implement automated quality checks</p>
                <p className="text-xs text-muted-foreground">Reduce human error in inspection processes</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Enhance supplier quality program</p>
                <p className="text-xs text-muted-foreground">Improve incoming material quality</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Update training programs</p>
                <p className="text-xs text-muted-foreground">Ensure all staff current on AS9100D requirements</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function QualityAuditPage() {
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateAuditReport = () => {
    setIsLoading(true);
    // Simulate report generation
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Audit Report Generated",
        description: "AS9100D compliance report has been generated and is ready for download.",
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Audit Dashboard"
        description="AS9100D compliance monitoring, NCR management, and quality metrics"
        actions={
          <div className="flex space-x-2">
            <Button variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </Button>
            <Button onClick={handleGenerateAuditReport} disabled={isLoading}>
              <Download className="mr-2 h-4 w-4" />
              {isLoading ? 'Generating...' : 'Export Report'}
            </Button>
          </div>
        }
      />

      {/* Compliance Overview */}
      <ComplianceOverview />

      {/* Audit Information */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Audit Date</p>
              <p className="text-lg font-semibold">{mockAuditData.auditDate}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lead Auditor</p>
              <p className="text-lg font-semibold">{mockAuditData.auditor}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Certification Status</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className="bg-green-100 text-green-700">
                  <Shield className="mr-1 h-3 w-3" />
                  AS9100D Certified
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="clauses" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clauses">AS9100D Clauses</TabsTrigger>
          <TabsTrigger value="ncr">NCR Management</TabsTrigger>
          <TabsTrigger value="metrics">Quality Metrics</TabsTrigger>
          <TabsTrigger value="templates">Quality Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="clauses">
          <AS9100DClausesTable />
        </TabsContent>

        <TabsContent value="ncr">
          <NCRManagement />
        </TabsContent>

        <TabsContent value="metrics">
          <QualityMetrics />
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardCheck className="mr-2 h-5 w-5" />
                Quality Templates & Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getAllQualityTemplates().map((template) => (
                  <Card key={template.id} className="border">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                          <Badge variant="secondary" className="text-xs mt-2">
                            {template.id}
                          </Badge>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 