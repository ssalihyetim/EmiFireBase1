"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order, Job, JobStatus, Attachment, OrderFirestoreData, JobTask } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Layers, MoreHorizontal, PlayCircle, PauseCircle, CheckCircle2, AlertTriangle, XCircle, ListChecks, Paperclip, Loader2, Cog, CheckSquare, Clock, TestTube, Settings, Factory, Package, Trash2, Archive, History, Search, Eye, FileText, BarChart3, Award, Calendar, User, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { useTranslations } from "next-intl";
import { generateJobTasks, calculateJobProgress } from "@/lib/task-automation";
import { saveJobTasks, loadJobTasks, jobHasTasks, cleanupCorruptedTimestamps, hasCorruptedTimestamps } from "@/lib/firebase-tasks";
import { loadAllJobs } from "@/lib/firebase-jobs";
import { testFirebaseConnection } from "@/lib/firebase-test";
import OrderToJobConverter from "@/components/jobs/OrderToJobConverter";
import JobTaskDisplay from "@/components/jobs/JobTaskDisplay";
import { archiveCompletedJob, searchJobArchives, calculateArchiveStatistics } from "@/lib/job-archival";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JobArchive, ArchiveSearchCriteria } from "@/types/archival";
import PatternCreationDialog from "@/components/quality/PatternCreationDialog";
import { LotNumberDisplay } from "@/components/jobs/LotNumberInput";
import UnifiedArchiveInterface from "@/components/manufacturing/UnifiedArchiveInterface";

const ORDERS_COLLECTION_NAME = "orders";

const JobStatusIconMap: Record<JobStatus, React.ElementType> = {
  Pending: AlertTriangle,
  "In Progress": PlayCircle,
  "Awaiting Next Process": PauseCircle,
  Completed: CheckCircle2,
  "On Hold": PauseCircle,
  Blocked: XCircle,
};

function JobStatusBadge({ status }: { status: JobStatus }) {
  const Icon = JobStatusIconMap[status];
  
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  if (status === "Completed") variant = "default";
  else if (status === "Blocked" || status === "On Hold") variant = "destructive";
  else if (status === "In Progress") variant = "outline";
  
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}

function AssignedProcessesList({ processes }: { processes?: string[] }) {
  if (!processes || processes.length === 0) {
    return <span className="text-xs text-muted-foreground">N/A</span>;
  }
  
  // Processes that have task automation support
  const automationProcesses = ['Turning', '3-Axis Milling', '4-Axis Milling', '5-Axis Milling', 'Grinding', 'Anodizing', 'Heat Treatment'];
  
  return (
    <div className="flex flex-wrap gap-1">
      {processes.map((process, idx) => {
        const hasAutomation = automationProcesses.includes(process);
        return (
          <Badge 
            key={idx} 
            variant="secondary" 
            className={`text-xs ${hasAutomation ? 'bg-blue-100 text-blue-700 border-blue-300' : ''}`}
            title={hasAutomation ? 'Task automation available' : 'Manual process'}
          >
            {process}
            {hasAutomation && <Cog className="h-3 w-3 ml-1" />}
          </Badge>
        );
      })}
    </div>
  );
}

function AttachmentsList({ attachments }: { attachments?: Attachment[] }) {
  if (!attachments || attachments.length === 0) {
    return <span className="text-xs text-muted-foreground">None</span>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      {attachments.map((attachment, idx) => (
        <div key={idx} className="flex items-center text-xs">
          <Paperclip className="h-3 w-3 mr-1 text-muted-foreground" />
          <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{attachment.name}</a>
        </div>
      ))}
    </div>
  );
}

// Task Progress Component
function TaskProgressDisplay({ progress, tasks }: { 
  progress: ReturnType<typeof calculateJobProgress> | null;
  tasks?: JobTask[];
}) {
  if (!progress) {
    return <span className="text-xs text-muted-foreground">No tasks</span>;
  }

  const manufacturingTasks = tasks?.filter(t => t.category === 'manufacturing_process') || [];
  const supportTasks = tasks?.filter(t => t.category === 'non_manufacturing_task') || [];
  const scheduledTasks = tasks?.filter(t => t.scheduledMachineId) || [];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress.overallProgress}%` }}
          />
        </div>
        <span className="text-xs font-medium">{progress.overallProgress}%</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {progress.completedTasks}/{progress.totalTasks} tasks • {progress.completedSubtasks}/{progress.totalSubtasks} subtasks
      </div>
      {tasks && (
        <div className="flex gap-2 text-xs">
          <span className="text-blue-600">{manufacturingTasks.length} mfg</span>
          <span className="text-green-600">{supportTasks.length} support</span>
          {scheduledTasks.length > 0 && (
            <span className="text-purple-600">{scheduledTasks.length} scheduled</span>
          )}
        </div>
      )}
    </div>
  );
}

// Task Actions Component
function TaskActionsCell({ 
  job, 
  hasTasks, 
  isGenerating, 
  onGenerateTasks, 
  onViewTasks,
  tasks,
  onCreatePattern,
  isPatternEligible,
  onManualComplete,
  canManualComplete
}: { 
  job: Job;
  hasTasks: boolean;
  isGenerating: boolean;
  onGenerateTasks: (job: Job) => void;
  onViewTasks: (job: Job) => void;
  tasks?: JobTask[];
  onCreatePattern?: (job: Job) => void;
  isPatternEligible?: boolean;
  onManualComplete?: (job: Job) => void;
  canManualComplete?: boolean;
}) {
  const manufacturingTasks = tasks?.filter(t => t.category === 'manufacturing_process') || [];
  const hasScheduledTasks = tasks?.some(t => t.scheduledMachineId) || false;

  return (
    <div className="flex gap-1">
      {!hasTasks ? (
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onGenerateTasks(job)}
          disabled={isGenerating}
          className="text-xs"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Cog className="h-3 w-3 mr-1" />
              Generate Unified Tasks
            </>
          )}
        </Button>
      ) : (
        <div className="flex gap-1">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onViewTasks(job)}
            className="text-xs"
          >
            <CheckSquare className="h-3 w-3 mr-1" />
            View Tasks
            {tasks && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {tasks.length}
              </Badge>
            )}
          </Button>
          {manufacturingTasks.length > 0 && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.location.href = `/en/jobs/${job.id}/operations`}
              className="text-xs"
              title={`${manufacturingTasks.length} manufacturing operations`}
            >
              <Settings className="h-3 w-3 mr-1" />
              Operations
              <Badge variant="secondary" className="ml-1 text-xs">
                {manufacturingTasks.length}
              </Badge>
            </Button>
          )}
          {canManualComplete && onManualComplete && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onManualComplete(job)}
              className="text-xs bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 hover:from-green-100 hover:to-emerald-100"
              title="Mark job as completed manually"
            >
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
              Complete
            </Button>
          )}
          {isPatternEligible && onCreatePattern && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onCreatePattern(job)}
              className="text-xs bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 hover:from-yellow-100 hover:to-amber-100"
              title="Create manufacturing pattern from this completed job"
            >
              <Award className="h-3 w-3 mr-1 text-yellow-600" />
              Create Pattern
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Add Archive History Dialog Component
function ArchiveHistoryDialog() {
  return (
    <UnifiedArchiveInterface
      mode="dialog"
      title="Manufacturing History & Archives"
      description="Search and analyze historical manufacturing data to make informed production decisions"
      triggerLabel="Manufacturing History"
      showStatistics={true}
      showIntelligence={true}
      showArchiveTable={true}
      enableSearch={true}
    />
  );
}

// Form Detail Viewer Component
function FormDetailDialog({ form, open, onOpenChange }: {
  form: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {form.formType?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} - {form.formId}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Form Header Info */}
          <Card>
            <CardHeader>
              <CardTitle>Form Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <strong>Form Type:</strong> {form.formType?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </div>
              <div>
                <strong>Completed By:</strong> {form.completedBy}
              </div>
              <div>
                <strong>Date:</strong> {new Date(form.completedAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          {/* Form Data Content */}
          <Card>
            <CardHeader>
              <CardTitle>Form Content</CardTitle>
            </CardHeader>
            <CardContent>
              {form.formType === 'routing_sheet' && form.formData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><strong>Part Name:</strong> {form.formData.partName}</div>
                    <div><strong>Quantity:</strong> {form.formData.quantity}</div>
                    <div><strong>Material:</strong> {form.formData.material}</div>
                    <div><strong>Processes:</strong> {form.formData.processes?.join(', ')}</div>
                  </div>
                  
                  {form.formData.routingSequence && (
                    <div>
                      <h4 className="font-medium mb-2">Routing Sequence:</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border border-gray-200 text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border p-2">Op</th>
                              <th className="border p-2">Process</th>
                              <th className="border p-2">Machine</th>
                              <th className="border p-2">Setup (min)</th>
                              <th className="border p-2">Cycle (min)</th>
                              <th className="border p-2">Est. Time (h)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {form.formData.routingSequence.map((op: any, idx: number) => (
                              <tr key={idx}>
                                <td className="border p-2">{op.operation}</td>
                                <td className="border p-2">{op.processType}</td>
                                <td className="border p-2">{op.machineType}</td>
                                <td className="border p-2">{op.setupTime}</td>
                                <td className="border p-2">{op.cycleTime}</td>
                                <td className="border p-2">{op.estimatedTime}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {form.formType === 'setup_sheet' && form.formData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><strong>Operation:</strong> {form.formData.operationNumber}</div>
                    <div><strong>Process:</strong> {form.formData.processType}</div>
                    <div><strong>Part:</strong> {form.formData.partName}</div>
                    <div><strong>Machine:</strong> {form.formData.machineName}</div>
                  </div>
                  
                  {form.formData.setupInstructions && (
                    <div>
                      <h4 className="font-medium mb-2">Setup Instructions:</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {form.formData.setupInstructions.map((instruction: string, idx: number) => (
                          <li key={idx} className="text-sm">{instruction}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  
                  {form.formData.toolOffsets && (
                    <div>
                      <h4 className="font-medium mb-2">Tool Offsets:</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border border-gray-200 text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border p-2">Tool</th>
                              <th className="border p-2">Description</th>
                              <th className="border p-2">X Offset</th>
                              <th className="border p-2">Z Offset</th>
                            </tr>
                          </thead>
                          <tbody>
                            {form.formData.toolOffsets.map((tool: any, idx: number) => (
                              <tr key={idx}>
                                <td className="border p-2">{tool.toolNumber}</td>
                                <td className="border p-2">{tool.description}</td>
                                <td className="border p-2">{tool.xOffset}</td>
                                <td className="border p-2">{tool.zOffset}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {form.formType === 'tool_list' && form.formData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><strong>Operation:</strong> {form.formData.operationNumber}</div>
                    <div><strong>Process:</strong> {form.formData.processType}</div>
                  </div>
                  
                  {form.formData.tools && (
                    <div>
                      <h4 className="font-medium mb-2">Tools Required:</h4>
                      <div className="space-y-3">
                        {form.formData.tools.map((tool: any, idx: number) => (
                          <div key={idx} className="border rounded p-3 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <div><strong>Tool:</strong> {tool.toolNumber} - {tool.description}</div>
                              <div><strong>Manufacturer:</strong> {tool.manufacturer}</div>
                              <div><strong>Part Number:</strong> {tool.partNumber}</div>
                              <div><strong>Location:</strong> {tool.location}</div>
                              <div><strong>Condition:</strong> 
                                <Badge variant={tool.condition === 'Good' ? 'default' : 'destructive'} className="ml-1">
                                  {tool.condition}
                                </Badge>
                              </div>
                              <div><strong>Next Inspection:</strong> {new Date(tool.nextInspection).toLocaleDateString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {form.formType === 'fai_report' && form.formData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><strong>Part:</strong> {form.formData.partName}</div>
                    <div><strong>Revision:</strong> {form.formData.revisionLevel}</div>
                    <div><strong>Lot Number:</strong> {form.formData.lotNumber}</div>
                    <div><strong>Quantity:</strong> {form.formData.quantity}</div>
                    <div><strong>Inspector:</strong> {form.completedBy}</div>
                    <div><strong>Overall Result:</strong> 
                      <Badge variant={form.formData.overallResult === 'ACCEPTED' ? 'default' : 'destructive'} className="ml-1">
                        {form.formData.overallResult}
                      </Badge>
                    </div>
                  </div>
                  
                  {form.formData.dimensionalChecks && (
                    <div>
                      <h4 className="font-medium mb-2">Dimensional Checks:</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border border-gray-200 text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border p-2">Characteristic</th>
                              <th className="border p-2">Nominal</th>
                              <th className="border p-2">Tolerance</th>
                              <th className="border p-2">Actual</th>
                              <th className="border p-2">Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {form.formData.dimensionalChecks.map((check: any, idx: number) => (
                              <tr key={idx}>
                                <td className="border p-2">{check.characteristic}</td>
                                <td className="border p-2">{check.nominal}</td>
                                <td className="border p-2">{check.tolerance}</td>
                                <td className="border p-2">{check.actual}</td>
                                <td className="border p-2">
                                  <Badge variant={check.result === 'PASS' ? 'default' : 'destructive'}>
                                    {check.result}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {form.formData.functionalTests && (
                    <div>
                      <h4 className="font-medium mb-2">Functional Tests:</h4>
                      <div className="space-y-2">
                        {form.formData.functionalTests.map((test: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <strong>{test.test}:</strong> {test.requirement}
                            </div>
                            <Badge variant={test.result === 'PASS' ? 'default' : 'destructive'}>
                              {test.result}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Generic form data display for any other form types */}
              {!['routing_sheet', 'setup_sheet', 'tool_list', 'fai_report'].includes(form.formType) && (
                <div>
                  <h4 className="font-medium mb-2">Form Data:</h4>
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(form.formData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signatures */}
          {form.signatures && Object.keys(form.signatures).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Signatures & Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(form.signatures).map(([role, name]) => (
                    <div key={role} className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <div>
                        <div className="text-sm font-medium">{role.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                        <div className="text-sm text-muted-foreground">{String(name)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Archive Detail Viewer Component
function ArchiveDetailDialog({ archive, open, onOpenChange }: { 
  archive: JobArchive; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [formDetailOpen, setFormDetailOpen] = useState(false);
  const [regeneratedForms, setRegeneratedForms] = useState<{
    routingSheets: any[];
    setupSheets: any[];
    toolLists: any[];
    faiReports: any[];
    inspectionRecords: any[];
    totalForms: number;
  } | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Check if forms are empty and regenerate if needed
  const handleRegenerateForms = async () => {
    setIsRegenerating(true);
    try {
      const { regenerateFormsFromArchiveData } = await import('@/lib/job-archival');
      const regenerated = await regenerateFormsFromArchiveData(archive);
      setRegeneratedForms(regenerated);
      console.log(`✅ Regenerated ${regenerated.totalForms} forms from archive data`);
    } catch (error) {
      console.error('Failed to regenerate forms:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Get forms to display (handle different structures)
  const getRoutingSheet = () => {
    if (regeneratedForms?.routingSheets?.[0]) return regeneratedForms.routingSheets[0];
    return archive.completedForms.routingSheet;
  };
  
  const getSetupSheets = () => {
    if (regeneratedForms?.setupSheets) return regeneratedForms.setupSheets;
    return archive.completedForms.setupSheets || [];
  };
  
  const getToolLists = () => {
    if (regeneratedForms?.toolLists) return regeneratedForms.toolLists;
    return archive.completedForms.toolLists || [];
  };
  
  const getFaiReports = () => {
    if (regeneratedForms?.faiReports) return regeneratedForms.faiReports;
    return archive.completedForms.faiReports || [];
  };

  const hasNoOriginalForms = !archive.completedForms.routingSheet?.formData ||
    Object.keys(archive.completedForms.routingSheet?.formData || {}).length === 0 ||
    (archive.completedForms.setupSheets?.length || 0) === 0 ||
    (archive.completedForms.toolLists?.length || 0) === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Manufacturing Archive: {archive.jobSnapshot.item.partName}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="job-data">Job Data</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">Part Info</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Part:</strong> {archive.jobSnapshot.item.partName}</div>
                                         <div><strong>Part #:</strong> {archive.jobSnapshot.item.partName || 'N/A'}</div>
                    <div><strong>Material:</strong> {archive.jobSnapshot.item.rawMaterialType}</div>
                    <div><strong>Quantity:</strong> {archive.jobSnapshot.item.quantity}</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="font-medium">Performance</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Quality Score:</strong> 
                      <Badge variant={archive.performanceData.qualityScore >= 8 ? 'default' : 'secondary'} className="ml-2">
                        {archive.performanceData.qualityScore.toFixed(1)}/10
                      </Badge>
                    </div>
                    <div><strong>Efficiency:</strong> {archive.performanceData.efficiencyRating.toFixed(1)}/10</div>
                    <div><strong>Duration:</strong> {archive.performanceData.totalDuration.toFixed(1)} hours</div>
                    <div><strong>On Time:</strong> 
                      <Badge variant={archive.performanceData.onTimeDelivery ? 'default' : 'destructive'} className="ml-2">
                        {archive.performanceData.onTimeDelivery ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Archive Info</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Type:</strong> 
                      <Badge variant={archive.archiveType === 'completed' ? 'default' : 'secondary'} className="ml-2">
                        {archive.archiveType}
                      </Badge>
                    </div>
                    <div><strong>Archived:</strong> {new Date(archive.archiveDate).toLocaleDateString()}</div>
                    <div><strong>By:</strong> {archive.archivedBy}</div>
                    <div><strong>Reason:</strong> {archive.archiveReason}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Job Data Tab */}
          <TabsContent value="job-data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Complete Job Snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Job Details</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Job ID:</strong> {archive.jobSnapshot.id}</div>
                      <div><strong>Order #:</strong> {archive.jobSnapshot.orderNumber}</div>
                      <div><strong>Client:</strong> {archive.jobSnapshot.clientName}</div>
                      <div><strong>Status:</strong> 
                        <Badge className="ml-2">{archive.jobSnapshot.status}</Badge>
                      </div>
                      <div><strong>Priority:</strong> {archive.jobSnapshot.priority || 'Normal'}</div>
                      <div><strong>Due Date:</strong> {archive.jobSnapshot.dueDate || 'Not set'}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Manufacturing Processes</h4>
                    <div className="space-y-1">
                      {archive.jobSnapshot.item.assignedProcesses?.map((process, idx) => (
                        <Badge key={idx} variant="outline" className="mr-1 mb-1">
                          {process}
                        </Badge>
                      ))}
                    </div>
                    
                    {archive.jobSnapshot.specialInstructions && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Special Instructions</h4>
                        <p className="text-sm bg-gray-50 p-2 rounded">
                          {archive.jobSnapshot.specialInstructions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manufacturing Tasks ({archive.taskSnapshot.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {archive.taskSnapshot.map((task, idx) => (
                    <div key={idx} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                                               <h4 className="font-medium">{task.name || `Task ${idx + 1}`}</h4>
                       <div className="flex gap-2">
                         <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                           {task.status}
                         </Badge>
                          {task.priority && (
                            <Badge variant="outline">{task.priority}</Badge>
                          )}
                        </div>
                      </div>
                                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                         <div>
                           <strong>Category:</strong> {task.category}
                         </div>
                         <div>
                           <strong>Type:</strong> {task.manufacturingProcessType || task.nonManufacturingTaskType || 'N/A'}
                         </div>
                         <div>
                           <strong>Duration:</strong> {task.estimatedDurationHours || 0}h
                         </div>
                       </div>
                       {task.scheduledMachineName && (
                         <div className="mt-2 text-sm">
                           <strong>Machine:</strong> {task.scheduledMachineName}
                         </div>
                       )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Forms Tab */}
          <TabsContent value="forms" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Manufacturing Forms & Documentation</CardTitle>
                  {hasNoOriginalForms && !regeneratedForms && (
                    <Button 
                      onClick={handleRegenerateForms} 
                      disabled={isRegenerating}
                      variant="outline"
                      size="sm"
                    >
                      {isRegenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Extract Forms from Archive
                        </>
                      )}
                    </Button>
                  )}
                  {regeneratedForms && (
                    <Badge variant="secondary">
                      {regeneratedForms.totalForms} forms extracted from archive
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Routing Sheet */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Routing Sheet
                      {regeneratedForms && (
                        <Badge variant="outline" className="text-xs ml-2">Extracted</Badge>
                      )}
                    </h4>
                                         {getRoutingSheet() ? (
                      <div 
                        className="bg-gray-50 p-3 rounded text-sm cursor-pointer hover:bg-blue-50 border-2 border-transparent hover:border-blue-200 transition-colors"
                        onClick={() => {
                          setSelectedForm(getRoutingSheet());
                          setFormDetailOpen(true);
                        }}
                      >
                        <div><strong>Completed by:</strong> {getRoutingSheet()?.completedBy}</div>
                        <div><strong>Date:</strong> {new Date(getRoutingSheet()?.completedAt || '').toLocaleDateString()}</div>
                        <div><strong>Form ID:</strong> {getRoutingSheet()?.formId}</div>
                        {regeneratedForms && <div className="text-xs text-green-600 mt-1">🔄 Extracted from archive</div>}
                        <div className="text-xs text-blue-600 mt-1">Click to view details →</div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">No routing sheet</div>
                    )}
                  </div>
                  
                  {/* Setup Sheets */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Setup Sheets ({getSetupSheets().length})
                      {regeneratedForms && (
                        <Badge variant="outline" className="text-xs ml-2">Extracted</Badge>
                      )}
                    </h4>
                    <div className="space-y-2">
                                             {getSetupSheets().slice(0, 3).map((sheet, idx) => (
                        <div 
                          key={idx} 
                          className="bg-gray-50 p-2 rounded text-sm cursor-pointer hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                          onClick={() => {
                            setSelectedForm(sheet);
                            setFormDetailOpen(true);
                          }}
                        >
                          <div><strong>Sheet:</strong> {sheet.formId}</div>
                          <div><strong>By:</strong> {sheet.completedBy}</div>
                          <div className="text-xs text-blue-600 mt-1">Click to view →</div>
                        </div>
                      ))}
                      {getSetupSheets().length > 3 && (
                        <div className="text-sm text-muted-foreground">
                          +{getSetupSheets().length - 3} more sheets...
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Tool Lists */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Cog className="h-4 w-4" />
                      Tool Lists ({getToolLists().length})
                      {regeneratedForms && (
                        <Badge variant="outline" className="text-xs ml-2">Extracted</Badge>
                      )}
                    </h4>
                    <div className="space-y-2">
                                           {getToolLists().slice(0, 2).map((list, idx) => (
                      <div 
                        key={idx} 
                        className="bg-gray-50 p-2 rounded text-sm cursor-pointer hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                        onClick={() => {
                          setSelectedForm(list);
                          setFormDetailOpen(true);
                        }}
                      >
                        <div><strong>List:</strong> {list.formId}</div>
                        <div><strong>By:</strong> {list.completedBy}</div>
                        <div className="text-xs text-blue-600 mt-1">Click to view →</div>
                      </div>
                    ))}
                    </div>
                  </div>
                  
                  {/* FAI Reports */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      FAI Reports ({getFaiReports().length})
                      {regeneratedForms && (
                        <Badge variant="outline" className="text-xs ml-2">Extracted</Badge>
                      )}
                    </h4>
                    <div className="space-y-2">
                                          {getFaiReports().map((report, idx) => (
                      <div 
                        key={idx} 
                        className="bg-gray-50 p-2 rounded text-sm cursor-pointer hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                        onClick={() => {
                          setSelectedForm(report);
                          setFormDetailOpen(true);
                        }}
                      >
                        <div><strong>Report:</strong> {report.formId}</div>
                        <div><strong>Inspector:</strong> {report.completedBy}</div>
                        <div><strong>Date:</strong> {new Date(report.completedAt).toLocaleDateString()}</div>
                        <div className="text-xs text-blue-600 mt-1">Click to view details →</div>
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Quality Tab */}
          <TabsContent value="quality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality & Compliance Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Quality Results</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>All Inspections Passed:</span>
                        <Badge variant={archive.qualityData.allInspectionsPassed ? 'default' : 'destructive'}>
                          {archive.qualityData.allInspectionsPassed ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Final Quality Score:</span>
                        <Badge variant={archive.qualityData.finalQualityScore >= 8 ? 'default' : 'secondary'}>
                          {archive.qualityData.finalQualityScore.toFixed(1)}/10
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Customer Acceptance:</span>
                        <Badge variant={archive.qualityData.customerAcceptance ? 'default' : 'destructive'}>
                          {archive.qualityData.customerAcceptance ? 'Accepted' : 'Rejected'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Issues & Lessons</h4>
                    <div className="space-y-3">
                      {archive.performanceData.issuesEncountered?.length > 0 ? (
                        <div>
                          <strong className="text-sm">Issues ({archive.performanceData.issuesEncountered.length}):</strong>
                          <div className="space-y-1 mt-1">
                            {archive.performanceData.issuesEncountered.slice(0, 3).map((issue, idx) => (
                              <div key={idx} className="bg-red-50 p-2 rounded text-sm">
                                <div className="font-medium">{issue.type} - {issue.severity}</div>
                                <div>{issue.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No issues encountered</div>
                      )}
                      
                      {archive.performanceData.lessonsLearned?.length > 0 && (
                        <div>
                          <strong className="text-sm">Lessons Learned:</strong>
                          <ul className="mt-1 space-y-1">
                            {archive.performanceData.lessonsLearned.map((lesson, idx) => (
                              <li key={idx} className="text-sm bg-green-50 p-2 rounded">
                                {lesson}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quality Assessment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Quality Assessment Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                {archive.taskSnapshot?.length > 0 ? (
                  <div className="space-y-4">
                    {archive.taskSnapshot
                      .filter(task => task.status === 'completed')
                      .map((task, idx) => {
                        // For now, we'll use mock quality data since the actual performance data structure 
                        // needs to be properly integrated. This shows the UI structure for quality data.
                        const mockQualityData = {
                          score: archive.performanceData?.qualityScore || 8,
                          inspectionType: 'final' as const,
                          result: 'pass' as const,
                          inspectedBy: 'Quality Inspector',
                          inspectionDate: new Date().toISOString(),
                          notes: `Quality assessment completed for ${task.name}. All specifications met.`,
                          photos: [] as string[],
                          measurements: [] as any[]
                        };
                        
                        return (
                          <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium">{task.name}</h5>
                              <Badge variant={mockQualityData.score >= 8 ? 'default' : 'secondary'}>
                                {mockQualityData.score.toFixed(1)}/10
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Quality Assessment Details */}
                              <div className="space-y-2">
                                <div className="text-sm">
                                  <span className="font-medium">Inspection Type:</span> {mockQualityData.inspectionType}
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium">Result:</span> 
                                  <Badge variant={mockQualityData.result === 'pass' ? 'default' : 'destructive'} className="ml-2">
                                    {mockQualityData.result.toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium">Inspector:</span> {mockQualityData.inspectedBy}
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium">Date:</span> {new Date(mockQualityData.inspectionDate).toLocaleString()}
                                </div>
                              </div>
                              
                              {/* Operator Notes from Quality Dialog */}
                              <div className="space-y-2">
                                {mockQualityData.notes && (
                                  <div>
                                    <div className="text-sm font-medium mb-1">Inspector Notes:</div>
                                    <div className="bg-blue-50 p-2 rounded text-sm border-l-4 border-blue-400">
                                      {mockQualityData.notes}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Placeholder for when actual quality photos are implemented */}
                                <div>
                                  <div className="text-sm font-medium mb-1">Quality Photos:</div>
                                  <div className="bg-green-50 p-2 rounded text-xs text-green-700">
                                    📷 Quality photos will appear here when captured during task completion
                                  </div>
                                </div>
                                
                                {/* Placeholder for dimensional measurements */}
                                <div>
                                  <div className="text-sm font-medium mb-1">Dimensional Measurements:</div>
                                  <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-700">
                                    📏 Dimensional measurements will appear here when recorded
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Additional Archive-Specific Quality Info */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="text-xs text-gray-500 space-y-1">
                                <div><strong>Archive Note:</strong> This task was completed as part of archived job {archive.originalJobId}</div>
                                <div><strong>Overall Job Quality:</strong> {archive.qualityData.finalQualityScore.toFixed(1)}/10</div>
                                <div><strong>AS9100D Compliance:</strong> {archive.qualityData.allInspectionsPassed ? '✓ Passed' : '✗ Failed'}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-center py-8">
                    No task quality data available in this archive
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded">
                    <div className="text-sm text-muted-foreground">Total Duration</div>
                    <div className="text-2xl font-bold">{archive.performanceData.totalDuration.toFixed(1)}h</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded">
                    <div className="text-sm text-muted-foreground">Quality Score</div>
                    <div className="text-2xl font-bold">{archive.performanceData.qualityScore.toFixed(1)}/10</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded">
                    <div className="text-sm text-muted-foreground">Efficiency</div>
                    <div className="text-2xl font-bold">{archive.performanceData.efficiencyRating.toFixed(1)}/10</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded">
                    <div className="text-sm text-muted-foreground">On-Time Delivery</div>
                    <div className="text-2xl font-bold">{archive.performanceData.onTimeDelivery ? '✓' : '✗'}</div>
                  </div>
                </div>
                
                {archive.financialData && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Financial Performance</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Estimated Cost</div>
                        <div className="font-medium">${archive.financialData.estimatedCost.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Actual Cost</div>
                        <div className="font-medium">${archive.financialData.actualCost.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Cost Variance</div>
                        <div className={`font-medium ${archive.financialData.costVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {archive.financialData.costVariance > 0 ? '+' : ''}{archive.financialData.costVariance.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Profitability</div>
                        <div className={`font-medium ${archive.financialData.profitability < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {archive.financialData.profitability.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
      
      {/* Form Detail Dialog */}
      {selectedForm && (
        <FormDetailDialog
          form={selectedForm}
          open={formDetailOpen}
          onOpenChange={setFormDetailOpen}
        />
      )}
    </Dialog>
  );
}

export default function JobsPage() {
  const t = useTranslations('JobsPage');
  const { toast } = useToast();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [jobTasks, setJobTasks] = useState<Record<string, JobTask[]>>({});
  const [taskGenerationLoading, setTaskGenerationLoading] = useState<Record<string, boolean>>({});
  const [showTableView, setShowTableView] = useState(false);
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  
  // Pattern creation state
  const [patternCreationJob, setPatternCreationJob] = useState<Job | null>(null);
  const [isPatternDialogOpen, setIsPatternDialogOpen] = useState(false);

  const handleGenerateTasks = async (job: Job) => {
    if (taskGenerationLoading[job.id]) return;
    
    setTaskGenerationLoading(prev => ({ ...prev, [job.id]: true }));
    
    try {
      console.log('=== DEBUGGING TASK GENERATION ===');
      console.log('Generating unified tasks for job:', job.id);
      console.log('Job details:', job);
      
      const tasks = generateJobTasks(job);
      console.log(`Generated ${tasks.length} unified tasks:`);
      
      tasks.forEach((task, taskIndex) => {
        console.log(`Task ${taskIndex + 1} (${task.id}):`);
        console.log('- Type:', task.category === 'manufacturing_process' ? 'Manufacturing' : 'Support');
        console.log('- Category:', task.category);
        console.log('- Status:', task.status);
        
        // Check task-level fields for undefined values
        const taskUndefinedFields = Object.entries(task).filter(([key, value]) => value === undefined);
        if (taskUndefinedFields.length > 0) {
          console.warn(`Task ${task.id} has undefined fields:`, taskUndefinedFields.map(([key]) => key));
        }
        
        // Check subtask fields for undefined values
        task.subtasks.forEach((subtask, subtaskIndex) => {
          const subtaskUndefinedFields = Object.entries(subtask).filter(([key, value]) => value === undefined);
          if (subtaskUndefinedFields.length > 0) {
            console.warn(`Subtask ${subtask.id} has undefined fields:`, subtaskUndefinedFields.map(([key]) => key));
            console.warn('Full subtask data:', subtask);
          }
        });
      });
      console.log('=== END DEBUGGING ===');
      
      // Save to Firebase
      console.log('Attempting to save unified tasks to Firebase...');
      await saveJobTasks(job.id, tasks);
      console.log('Successfully saved unified tasks to Firebase');
      
      // Update local state
      setJobTasks(prev => ({ ...prev, [job.id]: tasks }));
      
      toast({
        title: "Tasks Generated Successfully",
        description: `Generated ${tasks.length} tasks (${tasks.filter(t => t.category === 'manufacturing_process').length} manufacturing + ${tasks.filter(t => t.category === 'non_manufacturing_task').length} support)`,
      });
    } catch (error) {
      console.error("Failed to generate unified tasks:", error);
      toast({
        title: "Task Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate unified tasks for this job",
        variant: "destructive",
      });
    } finally {
      setTaskGenerationLoading(prev => ({ ...prev, [job.id]: false }));
    }
  };

  // Load existing tasks for all jobs
  const loadExistingTasks = useCallback(async (jobs: Job[]) => {
    const tasksToLoad: Record<string, JobTask[]> = {};
    
    try {
      const loadPromises = jobs.map(async (job) => {
        const hasTasksInDb = await jobHasTasks(job.id);
        if (hasTasksInDb) {
          const tasks = await loadJobTasks(job.id);
          tasksToLoad[job.id] = tasks;
        }
      });
      
      await Promise.all(loadPromises);
      setJobTasks(tasksToLoad);
    } catch (error) {
      console.error("Failed to load existing tasks:", error);
      toast({
        title: "Failed to Load Tasks",
        description: "Could not load existing task data",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Get task progress for a job
  const getJobTaskProgress = (jobId: string) => {
    const tasks = jobTasks[jobId];
    if (!tasks || tasks.length === 0) return null;
    
    return calculateJobProgress(tasks);
  };

  // Test Firebase connection
  const testFirebase = async () => {
    try {
      const result = await testFirebaseConnection();
      toast({
        title: result.success ? "Firebase Test Successful" : "Firebase Test Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Firebase Test Error",
        description: "Could not complete Firebase test",
        variant: "destructive",
      });
    }
  };

  // Cleanup corrupted timestamp data
  const cleanupCorruptedData = async () => {
    try {
      await cleanupCorruptedTimestamps();
      toast({
        title: "Data Cleanup Successful",
        description: "Corrupted timestamp data has been fixed",
      });
      // Reload the jobs after cleanup
      await fetchJobs();
    } catch (error) {
      toast({
        title: "Data Cleanup Failed",
        description: "Could not fix corrupted data",
        variant: "destructive",
      });
    }
  };

  // Cleanup jobs database
  const handleCleanupDatabase = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL jobs and job-related data from the database. This action cannot be undone. Are you sure?')) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Call the cleanup API endpoint
      const response = await fetch('/api/cleanup-jobs-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          confirmCleanup: 'YES_DELETE_ALL_JOBS' 
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Database Cleanup Successful",
          description: `Cleaned up ${result.deletedCount || 0} documents from database`,
        });
        
        // Refresh the page data
        await fetchJobs();
        await fetchOrders();
      } else {
        throw new Error('Cleanup failed');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      toast({
        title: "Database Cleanup Failed",
        description: "Could not cleanup database. Please try running the cleanup script manually.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Archive a specific job instead of deleting it
  const handleArchiveJob = async (job: Job) => {
    const archiveReason = prompt(`Archive job for ${job.item.partName}?\n\nPlease enter the reason for archiving:`);
    if (!archiveReason) return;

    try {
      console.log(`📦 Frontend: Starting archival for job ${job.id}`);
      
      // Load tasks and subtasks for complete archival
      const tasks = jobTasks[job.id] || [];
      const subtasks: any[] = []; // You'd load subtasks here if available
      
      // Archive the job with complete data
      const archiveResult = await archiveCompletedJob(
        job, 
        tasks, 
        subtasks, 
        archiveReason, 
        "Manufacturing Manager"
      );

      if (archiveResult.success) {
        console.log(`✅ Frontend: Successfully archived job ${job.id}`);
        toast({
          title: "Job Archived",
          description: `Successfully archived job for ${job.item.partName} with all manufacturing data`,
        });
        
        // Now delete the job from active jobs after successful archival
        const response = await fetch(`/api/jobs/${job.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          await fetchJobs(); // Reload jobs
        }
      } else {
        throw new Error('Archival failed');
      }
    } catch (error) {
      console.error('❌ Frontend: Job archival failed:', error);
      toast({
        title: "Archive Failed",
        description: error instanceof Error ? error.message : "Could not archive job",
        variant: "destructive",
      });
    }
  };

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const allJobs = await loadAllJobs();
      setJobs(allJobs);
      
      // Load existing tasks for all jobs
      await loadExistingTasks(allJobs);
      
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      toast({
        title: "Failed to Load Jobs",
        description: "Could not load jobs from database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [loadExistingTasks, toast]);

  const fetchOrders = useCallback(async () => {
    try {
      const q = query(
        collection(db, ORDERS_COLLECTION_NAME),
        where("status", "in", ["New", "Processing"]) 
      );
      const querySnapshot = await getDocs(q);
      const ordersList: Order[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const orderData = docSnap.data() as OrderFirestoreData;
        ordersList.push({
          id: docSnap.id,
          ...orderData,
          orderDate: orderData.orderDate.toDate().toISOString(),
          dueDate: orderData.dueDate?.toDate().toISOString().split('T')[0],
          sentDate: orderData.sentDate?.toDate().toISOString(),
        });
      });
      
      setOrders(ordersList);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast({
        title: "Failed to Load Orders",
        description: "Could not load orders from database",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchJobs();
    fetchOrders();
  }, [fetchJobs, fetchOrders]);

  const handleJobCreated = (job: Job) => {
    // Refresh the jobs list
    fetchJobs();
  };

  // Pattern creation handlers
  const handleCreatePattern = (job: Job) => {
    setPatternCreationJob(job);
    setIsPatternDialogOpen(true);
  };

  const handlePatternCreated = (patternId: string, patternName: string) => {
    toast({
      title: "Pattern Created Successfully",
      description: `Pattern "${patternName}" is now available for creating similar jobs`,
    });
    setIsPatternDialogOpen(false);
    setPatternCreationJob(null);
  };

  const handlePatternDialogClose = () => {
    setIsPatternDialogOpen(false);
    setPatternCreationJob(null);
  };

  // Create test completed jobs for pattern testing
  const handleCreateTestJobs = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/test/create-completed-jobs', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Test Jobs Created Successfully",
          description: `Created ${result.summary.created} completed jobs ready for pattern creation`,
        });
        
        // Refresh the jobs list
        await fetchJobs();
      } else {
        toast({
          title: "Failed to Create Test Jobs",
          description: result.error || "Could not create test completed jobs",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating test jobs:', error);
      toast({
        title: "Error Creating Test Jobs",
        description: "Could not create test completed jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if job is eligible for pattern creation
  const isJobPatternEligible = (job: Job, tasks?: JobTask[]) => {
    if (job.status !== 'Completed') return false;
    if (job.createdFromPatternId) return false; // Don't create patterns from pattern-created jobs
    if (!tasks || tasks.length === 0) return false;
    
    // For now, assume completed jobs with tasks are eligible for pattern creation
    // Quality assessment will be done in the pattern creation dialog
    return true;
  };

  // Check if job can be manually completed
  const canManuallyCompleteJob = (job: Job, tasks?: JobTask[]) => {
    if (job.status === 'Completed') return false;
    if (!tasks || tasks.length === 0) return false;
    
    // Allow manual completion if job has tasks and is not already completed
    return ['Pending', 'In Progress', 'Awaiting Next Process'].includes(job.status);
  };

  // Handle manual job completion
  const handleManualJobCompletion = async (job: Job) => {
    if (!confirm(`Mark job "${job.item.partName}" as completed?\n\nThis will:\n- Set job status to Completed\n- Mark all pending tasks as completed\n- Enable pattern creation`)) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Update job status to completed
      const { updateJob } = await import('@/lib/firebase-jobs');
      await updateJob(job.id, {
        status: 'Completed',
        actualCompletionDate: new Date().toISOString(),
        overallQualityScore: 8.5 // Default good quality score for manual completion
      });
      
      // Mark all pending tasks as completed
      const tasks = jobTasks[job.id] || [];
      const { updateTaskInFirestore } = await import('@/lib/firebase-tasks');
      
      for (const task of tasks) {
        if (task.status !== 'completed') {
          const updatedTask = {
            ...task,
            status: 'completed' as const,
            actualEnd: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Mark all subtasks as completed too
            subtasks: task.subtasks.map(subtask => ({
              ...subtask,
              status: 'completed' as const,
              isChecked: true,
              completedAt: new Date().toISOString(),
              completedBy: 'manual_completion',
              updatedAt: new Date().toISOString()
            }))
          };
          
          await updateTaskInFirestore(updatedTask);
        }
      }
      
      toast({
        title: "Job Completed Successfully",
        description: `${job.item.partName} has been marked as completed and is now eligible for pattern creation`,
      });
      
      // Refresh the jobs list
      await fetchJobs();
      
    } catch (error) {
      console.error('Error completing job manually:', error);
      toast({
        title: "Error Completing Job",
        description: "Could not complete the job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter jobs based on status
  const filteredJobs = statusFilter === 'all' ? jobs : jobs.filter(job => job.status === statusFilter);
  const completedJobs = jobs.filter(job => job.status === 'Completed');

  return (
    <div>
      <PageHeader
        title={t('title')}
        description="Order-based job management with automatic task generation and manufacturing forms"
        actions={
          <div className="flex space-x-2">
            <ArchiveHistoryDialog />
            <Button variant="outline" onClick={testFirebase}>
              <TestTube className="mr-2 h-4 w-4" />
              Test Firebase
            </Button>
            <Button variant="outline" onClick={cleanupCorruptedData}>
              <Cog className="mr-2 h-4 w-4" />
              Fix Data
            </Button>
            <Button variant="destructive" onClick={handleCleanupDatabase}>
              <Trash2 className="mr-2 h-4 w-4" />
              Cleanup Database
            </Button>
            <Button variant="outline" onClick={handleCreateTestJobs}>
              <Award className="mr-2 h-4 w-4 text-yellow-600" />
              Create Test Completed Jobs
            </Button>
            <Button variant="outline">
              <ListChecks className="mr-2 h-4 w-4" /> {t('button_viewProcessBoard')}
            </Button>
          </div>
        }
      />
      
      {/* Job Creation Methods */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Job Creation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Standard Job Creation */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Standard Job Creation</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Convert order items to manufacturing jobs with automatic task generation.
                Each job includes routing sheets, setup sheets, tool lists, and quality tasks.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  <span>{orders.length} orders available</span>
                </div>
                <div className="flex items-center gap-1">
                  <Factory className="h-4 w-4" />
                  <span>{jobs.length} jobs created</span>
                </div>
              </div>
              <OrderToJobConverter 
                orders={orders}
                onJobCreated={handleJobCreated}
                onRefresh={() => { fetchJobs(); fetchOrders(); }}
              />
            </div>

            {/* Archive-Driven Job Creation */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">Archive-Driven Creation</h3>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-300">
                  Smart
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Leverage historical data to create optimized jobs with proven parameters, 
                setup recommendations, and quality insights from similar past work.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>20-30% faster setup times</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Improved quality predictions</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Risk assessment & mitigation</span>
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-800 font-medium mb-2">
                  🎯 How it works:
                </p>
                <ol className="text-xs text-purple-700 space-y-1">
                  <li>1. Click "Create Jobs from Orders"</li>
                  <li>2. Select order items</li>
                  <li>3. Toggle to "Archive-Driven" mode</li>
                  <li>4. Choose from historical suggestions</li>
                  <li>5. Get optimized job with proven parameters</li>
                </ol>
              </div>
            </div>

            {/* Pattern-Based Creation */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-900">Pattern-Based Creation</h3>
                {completedJobs.length > 0 && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                    {completedJobs.length} patterns available
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Create jobs from proven manufacturing patterns created from your most successful jobs.
                Patterns provide templates for recurring work with optimized processes.
              </p>
              {completedJobs.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4 text-yellow-600" />
                      <span>{completedJobs.length} completed jobs</span>
                    </div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      ✨ Pattern creation available! Create patterns from your completed jobs to enable pattern-based job creation.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">
                    Complete some jobs first to create manufacturing patterns for future use.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading jobs...
            </div>
          </CardContent>
        </Card>
      ) : filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
            {jobs.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No Jobs Created Yet</h3>
                <p className="mb-4">Create jobs from orders to get started with manufacturing planning.</p>
                <OrderToJobConverter 
                  orders={orders}
                  onJobCreated={handleJobCreated}
                  onRefresh={() => { fetchJobs(); fetchOrders(); }}
                />
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">No Jobs Match Filter</h3>
                <p className="mb-4">
                  {statusFilter === 'Completed' 
                    ? 'No completed jobs found. Complete some jobs to create manufacturing patterns.' 
                    : `No jobs with status "${statusFilter}" found.`
                  }
                </p>
                <Button variant="outline" onClick={() => setStatusFilter('all')}>
                  Show All Jobs
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Manufacturing Jobs ({filteredJobs.length})</h2>
              {completedJobs.length > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  <Award className="h-3 w-3 mr-1" />
                  {completedJobs.length} Pattern Eligible
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as JobStatus | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs ({jobs.length})</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed ({completedJobs.length})</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setShowTableView(!showTableView)}>
                {showTableView ? <Layers className="h-4 w-4 mr-2" /> : <ListChecks className="h-4 w-4 mr-2" />}
                {showTableView ? 'Card View' : 'Table View'}
              </Button>
            </div>
          </div>

          {showTableView ? (
            /* Table View */
            <Card>
              <CardContent className="p-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part Name</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJobs.map((job) => {
                        const progress = getJobTaskProgress(job.id);
                        const hasTasks = jobTasks[job.id]?.length > 0;
                        
                        return (
                          <TableRow key={job.id}>
                            <TableCell>
                              <div>
                                <LotNumberDisplay 
                                  jobId={job.id} 
                                  partName={job.item.partName}
                                  className="font-medium" 
                                />
                                <div className="text-sm text-muted-foreground">
                                  {job.item.rawMaterialType}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{job.clientName}</TableCell>
                            <TableCell className="font-mono text-sm">{job.orderNumber}</TableCell>
                            <TableCell>{job.item.quantity}</TableCell>
                            <TableCell>
                              <JobStatusBadge status={job.status} />
                            </TableCell>
                            <TableCell>
                              {progress ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${progress.overallProgress}%` }}
                                      />
                                    </div>
                                    <span className="text-sm">{progress.overallProgress}%</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {progress.completedTasks}/{progress.totalTasks} tasks
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">No tasks</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={`/jobs/${job.id}/operations`}>
                                    <Settings className="h-4 w-4" />
                                  </a>
                                </Button>
                                {canManuallyCompleteJob(job, jobTasks[job.id]) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleManualJobCompletion(job)}
                                    title="Mark job as completed manually"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                                {isJobPatternEligible(job, jobTasks[job.id]) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleCreatePattern(job)}
                                    title="Create manufacturing pattern from this completed job"
                                  >
                                    <Award className="h-4 w-4 text-yellow-600" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleArchiveJob(job)}
                                  title="Archive job with manufacturing history"
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Card View - Notion-like layout */
            <div className="space-y-6">
              {filteredJobs.map((job) => {
                const progress = getJobTaskProgress(job.id);
                const hasTasks = jobTasks[job.id]?.length > 0;
                const tasks = jobTasks[job.id] || [];
                
                return (
                  <Card key={job.id} className="overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg mb-2">
                            <LotNumberDisplay 
                              jobId={job.id} 
                              partName={job.item.partName}
                            />
                          </CardTitle>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Customer:</span>
                              <p className="font-medium">{job.clientName}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Order:</span>
                              <p className="font-mono text-sm">{job.orderNumber}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Quantity:</span>
                              <p className="font-medium">{job.item.quantity}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status:</span>
                              <div className="mt-1">
                                <JobStatusBadge status={job.status} />
                              </div>
                            </div>
                          </div>
                          
                          {/* Material and Processes */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              {job.item.rawMaterialType}
                            </Badge>
                            {job.item.assignedProcesses?.map((process, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {process}
                              </Badge>
                            ))}
                          </div>

                          {/* Progress Summary */}
                          {progress && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Overall Progress</span>
                                <span className="text-sm text-muted-foreground">
                                  {progress.completedTasks}/{progress.totalTasks} tasks completed
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${progress.overallProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center space-x-2 ml-4">
                          {!hasTasks && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateTasks(job)}
                              disabled={taskGenerationLoading[job.id]}
                            >
                              {taskGenerationLoading[job.id] ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Cog className="h-4 w-4 mr-2" />
                              )}
                              Generate Tasks
                            </Button>
                          )}
                          <Button variant="outline" size="sm" asChild>
                            <a href={`/jobs/${job.id}/operations`}>
                              <Settings className="h-4 w-4 mr-2" />
                              Operations
                            </a>
                          </Button>
                          {canManuallyCompleteJob(job, tasks) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleManualJobCompletion(job)}
                              className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 hover:from-green-100 hover:to-emerald-100"
                              title="Mark job as completed manually"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                              Mark Complete
                            </Button>
                          )}
                          {isJobPatternEligible(job, tasks) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleCreatePattern(job)}
                              className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 hover:from-yellow-100 hover:to-amber-100"
                              title="Create manufacturing pattern from this completed job"
                            >
                              <Award className="h-4 w-4 mr-2 text-yellow-600" />
                              Create Pattern
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleArchiveJob(job)}
                            title="Archive job with manufacturing history"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {/* Tasks Display */}
                    <CardContent className="pt-0">
                      {hasTasks && tasks.length > 0 ? (
                        <JobTaskDisplay 
                          job={job} 
                          tasks={tasks} 
                          onTasksUpdate={(updatedTasks) => {
                            setJobTasks(prev => ({
                              ...prev,
                              [job.id]: updatedTasks
                            }));
                          }}
                        />
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No tasks generated yet</p>
                          <p className="text-xs">Click "Generate Tasks" to create manufacturing and support tasks</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Pattern Creation Dialog */}
      {patternCreationJob && (
        <PatternCreationDialog
          job={patternCreationJob}
          tasks={jobTasks[patternCreationJob.id] || []}
          isOpen={isPatternDialogOpen}
          onClose={handlePatternDialogClose}
          onPatternCreated={handlePatternCreated}
        />
      )}
    </div>
  );
}
