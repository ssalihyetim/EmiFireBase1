'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  PauseCircle, 
  AlertTriangle,
  FileText,
  User,
  Calendar,
  Printer,
  Download,
  ExternalLink,
  Settings,
  Wrench,
  Plus,
  Edit3,
  Upload,
  Trash2,
  Shield,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import type { Job, JobTask, JobSubtask, TaskStatus, SubtaskStatus } from '@/types';
import { 
  generateJobTasks, 
  calculateJobProgress, 
  updateTaskStatus, 
  updateSubtaskStatus,
  canTaskStart,
  getNextAvailableTasks
} from '@/lib/task-automation';
import { 
  searchJobArchives, 
  getPartArchiveHistory 
} from '@/lib/job-archival';
import { validateAS9100DCompliance, getQualityTemplateForSubtask } from '@/lib/quality-template-integration';
import { loadJobTasks, updateTaskInFirestore, updateSubtaskInFirestore, saveJobTasks, updateJobStatus } from '@/lib/firebase-tasks';
import { 
  getSetupSheetsBySubtask, 
  getRoutingSheetsByTask, 
  getToolListsBySubtask,
  deleteSetupSheet,
  deleteRoutingSheet,
  deleteToolList
} from '@/lib/firebase-manufacturing';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { OrderFirestoreData } from '@/types';
import RoutingSheetForm from '@/components/manufacturing/RoutingSheetForm';
import SetupSheetForm from '@/components/manufacturing/SetupSheetForm';
import ToolListForm from '@/components/manufacturing/ToolListForm';
import ToolLifeVerificationForm from '@/components/manufacturing/ToolLifeVerificationForm';

// New AS9100D Form Imports
import LotNumberInput from '@/components/subtasks/LotNumberInput';
import FAIReportForm from '@/components/forms/FAIReportForm';
import { LotNumberDisplay } from '@/components/jobs/LotNumberInput';

// Quality tracking imports
import type { QualityResult } from '@/types/archival';
import AS9100DTaskCompletionHandler from '@/components/quality/AS9100DTaskCompletionHandler';
import PatternCreationDialog from '@/components/quality/PatternCreationDialog';
import { 
  completeTrackedTask, 
  getTaskQualityRequirements, 
  getTaskQualityHistory 
} from '@/lib/quality-aware-task-completion';

// Archive-driven and setup intelligence imports
import HistoricalSetupPanel from '@/components/manufacturing/HistoricalSetupPanel';
import UnifiedArchiveInterface from '@/components/manufacturing/UnifiedArchiveInterface';
import { 
  generateArchiveDrivenJobSuggestions,
  inheritProcessFromArchive,
  predictJobPerformance 
} from '@/lib/archive-driven-job-creation';
import { archiveCompletedJob } from '@/lib/job-archival';

const TaskStatusIcon: { [key in TaskStatus]?: React.ElementType } = {
  pending: Clock,
  in_progress: PlayCircle,
  completed: CheckCircle2,
  blocked: AlertTriangle,
  cancelled: PauseCircle,
  ready: PlayCircle,
  on_hold: PauseCircle,
};

const TaskStatusColors: { [key in TaskStatus]?: string } = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  blocked: 'bg-red-100 text-red-700 border-red-300',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-300',
  ready: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  on_hold: 'bg-orange-100 text-orange-700 border-orange-300',
};

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const Icon = TaskStatusIcon[status] || Clock;
  const colorClass = TaskStatusColors[status] || TaskStatusColors.pending;
  
  return (
    <Badge variant="outline" className={`${colorClass} capitalize`}>
      <Icon className="h-3 w-3 mr-1" />
      {status.replace('_', ' ')}
    </Badge>
  );
}

function SubtaskItem({ 
  subtask, 
  task,
  job,
  onToggle, 
  onNotesChange,
  toast
}: { 
  subtask: JobSubtask;
  task: JobTask;
  job: Job;
  onToggle: (subtaskId: string, checked: boolean) => void;
  onNotesChange: (subtaskId: string, notes: string) => void;
  toast: any; // Add toast prop
}) {
  const [notes, setNotes] = useState(subtask.notes || '');
  
  // Dialog states for new forms
  const [faiDialogOpen, setFaiDialogOpen] = useState(false);

  // Separate dialog states for each template type
  const [routingDialogOpen, setRoutingDialogOpen] = useState(false);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [toolListDialogOpen, setToolListDialogOpen] = useState(false);
  const [toolLifeDialogOpen, setToolLifeDialogOpen] = useState(false);
  
  // Separate states for create vs edit dialogs
  const [routingCreateDialogOpen, setRoutingCreateDialogOpen] = useState(false);
  const [setupCreateDialogOpen, setSetupCreateDialogOpen] = useState(false);
  const [toolListCreateDialogOpen, setToolListCreateDialogOpen] = useState(false);
  
  // State for existing templates
  const [existingSetupSheets, setExistingSetupSheets] = useState<any[]>([]);
  const [existingRoutingSheets, setExistingRoutingSheets] = useState<any[]>([]);
  const [existingToolLists, setExistingToolLists] = useState<any[]>([]);
  
  // Selected template for editing
  const [selectedSetupSheet, setSelectedSetupSheet] = useState<any>(null);
  const [selectedRoutingSheet, setSelectedRoutingSheet] = useState<any>(null);
  const [selectedToolList, setSelectedToolList] = useState<any>(null);
  
  // State for new forms
  const [selectedFaiReport, setSelectedFaiReport] = useState<any>(null);

  const qualityDoc = getQualityTemplateForSubtask(subtask.id, subtask.qualityTemplateId);
  const compliance = validateAS9100DCompliance(subtask);

  // Load existing templates when component mounts
  useEffect(() => {
    if (subtask.templateId === 'turning_setup_sheet' || 
        subtask.templateId === 'milling_setup_sheet' || 
        subtask.templateId === '5_axis_setup_sheet') {
      loadExistingSetupSheets();
    }
    
    if (subtask.templateId === 'routing_sheet_creation') {
      loadExistingRoutingSheets();
    }
    
    if (subtask.templateId === 'milling_tool_list' || 
        subtask.templateId === 'turning_tool_list' ||
        subtask.templateId === '5_axis_tool_list') {
      loadExistingToolLists();
    }
  }, [subtask.id, task.id]);

  const loadExistingSetupSheets = async () => {
    try {
      const setupSheets = await getSetupSheetsBySubtask(subtask.id);
      setExistingSetupSheets(setupSheets);
    } catch (error) {
      console.error('Error loading setup sheets:', error);
    }
  };

  const loadExistingRoutingSheets = async () => {
    try {
      const routingSheets = await getRoutingSheetsByTask(task.id);
      setExistingRoutingSheets(routingSheets);
    } catch (error) {
      console.error('Error loading routing sheets:', error);
    }
  };

  const loadExistingToolLists = async () => {
    try {
      const toolLists = await getToolListsBySubtask(subtask.id);
      setExistingToolLists(toolLists);
    } catch (error) {
      console.error('Error loading tool lists:', error);
    }
  };

  // Delete handlers
  const handleDeleteSetupSheet = async (setupSheetId: string) => {
    try {
      await deleteSetupSheet(setupSheetId);
      toast({
        title: "Setup Sheet Deleted",
        description: "Setup sheet has been successfully deleted",
      });
      loadExistingSetupSheets(); // Reload the list
    } catch (error) {
      console.error('Error deleting setup sheet:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete setup sheet",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRoutingSheet = async (routingSheetId: string) => {
    try {
      await deleteRoutingSheet(routingSheetId);
      toast({
        title: "Routing Sheet Deleted",
        description: "Routing sheet has been successfully deleted",
      });
      loadExistingRoutingSheets(); // Reload the list
    } catch (error) {
      console.error('Error deleting routing sheet:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete routing sheet",
        variant: "destructive",
      });
    }
  };

  const handleDeleteToolList = async (toolListId: string) => {
    try {
      await deleteToolList(toolListId);
      toast({
        title: "Tool List Deleted",
        description: "Tool list has been successfully deleted",
      });
      loadExistingToolLists(); // Reload the list
    } catch (error) {
      console.error('Error deleting tool list:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete tool list",
        variant: "destructive",
      });
    }
  };

  const handleNotesBlur = () => {
    if (notes !== (subtask.notes || '')) {
      onNotesChange(subtask.id, notes);
    }
  };

  // --- Handlers for New AS9100D Forms ---

  const handleLotNumberUpdate = (lotNumber: string) => {
    toast({
      title: 'Lot Number Saved',
      description: `Successfully saved lot number: ${lotNumber}`,
    });
    // The component handles its own save, but we could add extra logic here
  };

  const handleSaveFaiReport = async (formData: any) => {
    try {
      const updatedSubtask: JobSubtask = {
        ...subtask,
        ...formData,
        attachments: [...(subtask.attachments || []), ...(formData.attachments || [])],
      };
      await updateSubtaskInFirestore(updatedSubtask);
      toast({ title: 'FAI Report Saved', description: 'Successfully saved the FAI report.' });
      setFaiDialogOpen(false);
    } catch (error) {
      toast({ title: 'Save Failed', description: 'Could not save the FAI report.', variant: 'destructive' });
      console.error(error);
    }
  };

  const handleSaveToolList = async (toolList: any[]) => {
    try {
      const updatedSubtask: JobSubtask = {
        ...subtask,
        data: { toolList }, // Storing tool list in a 'data' field
        status: 'completed',
      };
      await updateSubtaskInFirestore(updatedSubtask);
      toast({ title: 'Tool List Saved', description: 'Successfully saved the tool list.' });
      // Tool list saved successfully
    } catch (error) {
      toast({ title: 'Save Failed', description: 'Could not save the tool list.', variant: 'destructive' });
      console.error(error);
    }
  };

  // Determine which template buttons to show based on subtask type
  const getTemplateButtons = () => {
    const buttons = [];

    // Routing Sheet (Lot-Based Shop Traveler) for routing sheet creation subtask
    if (subtask.templateId === 'routing_sheet_creation') {
      if (existingRoutingSheets.length > 0) {
        // Show existing routing sheets with edit options
        existingRoutingSheets.forEach((routingSheet, index) => {
          buttons.push(
            <Dialog key={`routing-edit-${index}`} open={routingDialogOpen && selectedRoutingSheet?.id === routingSheet.id} onOpenChange={(open) => {
              setRoutingDialogOpen(open);
              if (!open) setSelectedRoutingSheet(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => {
                  setSelectedRoutingSheet(routingSheet);
                  setRoutingDialogOpen(true);
                }}>
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit Routing Sheet #{index + 1}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>Edit Lot-Based Shop Traveler</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this routing sheet?')) {
                          handleDeleteRoutingSheet(routingSheet.id);
                          setRoutingDialogOpen(false);
                          setSelectedRoutingSheet(null);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </DialogTitle>
                  <DialogDescription>
                    Edit routing sheet for {task.name} - {job.item.partName}
                  </DialogDescription>
                </DialogHeader>
                <RoutingSheetForm
                  jobId={job.id}
                  taskId={task.id}
                  partName={job.item.partName}
                  customerName={job.clientName}
                  orderNumber={job.orderNumber}
                  assignedProcesses={job.item.assignedProcesses || []}
                  operationData={job.item.assignedProcesses?.map(processName => ({
                    processName,
                    quantity: job.item.quantity || 1,
                    setupTimeMinutes: (job.item as any).setupTimeMinutes || 0,
                    cycleTimeMinutes: (job.item as any).cycleTimeMinutes || 0,
                    machineType: (job.item as any).machineType || ''
                  })) || []}
                  quantity={job.item.quantity || 1}
                  initialData={selectedRoutingSheet}
                  onSave={(savedSheet) => {
                    setRoutingDialogOpen(false);
                    setSelectedRoutingSheet(null);
                    loadExistingRoutingSheets(); // Reload the list
                  }}
                />
              </DialogContent>
            </Dialog>
          );
        });
      }

      // Always show create new button
      buttons.push(
        <Dialog key="routing-new" open={routingCreateDialogOpen} onOpenChange={setRoutingCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant={existingRoutingSheets.length > 0 ? "ghost" : "outline"}>
              <FileText className="h-3 w-3 mr-1" />
              {existingRoutingSheets.length > 0 ? 'New Routing Sheet' : 'Create Lot-Based Shop Traveler'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lot-Based Shop Traveler</DialogTitle>
              <DialogDescription>
                Create routing sheet for {task.name} - {job.item.partName}
              </DialogDescription>
            </DialogHeader>
            <RoutingSheetForm
              jobId={job.id}
              taskId={task.id}
              partName={job.item.partName}
              customerName={job.clientName}
              orderNumber={job.orderNumber}
              assignedProcesses={job.item.assignedProcesses || []}
              operationData={job.item.assignedProcesses?.map(processName => ({
                processName,
                quantity: job.item.quantity || 1,
                setupTimeMinutes: (job.item as any).setupTimeMinutes || 0,
                cycleTimeMinutes: (job.item as any).cycleTimeMinutes || 0,
                machineType: (job.item as any).machineType || ''
              })) || []}
              quantity={job.item.quantity || 1}
              onSave={(savedSheet) => {
                setRoutingCreateDialogOpen(false);
                loadExistingRoutingSheets(); // Reload the list
              }}
            />
          </DialogContent>
        </Dialog>
      );
    }

    // Setup Sheet for turning, milling, and 5-axis setup subtasks
    if (subtask.templateId === 'turning_setup_sheet' || 
        subtask.templateId === 'milling_setup_sheet' || 
        subtask.templateId === '5_axis_setup_sheet') {
      
      if (existingSetupSheets.length > 0) {
        // Show existing setup sheets with edit options
        existingSetupSheets.forEach((setupSheet, index) => {
          buttons.push(
            <Dialog key={`setup-edit-${index}`} open={setupDialogOpen && selectedSetupSheet?.id === setupSheet.id} onOpenChange={(open) => {
              setSetupDialogOpen(open);
              if (!open) setSelectedSetupSheet(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => {
                  setSelectedSetupSheet(setupSheet);
                  setSetupDialogOpen(true);
                }}>
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit Setup Sheet #{index + 1}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>Edit Setup Sheet</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this setup sheet?')) {
                          handleDeleteSetupSheet(setupSheet.id);
                          setSetupDialogOpen(false);
                          setSelectedSetupSheet(null);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </DialogTitle>
                  <DialogDescription>
                    Edit setup sheet for {subtask.name} - {task.name}
                  </DialogDescription>
                </DialogHeader>
                <SetupSheetForm
                  subtaskId={subtask.id}
                  jobId={job.id}
                  taskId={task.id}
                  processName={task.name}
                  machineNumber="TBD"
                  initialData={selectedSetupSheet}
                  onSave={(savedSheet) => {
                    setSetupDialogOpen(false);
                    setSelectedSetupSheet(null);
                    loadExistingSetupSheets(); // Reload the list
                  }}
                />
              </DialogContent>
            </Dialog>
          );
        });
      }

      // Always show create new button
      buttons.push(
        <Dialog key="setup-new" open={setupCreateDialogOpen} onOpenChange={setSetupCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant={existingSetupSheets.length > 0 ? "ghost" : "outline"}>
              <Settings className="h-3 w-3 mr-1" />
              {existingSetupSheets.length > 0 ? 'New Setup Sheet' : 'Create Setup Sheet'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Setup Sheet</DialogTitle>
              <DialogDescription>
                Create setup sheet for {subtask.name} - {task.name}
              </DialogDescription>
            </DialogHeader>
            <SetupSheetForm
              subtaskId={subtask.id}
              jobId={job.id}
              taskId={task.id}
              processName={task.name}
              machineNumber="TBD"
              onSave={(savedSheet) => {
                setSetupCreateDialogOpen(false);
                loadExistingSetupSheets(); // Reload the list
              }}
            />
          </DialogContent>
        </Dialog>
      );
    }

    // Tool List for milling and turning tool subtasks
    if (subtask.templateId === 'milling_tool_list' || 
        subtask.templateId === 'turning_tool_list' ||
        subtask.templateId === '5_axis_tool_list') {
      
      if (existingToolLists.length > 0) {
        // Show existing tool lists with edit options
        existingToolLists.forEach((toolList, index) => {
          buttons.push(
            <Dialog key={`toollist-edit-${index}`} open={toolListDialogOpen && selectedToolList?.id === toolList.id} onOpenChange={(open) => {
              setToolListDialogOpen(open);
              if (!open) setSelectedToolList(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => {
                  setSelectedToolList(toolList);
                  setToolListDialogOpen(true);
                }}>
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit Tool List #{index + 1}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>Edit Tool List</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this tool list?')) {
                          handleDeleteToolList(toolList.id);
                          setToolListDialogOpen(false);
                          setSelectedToolList(null);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </DialogTitle>
                  <DialogDescription>
                    Edit tool list for {subtask.name} - {task.name}
                  </DialogDescription>
                </DialogHeader>
                <ToolListForm
                  processName={task.name}
                  machineNumber="TBD"
                  subtaskId={subtask.id}
                  jobId={job.id}
                  taskId={task.id}
                  initialData={selectedToolList}
                  onSave={(savedList) => {
                    setToolListDialogOpen(false);
                    setSelectedToolList(null);
                    loadExistingToolLists(); // Reload the list
                  }}
                />
              </DialogContent>
            </Dialog>
          );
        });
      }

      // Always show create new button
      buttons.push(
        <Dialog key="toollist-new" open={toolListCreateDialogOpen} onOpenChange={setToolListCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant={existingToolLists.length > 0 ? "ghost" : "outline"}>
              <Wrench className="h-3 w-3 mr-1" />
              {existingToolLists.length > 0 ? 'New Tool List' : 'Create Tool List'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tool List</DialogTitle>
              <DialogDescription>
                Create tool list for {subtask.name} - {task.name}
              </DialogDescription>
            </DialogHeader>
            <ToolListForm
              processName={task.name}
              machineNumber="TBD"
              subtaskId={subtask.id}
              jobId={job.id}
              taskId={task.id}
              onSave={(savedList) => {
                setToolListCreateDialogOpen(false);
                loadExistingToolLists(); // Reload the list
              }}
            />
          </DialogContent>
        </Dialog>
      );

      // Add upload button for tool list
      buttons.push(
        <Button key="upload-tools" size="sm" variant="ghost" title="Upload Tool List">
          <Upload className="h-3 w-3 mr-1" />
          Upload
        </Button>
      );


    }

    // Tool Life Verification - AS9100D Risk-Based Approach
    if (subtask.templateId === 'turning_tool_life_verification' ||
        subtask.templateId === 'milling_tool_life_verification' ||
        subtask.templateId === '5_axis_tool_life_verification') {
      
      buttons.push(
        <Dialog key="toollife-dialog" open={toolLifeDialogOpen} onOpenChange={setToolLifeDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Generate Tool Life List
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tool Life Verification - AS9100D Risk Assessment</DialogTitle>
              <DialogDescription>
                Generate risk-based tool life verification from existing tool list
              </DialogDescription>
            </DialogHeader>
            <ToolLifeVerificationForm
              subtaskId={subtask.id}
              jobId={job.id}
              taskId={task.id}
              onSave={(verification) => {
                toast({
                  title: "Tool Life Verification Created",
                  description: "Risk assessment completed and verification record saved.",
                });
                setToolLifeDialogOpen(false);
              }}
              onClose={() => setToolLifeDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      );
    }

    // --- New AS9100D Form Buttons ---

    // FAI Report - Only for dedicated FAI subtasks, not general machining operations
    if (subtask.templateId === 'first_article_inspection' || 
        subtask.name.toLowerCase().includes('fai') ||
        subtask.name.toLowerCase().includes('first article')) {
      
      buttons.push(
        <Dialog key="fai-dialog" open={faiDialogOpen} onOpenChange={setFaiDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Upload FAI Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>First Article Inspection (FAI) Report</DialogTitle>
              <DialogDescription>
                Upload FAI documentation for AS9100D compliance - Required for new parts, engineering changes, and process modifications
              </DialogDescription>
            </DialogHeader>
            <FAIReportForm
              subtask={subtask}
              onSave={handleSaveFaiReport}
              onClose={() => setFaiDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      );
    }

    return buttons;
  };

  return (
    <div className="flex flex-col p-3 border-b last:border-b-0 hover:bg-gray-50/50">
      <div className="flex items-start gap-3">
        <Checkbox
          id={`subtask-${subtask.id}`}
          checked={subtask.status === 'completed'}
          onCheckedChange={(checked) => onToggle(subtask.id, !!checked)}
          className="mt-1"
        />
        <div className="flex-1">
          <Label htmlFor={`subtask-${subtask.id}`} className="font-semibold text-gray-800">
            {subtask.name}
          </Label>
          <p className="text-sm text-gray-500">{subtask.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {getTemplateButtons()}
        </div>
      </div>

      {/* Conditional Rendering for Lot Number Input */}
      {subtask.name === 'Set Traceability & Lot Number' && (
          <div className="mt-2 pl-8">
              <LotNumberInput 
                subtask={subtask} 
                partNumber={job.item.partName}
                partName={job.item.partName}
                orderId={job.orderId}
                onUpdate={handleLotNumberUpdate} 
              />
          </div>
      )}

      <div className="pl-8 mt-2">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add notes or observations..."
          className="text-xs min-h-[60px]"
        />
      </div>
    </div>
  );
}

function TaskCard({ 
  task, 
  job,
  allTasks,
  onStatusChange, 
  onSubtaskToggle, 
  onSubtaskNotesChange,
  toast
}: { 
  task: JobTask;
  job: Job;
  allTasks: JobTask[];
  onStatusChange: (taskId: string, status: TaskStatus, qualityResult?: QualityResult) => void;
  onSubtaskToggle: (subtaskId: string, checked: boolean) => void;
  onSubtaskNotesChange: (subtaskId: string, notes: string) => void;
  toast: any;
}) {
  // Quality tracking state
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [qualityHistory, setQualityHistory] = useState<any>(null);
  const [isLoadingQuality, setIsLoadingQuality] = useState(false);
  
  const isStartable = canTaskStart(task, allTasks);

  const handleStartTask = () => {
    if (isStartable) {
      onStatusChange(task.id, 'in_progress');
    } else {
      toast({
        title: "Task Blocked",
        description: "Cannot start task until its dependencies are complete.",
        variant: "destructive",
      });
    }
  };

  // Enhanced task completion with quality assessment
  const handleCompleteTask = async () => {
    // Load quality history for context
    setIsLoadingQuality(true);
    try {
      const history = await getTaskQualityHistory(task.templateId);
      setQualityHistory(history);
    } catch (error) {
      console.error('Failed to load quality history:', error);
    } finally {
      setIsLoadingQuality(false);
    }
    
    // Open quality assessment dialog
    setQualityDialogOpen(true);
  };

  const handleQualityCompletion = async (qualityResult: QualityResult, operatorNotes?: string[]) => {
    try {
      setIsLoadingQuality(true);
      
      // Complete task with quality assessment
      await onStatusChange(task.id, 'completed', qualityResult);
      
      toast({
        title: "Task Completed Successfully",
        description: `Quality Score: ${qualityResult.score}/10 - ${qualityResult.result.toUpperCase()}`,
      });
      
      setQualityDialogOpen(false);
    } catch (error) {
      console.error('Failed to complete task with quality assessment:', error);
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuality(false);
    }
  };

  const progress = task.subtasks.length > 0
    ? (task.subtasks.filter(st => st.status === 'completed').length / task.subtasks.length) * 100
    : (task.status === 'completed' ? 100 : 0);

  // This is a simplified check. You might want a more robust way to identify the primary machining subtask.
  const machiningSubtask = task.subtasks.find(st => st.manufacturingSubtaskType === 'machining');

  // Get quality requirements for this task
  const qualityRequirements = getTaskQualityRequirements(task);

  return (
    <Card className={`mb-4 shadow-md border ${task.status === 'completed' ? 'bg-gray-50' : 'bg-white'}`}>
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold">{task.name}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
            {task.category === 'manufacturing_process' && machiningSubtask && (
              <div className="text-xs text-gray-500 mt-1">
                Part Code: <Badge variant="secondary">{machiningSubtask.partCode || 'N/A'}</Badge>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end">
            <TaskStatusBadge status={task.status} />
            {task.priority && (
              <Badge className="mt-2 capitalize" variant={
                task.priority === 'critical' || task.priority === 'urgent' ? 'destructive' : 'secondary'
              }>
                {task.priority}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="mb-3">
          <Progress value={progress} />
        </div>
        
        {task.subtasks.map((subtask) => (
          <SubtaskItem 
            key={subtask.id} 
            subtask={subtask}
            task={task}
            job={job}
            onToggle={(subtaskId, checked) => onSubtaskToggle(subtaskId, checked)}
            onNotesChange={(subtaskId, notes) => onSubtaskNotesChange(subtaskId, notes)}
            toast={toast}
          />
        ))}

        <div className="mt-4 flex justify-end items-center gap-2">
           {task.dependencies && task.dependencies.length > 0 && (
            <div className="text-xs text-gray-500 mr-auto">
              Dependencies: {task.dependencies.join(', ')}
            </div>
          )}

          {task.status === 'ready' && (
            <Button onClick={handleStartTask} size="sm" variant="outline" disabled={!isStartable}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Task
            </Button>
          )}

          {task.status === 'in_progress' && (
            <Button onClick={handleCompleteTask} size="sm" variant="default" disabled={isLoadingQuality}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isLoadingQuality ? 'Loading...' : 'Complete with Quality Assessment'}
            </Button>
          )}
        </div>

        {/* Quality Requirements Display */}
        {(task.status === 'in_progress' || task.status === 'ready') && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Quality Requirements</span>
              {qualityRequirements.as9100dCompliance && (
                <Badge variant="outline" className="text-xs">AS9100D</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-600">Min. Score:</span>
                <span className="ml-1 font-medium">{qualityRequirements.minimumQualityScore}/10</span>
              </div>
              <div>
                <span className="text-gray-600">Inspections:</span>
                <span className="ml-1 font-medium">{qualityRequirements.requiredInspections.length}</span>
              </div>
            </div>
            
            {/* Quality History Preview */}
            {qualityHistory && (
              <div className="mt-3 pt-2 border-t border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800">Historical Performance</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600">Avg Score:</span>
                    <span className="ml-1 font-medium">{qualityHistory.averageQualityScore.toFixed(1)}/10</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Pass Rate:</span>
                    <span className="ml-1 font-medium">{qualityHistory.passRate.toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="ml-1 font-medium">{qualityHistory.totalAssessments}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Historical Setup Intelligence for Manufacturing Tasks */}
        {task.category === 'manufacturing_process' && task.manufacturingProcessType && 
         (task.status === 'in_progress' || task.status === 'ready') && (
          <div className="mt-4">
            <HistoricalSetupPanel
              task={task}
              partName={job.item.partName}
              processType={task.manufacturingProcessType}
              onSetupOptimization={(optimizations) => {
                // Update task with setup optimizations
                console.log('Setup optimizations received:', optimizations);
                if (optimizations.timeReduction > 10) {
                  toast({
                    title: "Setup Optimization Available",
                    description: `Potential ${optimizations.timeReduction.toFixed(0)}% time reduction with historical parameters`,
                  });
                }
              }}
              className="border border-green-200 bg-green-50"
            />
          </div>
        )}
      </CardContent>

      {/* AS9100D Task Completion Handler */}
      <AS9100DTaskCompletionHandler
        open={qualityDialogOpen}
        onOpenChange={setQualityDialogOpen}
        task={task}
        job={job}
        onComplete={handleQualityCompletion}
        isLoading={isLoadingQuality}
      />
    </Card>
  );
}

export default function TaskManagementPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  // Get jobId from URL params
  const jobId = params.jobId as string;
  
  const [job, setJob] = useState<Job | null>(null);
  const [tasks, setTasks] = useState<JobTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastTaskUpdate, setLastTaskUpdate] = useState<{taskId: string, taskName: string, status: TaskStatus} | null>(null);

  // Archive intelligence state
  const [archiveHistory, setArchiveHistory] = useState<any[]>([]);
  const [isLoadingArchives, setIsLoadingArchives] = useState(false);
  const [archiveStats, setArchiveStats] = useState<any>(null);

  // Pattern creation state
  const [showPatternDialog, setShowPatternDialog] = useState(false);
  const [isPatternEligible, setIsPatternEligible] = useState(false);

  // Navigation context from manufacturing calendar
  const [navigationContext, setNavigationContext] = useState<{
    fromCalendar?: boolean;
    partName?: string;
    operation?: string;
    multipleJobs?: number;
    eventId?: string;
  }>({});

  // Parse URL parameters for navigation context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const context = {
        fromCalendar: urlParams.get('fromCalendar') === 'true',
        partName: urlParams.get('partName') || undefined,
        operation: urlParams.get('operation') || undefined,
        multipleJobs: urlParams.get('multipleJobs') ? parseInt(urlParams.get('multipleJobs')!) : undefined,
        eventId: urlParams.get('eventId') || undefined
      };
      setNavigationContext(context);

      // Show navigation context toast if coming from calendar
      if (context.fromCalendar) {
        setTimeout(() => {
          toast({
            title: "Navigated from Manufacturing Calendar",
            description: context.eventId 
              ? `Opening task from calendar event: ${context.operation ? decodeURIComponent(context.operation) : 'Operation'}`
              : context.operation 
                ? `Focusing on operation: ${decodeURIComponent(context.operation)}`
                : `Viewing tasks for: ${context.partName ? decodeURIComponent(context.partName) : 'this part'}`,
          });
        }, 1000);
      }
    }
  }, [toast]);

  // Load archive data when job/part information becomes available
  useEffect(() => {
    const loadArchiveHistory = async () => {
      if (!job?.item?.partName && !navigationContext.partName) return;

      setIsLoadingArchives(true);
      try {
        const partName = navigationContext.partName || job?.item?.partName;
        if (partName) {
          // Get archive history for this part
          const archives = await getPartArchiveHistory(decodeURIComponent(partName));
          setArchiveHistory(archives);

          // Calculate basic stats
          if (archives.length > 0) {
            const stats = {
              totalArchives: archives.length,
              avgQualityScore: archives.reduce((sum, arc) => sum + (arc.performanceData.qualityScore || 0), 0) / archives.length,
              avgDuration: archives.reduce((sum, arc) => sum + (arc.performanceData.totalDuration || 0), 0) / archives.length,
              successfulJobs: archives.filter(arc => arc.archiveType === 'completed').length
            };
            setArchiveStats(stats);
          }
        }
      } catch (error) {
        console.error('Failed to load archive history:', error);
      } finally {
        setIsLoadingArchives(false);
      }
    };

    loadArchiveHistory();
  }, [job, navigationContext.partName]);

  // Check pattern eligibility and auto-archive when all tasks are completed
  useEffect(() => {
    const checkCompletionAndArchive = async () => {
      if (!job || tasks.length === 0) return;

      const allTasksCompleted = tasks.every(task => task.status === 'completed');
      
      if (allTasksCompleted && !isPatternEligible) {
        console.log('🎯 All tasks completed! Starting auto-archival and pattern eligibility checks...');
        
        try {
          // Step 1: Update job status to Completed if not already
          if (job.status !== 'Completed') {
            console.log('📋 Updating job status to Completed...');
            await updateJobStatus(job.id, 'Completed');
            
            // Update local job state
            setJob(prevJob => prevJob ? { ...prevJob, status: 'Completed' } : null);
          }
          
          // Step 2: Auto-archive the completed job
          console.log('🗄️ Auto-archiving completed job...');
          const archiveResult = await archiveCompletedJob(
            { ...job, status: 'Completed' }, // Ensure job status is Completed
            tasks,
            [], // Subtasks - empty for now, could be extracted from tasks if needed
            'Auto-archived on job completion',
            'system'
          );
          
          if (archiveResult.success) {
            console.log(`✅ Successfully auto-archived job ${job.id} as ${archiveResult.archiveId}`);
            toast({
              title: "Job Completed & Archived",
              description: `${job.item.partName} has been completed and automatically archived for future reference`,
            });
          } else {
            console.error('❌ Auto-archival failed:', archiveResult.errors);
            toast({
              title: "Archive Warning",
              description: "Job completed but archival failed. Manufacturing data may not be preserved.",
              variant: "destructive",
            });
          }
          
          // Step 3: Check pattern eligibility
          setIsPatternEligible(true);
          
          // Step 4: Show pattern creation suggestion after a delay
          setTimeout(() => {
            if (!job.createdFromPatternId) { // Don't suggest pattern creation for jobs already created from patterns
              setShowPatternDialog(true);
            }
          }, 3000); // Slightly longer delay to allow archive toast to show first
          
        } catch (error) {
          console.error('❌ Error in completion and archival process:', error);
          toast({
            title: "Completion Error",
            description: error instanceof Error ? error.message : "Error processing job completion",
            variant: "destructive",
          });
        }
      }
    };

    checkCompletionAndArchive();
  }, [tasks, job, isPatternEligible, toast]);

  // Load job data from Firebase based on jobId
  useEffect(() => {
    const loadJobData = async () => {
      if (!jobId) {
        console.error('No jobId provided');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Loading job data for jobId:', jobId);
        
        // Parse jobId to get orderId and item info
        // Handle multiple formats:
        // Format 1: "orderId-item-itemId" (simple)
        // Format 2: "orderId-item-item-timestamp_process_number" (from scheduled operations)
        // Format 3: "orderId-item-itemId-lot-X" (new lot tracking format)
        let orderId: string;
        let itemIdentifier: string;
        
        if (jobId.includes('-lot-')) {
          // Format 3: New lot tracking format
          // Example: "US79vk4atjm0GuwoYNWJ-item-0-lot-2"
          const parts = jobId.split('-lot-')[0]; // Remove lot part for parsing
          const jobIdParts = parts.split('-item-');
          if (jobIdParts.length !== 2) {
            console.error('Invalid lot-based jobId format:', jobId);
            throw new Error(`Invalid job ID format: ${jobId}`);
          }
          orderId = jobIdParts[0];
          itemIdentifier = jobIdParts[1];
          console.log('Parsed lot-based jobId - orderId:', orderId, 'itemIdentifier:', itemIdentifier);
        } else if (jobId.includes('-item-item-')) {
          // Format 2: Complex format from scheduled operations
          // Example: "US79vk4atjm0GuwoYNWJ-item-item-1750022800962_4-axis_milling_3"
          const parts = jobId.split('-item-item-');
          if (parts.length !== 2) {
            console.error('Invalid complex jobId format:', jobId);
            throw new Error(`Invalid job ID format: ${jobId}`);
          }
          orderId = parts[0];
          itemIdentifier = `item-${parts[1]}`; // Re-add the "item-" prefix
          console.log('Parsed complex jobId - orderId:', orderId, 'itemIdentifier:', itemIdentifier);
        } else if (jobId.includes('-item-')) {
          // Format 1: Simple format from order-to-job conversion
          const jobIdParts = jobId.split('-item-');
          if (jobIdParts.length !== 2) {
            console.error('Invalid simple jobId format:', jobId);
            throw new Error(`Invalid job ID format: ${jobId}`);
          }
          orderId = jobIdParts[0];
          itemIdentifier = jobIdParts[1];
          console.log('Parsed simple jobId - orderId:', orderId, 'itemIdentifier:', itemIdentifier);
        } else {
          console.error('Unrecognized jobId format:', jobId);
          throw new Error(`Unrecognized job ID format: ${jobId}`);
        }

        // Load order data from Firebase
        const ordersQuery = query(
          collection(db, 'orders'),
          where('__name__', '==', orderId)
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        
        if (ordersSnapshot.empty) {
          console.error('Order not found:', orderId);
          throw new Error(`Order not found: ${orderId}`);
        }

        const orderDoc = ordersSnapshot.docs[0];
        const orderData = orderDoc.data() as OrderFirestoreData;
        console.log('Order data loaded:', orderData);
        console.log('Order items:', orderData.items);
        
        // Find the specific item
        let targetItem = null;
        let itemIndex = -1;
        
        // Enhanced item finding logic with better debugging
        if (!orderData.items || orderData.items.length === 0) {
          console.error('No items found in order:', orderData);
          throw new Error('No items found in order');
        }

        // Enhanced item finding logic to handle multiple formats
        console.log('Item finding - Available items:', orderData.items.map((item, idx) => ({ 
          index: idx, 
          id: item.id, 
          partName: item.partName 
        })));
        console.log('Looking for itemIdentifier:', itemIdentifier);
        
        // Format 1: Direct item.id match
        targetItem = orderData.items.find((item, index) => {
          console.log(`Checking item ${index}:`, item, 'item.id:', item.id, 'looking for:', itemIdentifier);
          if (item.id === itemIdentifier) {
            itemIndex = index;
            console.log('Found item by ID at index:', index);
            return true;
          }
          return false;
        });

        // Format 2: Handle complex scheduled operation format (item-timestamp_process_number)
        if (!targetItem && itemIdentifier.startsWith('item-') && itemIdentifier.includes('_')) {
          console.log('Detected complex scheduled operation format, using first available item as fallback');
          // For scheduled operations, we often just need to pick the first item since the operation
          // is specific to a job that was already created from a specific item
          if (orderData.items.length > 0) {
            targetItem = orderData.items[0];
            itemIndex = 0;
            console.log('Using first item as fallback for scheduled operation:', targetItem);
          }
        }

        // Format 3: Handle "item-{index}" format (fallback from OrderToJobConverter)
        if (!targetItem && itemIdentifier.startsWith('item-')) {
          const indexPart = itemIdentifier.replace('item-', '');
          const indexToFind = parseInt(indexPart);
          if (!isNaN(indexToFind) && indexToFind >= 0 && indexToFind < orderData.items.length) {
            targetItem = orderData.items[indexToFind];
            itemIndex = indexToFind;
            console.log('Found item by "item-{index}" format:', indexToFind, targetItem);
          }
        }

        // Format 4: Direct index number
        if (!targetItem) {
          const indexToFind = parseInt(itemIdentifier);
          if (!isNaN(indexToFind) && indexToFind >= 0 && indexToFind < orderData.items.length) {
            targetItem = orderData.items[indexToFind];
            itemIndex = indexToFind;
            console.log('Found item by index number:', indexToFind, targetItem);
          }
        }

        // Format 5: String comparison with index
        if (!targetItem) {
          targetItem = orderData.items.find((item, index) => {
            if (index.toString() === itemIdentifier) {
              itemIndex = index;
              console.log('Found item by string index comparison at:', index);
              return true;
            }
            return false;
          });
        }

        if (!targetItem) {
          console.error('Item not found - available items:', orderData.items.map((item, idx) => ({ 
            index: idx, 
            id: item.id, 
            partName: item.partName 
          })));
          console.error('Looking for identifier:', itemIdentifier);
          throw new Error(`Item not found in order. Available items: ${orderData.items.length}, Looking for: ${itemIdentifier}`);
        }

        console.log('Successfully found item:', targetItem, 'at index:', itemIndex);

        // Create job object
        const jobData: Job = {
          id: jobId,
          orderId: orderDoc.id,
          orderNumber: orderData.orderNumber,
          clientName: orderData.clientName,
          item: {
            ...targetItem,
            rawMaterialType: targetItem.rawMaterialType || '',
            rawMaterialDimension: targetItem.rawMaterialDimension || '',
            assignedProcesses: targetItem.assignedProcesses || [],
            attachments: targetItem.attachments || [],
          },
          status: "In Progress", // Default status
        };

        setJob(jobData);

        // Now load tasks for this job
        const firestoreTasks = await loadJobTasks(jobId);
        if (firestoreTasks.length > 0) {
          setTasks(firestoreTasks);
        } else {
          // Generate tasks if none exist
          const generatedTasks = generateJobTasks(jobData);
          setTasks(generatedTasks);
          
          // Show a toast that tasks are generated from templates
          toast({
            title: "Tasks Generated",
            description: "No existing tasks found. Generated from templates.",
          });
        }
      } catch (error) {
        console.error('Failed to load job data:', error);
        toast({
          title: "Error Loading Job",
          description: error instanceof Error ? error.message : "Could not load job data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadJobData();
  }, [jobId, toast]);

  // Effect to show toast notifications for task updates
  useEffect(() => {
    if (lastTaskUpdate) {
      toast({
        title: "Task Updated",
        description: `${lastTaskUpdate.taskName} status changed to ${lastTaskUpdate.status.replace('_', ' ')}`,
      });
      setLastTaskUpdate(null);
    }
  }, [lastTaskUpdate, toast]);

  const handleTaskStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus, qualityResult?: QualityResult) => {
    if (!job) return;
    
    // Find the task name for the toast before updating state
    const taskToUpdate = tasks.find(task => task.id === taskId);
    if (!taskToUpdate) return;
    
    setTasks(prevTasks => 
      prevTasks.map(task => {
        if (task.id === taskId) {
          // If completing with quality assessment, use the quality-aware completion
          if (newStatus === 'completed' && qualityResult) {
            // Use quality-aware task completion
            completeTrackedTask(task, qualityResult, undefined, 'current-user')
              .then(updatedTask => {
                // Update the task in state with the completed task
                setTasks(currentTasks => 
                  currentTasks.map(t => t.id === taskId ? updatedTask : t)
                );
              })
              .catch(error => {
                console.error('Failed to complete task with quality tracking:', error);
                setTimeout(() => {
                  toast({
                    title: "Quality Completion Failed",
                    description: "Task completion with quality tracking failed",
                    variant: "destructive",
                  });
                }, 0);
              });
            
            // Return the task with basic completion for immediate UI update
            return updateTaskStatus(task, newStatus, 'current-user');
          } else {
            // Use standard task completion
            const updatedTask = updateTaskStatus(task, newStatus, 'current-user');
            
            // Save to Firebase asynchronously
            updateTaskInFirestore(updatedTask).catch(error => {
              console.error('Failed to save task to Firebase:', error);
              setTimeout(() => {
                toast({
                  title: "Save Failed",
                  description: "Task update not saved to database",
                  variant: "destructive",
                });
              }, 0);
            });
            
            return updatedTask;
          }
        }
        return task;
      })
    );
    
    // Trigger toast via useEffect instead of calling directly
    setLastTaskUpdate({
      taskId,
      taskName: taskToUpdate.name,
      status: newStatus
    });
  }, [job, tasks, toast]);

  const handleSubtaskToggle = useCallback(async (subtaskId: string, checked: boolean) => {
    if (!job) return;
    
    // Find the subtask name for the toast before updating state
    let subtaskToUpdate: JobSubtask | null = null;
    for (const task of tasks) {
      const found = task.subtasks.find(s => s.id === subtaskId);
      if (found) {
        subtaskToUpdate = found;
        break;
      }
    }
    if (!subtaskToUpdate) return;
    
    setTasks(prevTasks =>
      prevTasks.map(task => ({
        ...task,
        subtasks: task.subtasks.map(subtask => {
          if (subtask.id === subtaskId) {
            const updatedSubtask = updateSubtaskStatus(
              subtask, 
              checked, 
              'current-user',
              subtask.notes
            );
            
            // Save to Firebase asynchronously - but only if document exists
            updateSubtaskInFirestore(updatedSubtask).catch(error => {
              console.error('Failed to save subtask to Firebase:', error);
              // Use setTimeout to avoid setState during render
              setTimeout(() => {
                toast({
                  title: "Save Failed",
                  description: "Subtask update not saved to database. Document may not exist.",
                  variant: "destructive",
                });
              }, 0);
            });
            
            return updatedSubtask;
          }
          return subtask;
        })
      }))
    );
    
    // Show toast after state update
    setTimeout(() => {
      toast({
        title: `Subtask ${checked ? 'Completed' : 'Unchecked'}`,
        description: subtaskToUpdate.name,
      });
    }, 0);
  }, [job, tasks, toast]);

  // Pattern creation handlers
  const handlePatternCreated = (patternId: string, patternName: string) => {
    toast({
      title: "Pattern Created Successfully",
      description: `Manufacturing pattern "${patternName}" is now available for future jobs`,
    });
    
    // Mark job as used for pattern creation
    if (job) {
      // Could update job status or add metadata here
    }
  };

  const handleClosePatternDialog = () => {
    setShowPatternDialog(false);
  };

  const handleSubtaskNotesChange = useCallback(async (subtaskId: string, notes: string) => {
    if (!job) return;
    
    setTasks(prevTasks =>
      prevTasks.map(task => ({
        ...task,
        subtasks: task.subtasks.map(subtask => {
          if (subtask.id === subtaskId) {
            const updatedSubtask = { 
              ...subtask, 
              notes, 
              updatedAt: new Date().toISOString() 
            };
            
            // Save to Firebase asynchronously - but only if document exists
            updateSubtaskInFirestore(updatedSubtask).catch(error => {
              console.error('Failed to save subtask notes to Firebase:', error);
            });
            
            return updatedSubtask;
          }
          return subtask;
        })
      }))
    );
  }, [job, tasks]);

  // Manual save function for generated tasks
  const handleSaveTasksToFirebase = async () => {
    if (!job || tasks.length === 0) return;

    try {
      await saveJobTasks(job.id, tasks);
      toast({
        title: "Tasks Saved Successfully",
        description: `Saved ${tasks.length} tasks to Firebase`,
      });
    } catch (error) {
      console.error('Failed to save tasks:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Could not save tasks to Firebase",
        variant: "destructive",
      });
    }
  };

  const jobProgress = calculateJobProgress(tasks);
  const nextTasks = getNextAvailableTasks(tasks);

  // Show loading state
  if (isLoading || !job) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading job and tasks...</p>
        </div>
      </div>
    );
  }

  // Check if tasks were generated vs loaded from Firebase
  const tasksFromFirebase = tasks.length > 0 && tasks.some(task => task.createdAt);
  const needsSaving = !tasksFromFirebase;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Tasks: ${job?.item.partName}`}
        description={`${job?.clientName} • ${job?.orderNumber} • Task management and progress tracking`}
        actions={
          <div className="flex gap-2">
            {navigationContext.fromCalendar ? (
              <Button variant="outline" onClick={() => router.push('/planning/manufacturing-calendar')}>
                <Calendar className="mr-2 h-4 w-4" />
                Back to Calendar
              </Button>
            ) : (
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Jobs
              </Button>
            )}
            {needsSaving && (
              <Button onClick={handleSaveTasksToFirebase}>
                <Download className="mr-2 h-4 w-4" />
                Save to Firebase
              </Button>
            )}
          </div>
        }
      />

      {/* Job Progress Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{jobProgress.overallProgress}%</div>
              <div className="text-sm text-muted-foreground">Overall Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {jobProgress.completedTasks}/{jobProgress.totalTasks}
              </div>
              <div className="text-sm text-muted-foreground">Tasks Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {jobProgress.completedSubtasks}/{jobProgress.totalSubtasks}
              </div>
              <div className="text-sm text-muted-foreground">Subtasks Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{nextTasks.length}</div>
              <div className="text-sm text-muted-foreground">Available Tasks</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Archive Intelligence Context - Enhanced */}
      {job && (
        <UnifiedArchiveInterface
          mode="embedded"
          partName={job.item.partName}
          initialLoad={true}
          showStatistics={false}
          showIntelligence={true}
          showArchiveTable={false}
          enableSearch={false}
          className="mb-4"
          maxHeight="400px"
        />
      )}

      {/* Tasks Grid */}
      <div className="grid gap-6">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            job={job}
            allTasks={tasks}
            onStatusChange={handleTaskStatusChange}
            onSubtaskToggle={handleSubtaskToggle}
            onSubtaskNotesChange={handleSubtaskNotesChange}
            toast={toast}
          />
        ))}
      </div>

      {/* Pattern Creation Dialog */}
      {job && (
        <PatternCreationDialog
          job={job}
          tasks={tasks}
          isOpen={showPatternDialog}
          onClose={handleClosePatternDialog}
          onPatternCreated={handlePatternCreated}
        />
      )}
    </div>
  );
} 