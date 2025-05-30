'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Settings, Wrench, Plus, Download, Printer } from 'lucide-react';
import RoutingSheetForm from '@/components/manufacturing/RoutingSheetForm';
import SetupSheetForm from '@/components/manufacturing/SetupSheetForm';
import ToolListForm from '@/components/manufacturing/ToolListForm';
import { 
  RoutingSheet, 
  SetupSheet, 
  ToolList 
} from '@/types/manufacturing-templates';
import { 
  getRoutingSheetsByJob, 
  getSetupSheetsBySubtask, 
  getToolListsByJob 
} from '@/lib/firebase-manufacturing';
import { loadJobTasks } from '@/lib/firebase-tasks';
import { JobTask, JobSubtask } from '@/types/tasks';
import { toast } from 'sonner';

interface JobInfo {
  orderId: string;
  itemIdentifier: string;
  customerName: string;
  orderNumber: string;
}

export default function ManufacturingTemplatesPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<JobTask[]>([]);
  const [routingSheets, setRoutingSheets] = useState<RoutingSheet[]>([]);
  const [setupSheets, setSetupSheets] = useState<SetupSheet[]>([]);
  const [toolLists, setToolLists] = useState<ToolList[]>([]);
  const [selectedTask, setSelectedTask] = useState<JobTask | null>(null);
  const [selectedSubtask, setSelectedSubtask] = useState<JobSubtask | null>(null);
  const [activeTab, setActiveTab] = useState<'routing' | 'setup' | 'tools'>('routing');
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);

  useEffect(() => {
    if (jobId) {
      loadJobData();
    }
  }, [jobId]);

  const loadJobData = async () => {
    setIsLoading(true);
    try {
      // Parse jobId (format: orderId-item-itemIdentifier)
      const jobParts = jobId.split('-');
      if (jobParts.length >= 3) {
        const orderId = jobParts[0];
        const itemIdentifier = jobParts.slice(2).join('-');
        
        setJobInfo({
          orderId,
          itemIdentifier,
          customerName: 'Customer Name', // This should come from order data
          orderNumber: orderId
        });
      }

      // Load tasks
      const loadedTasks = await loadJobTasks(jobId);
      setTasks(loadedTasks);
      
      if (loadedTasks.length > 0) {
        setSelectedTask(loadedTasks[0]);
      }

      // Load existing templates
      await Promise.all([
        loadRoutingSheets(),
        loadSetupSheets(),
        loadToolLists()
      ]);
    } catch (error) {
      console.error('Error loading job data:', error);
      toast.error('Failed to load job data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoutingSheets = async () => {
    try {
      const sheets = await getRoutingSheetsByJob(jobId);
      setRoutingSheets(sheets);
    } catch (error) {
      console.error('Error loading routing sheets:', error);
    }
  };

  const loadSetupSheets = async () => {
    try {
      // Load setup sheets for all subtasks
      const allSheets: SetupSheet[] = [];
      for (const task of tasks) {
        for (const subtask of task.subtasks || []) {
          const sheets = await getSetupSheetsBySubtask(subtask.id);
          allSheets.push(...sheets);
        }
      }
      setSetupSheets(allSheets);
    } catch (error) {
      console.error('Error loading setup sheets:', error);
    }
  };

  const loadToolLists = async () => {
    try {
      const lists = await getToolListsByJob(jobId);
      setToolLists(lists);
    } catch (error) {
      console.error('Error loading tool lists:', error);
    }
  };

  const handleCreateRoutingSheet = () => {
    if (!selectedTask || !jobInfo) return;
    // This will be handled by the RoutingSheetForm component
  };

  const handleCreateSetupSheet = () => {
    if (!selectedSubtask || !selectedTask || !jobInfo) return;
    // This will be handled by the SetupSheetForm component
  };

  const handleCreateToolList = () => {
    if (!selectedTask || !jobInfo) return;
    // This will be handled by the ToolListForm component
  };

  const getTaskRoutingSheets = (taskId: string) => {
    return routingSheets.filter(sheet => sheet.taskId === taskId);
  };

  const getSubtaskSetupSheets = (subtaskId: string) => {
    return setupSheets.filter(sheet => sheet.subtaskId === subtaskId);
  };

  const getTaskToolLists = (taskId: string) => {
    return toolLists.filter(list => list.taskId === taskId);
  };

  const printAllTemplates = () => {
    window.print();
  };

  const exportAllTemplates = async () => {
    // This would implement PDF export functionality
    toast.info('Export functionality coming soon');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading manufacturing templates...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manufacturing Templates</h1>
          <p className="text-muted-foreground">
            Job: {jobId} | {jobInfo?.customerName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printAllTemplates}>
            <Printer className="h-4 w-4 mr-2" />
            Print All
          </Button>
          <Button variant="outline" onClick={exportAllTemplates}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Task Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Task & Subtask</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Task Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Task</label>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTask?.id === task.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => {
                      setSelectedTask(task);
                      setSelectedSubtask(null);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{task.name}</div>
                        <div className="text-sm text-muted-foreground">{task.description}</div>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="outline">
                          {getTaskRoutingSheets(task.id).length} routing
                        </Badge>
                        <Badge variant="outline">
                          {getTaskToolLists(task.id).length} tools
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subtask Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Subtask (for Setup Sheets)</label>
              <div className="space-y-2">
                {selectedTask?.subtasks?.map((subtask: JobSubtask) => (
                  <div
                    key={subtask.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSubtask?.id === subtask.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedSubtask(subtask)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{subtask.name}</div>
                        <div className="text-sm text-muted-foreground">{subtask.description}</div>
                      </div>
                      <Badge variant="outline">
                        {getSubtaskSetupSheets(subtask.id).length} setup
                      </Badge>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-4 text-muted-foreground">
                    Select a task to view its subtasks
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="routing" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Routing Sheets
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Setup Sheets
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Tool Lists
          </TabsTrigger>
        </TabsList>

        {/* Routing Sheets Tab */}
        <TabsContent value="routing">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Routing Sheets (Shop Travelers)</CardTitle>
              <Button 
                onClick={handleCreateRoutingSheet} 
                disabled={!selectedTask}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Routing Sheet
              </Button>
            </CardHeader>
            <CardContent>
              {selectedTask && jobInfo ? (
                <div className="space-y-6">
                  {/* Existing Routing Sheets */}
                  {getTaskRoutingSheets(selectedTask.id).map((sheet) => (
                    <div key={sheet.id}>
                      <h3 className="text-lg font-semibold mb-4">
                        Routing Sheet - {sheet.partName}
                        <Badge className="ml-2">{sheet.status}</Badge>
                      </h3>
                      <RoutingSheetForm
                        jobId={jobId}
                        taskId={selectedTask.id}
                        partName={selectedTask.name}
                        customerName={jobInfo.customerName}
                        orderNumber={jobInfo.orderNumber}
                        initialData={sheet}
                        onSave={() => loadRoutingSheets()}
                      />
                    </div>
                  ))}

                  {/* Create New Routing Sheet */}
                  {getTaskRoutingSheets(selectedTask.id).length === 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        New Routing Sheet - {selectedTask.name}
                      </h3>
                      <RoutingSheetForm
                        jobId={jobId}
                        taskId={selectedTask.id}
                        partName={selectedTask.name}
                        customerName={jobInfo.customerName}
                        orderNumber={jobInfo.orderNumber}
                        onSave={() => loadRoutingSheets()}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a task to create or view routing sheets
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Setup Sheets Tab */}
        <TabsContent value="setup">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Setup Sheets</CardTitle>
              <Button 
                onClick={handleCreateSetupSheet} 
                disabled={!selectedSubtask}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Setup Sheet
              </Button>
            </CardHeader>
            <CardContent>
              {selectedSubtask && selectedTask ? (
                <div className="space-y-6">
                  {/* Existing Setup Sheets */}
                  {getSubtaskSetupSheets(selectedSubtask.id).map((sheet) => (
                    <div key={sheet.id}>
                      <h3 className="text-lg font-semibold mb-4">
                        Setup Sheet - {sheet.processName}
                        <Badge className="ml-2">{sheet.status}</Badge>
                      </h3>
                      <SetupSheetForm
                        subtaskId={selectedSubtask.id}
                        jobId={jobId}
                        taskId={selectedTask.id}
                        processName={selectedSubtask.name}
                        machineNumber={'TBD'}
                        initialData={sheet}
                        onSave={() => loadSetupSheets()}
                      />
                    </div>
                  ))}

                  {/* Create New Setup Sheet */}
                  {getSubtaskSetupSheets(selectedSubtask.id).length === 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        New Setup Sheet - {selectedSubtask.name}
                      </h3>
                      <SetupSheetForm
                        subtaskId={selectedSubtask.id}
                        jobId={jobId}
                        taskId={selectedTask.id}
                        processName={selectedSubtask.name}
                        machineNumber={'TBD'}
                        onSave={() => loadSetupSheets()}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a subtask to create or view setup sheets
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tool Lists Tab */}
        <TabsContent value="tools">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tool Lists</CardTitle>
              <Button 
                onClick={handleCreateToolList} 
                disabled={!selectedTask}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Tool List
              </Button>
            </CardHeader>
            <CardContent>
              {selectedTask ? (
                <div className="space-y-6">
                  {/* Existing Tool Lists */}
                  {getTaskToolLists(selectedTask.id).map((toolList) => (
                    <div key={toolList.id}>
                      <h3 className="text-lg font-semibold mb-4">
                        Tool List - {toolList.processName}
                        <Badge className="ml-2">{toolList.status}</Badge>
                      </h3>
                      <ToolListForm
                        processName={toolList.processName}
                        machineNumber={toolList.machineNumber}
                        subtaskId={selectedSubtask?.id}
                        jobId={jobId}
                        taskId={selectedTask.id}
                        initialData={toolList}
                        onSave={() => loadToolLists()}
                      />
                    </div>
                  ))}

                  {/* Create New Tool List */}
                  {getTaskToolLists(selectedTask.id).length === 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        New Tool List - {selectedTask.name}
                      </h3>
                      <ToolListForm
                        processName={selectedTask.name}
                        machineNumber={'TBD'}
                        subtaskId={selectedSubtask?.id}
                        jobId={jobId}
                        taskId={selectedTask.id}
                        onSave={() => loadToolLists()}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a task to create or view tool lists
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Routing Sheets</CardTitle>
            <FileText className="h-4 w-4 ml-auto" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routingSheets.length}</div>
            <p className="text-xs text-muted-foreground">
              Total routing sheets created
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Setup Sheets</CardTitle>
            <Settings className="h-4 w-4 ml-auto" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{setupSheets.length}</div>
            <p className="text-xs text-muted-foreground">
              Total setup sheets created
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tool Lists</CardTitle>
            <Wrench className="h-4 w-4 ml-auto" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{toolLists.length}</div>
            <p className="text-xs text-muted-foreground">
              Total tool lists created
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 