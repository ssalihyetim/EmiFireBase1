"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Cog, 
  CheckSquare, 
  FileText, 
  Settings, 
  Clock,
  AlertCircle,
  Wrench,
  ClipboardList,
  Eye,
  ShieldCheck,
  Zap,
  Calendar
} from 'lucide-react';
import { generateJobTasks } from '@/lib/task-automation';
import { getStandardManufacturingSubtasks, getNonManufacturingTaskSubtasks } from '@/config/subtask-templates';
import { MANUFACTURING_PROCESS_TEMPLATES, NON_MANUFACTURING_TASK_TEMPLATES } from '@/config/task-templates';
import { TaskEditor } from '@/components/task-automation/task-editor';
import type { Job, JobTask, JobSubtask } from '@/types';
import type { TaskTemplate, SubtaskTemplate, ManufacturingSubtaskType } from '@/types/tasks';

// Mock order data for demonstration
const mockOrder: Job = {
  id: 'JOB-2024-001',
  orderId: 'ORDER-2024-001',
  orderNumber: 'ORD-2024-001',
  clientName: 'Aerospace Components Ltd',
  item: {
    id: 'ITEM-001',
    partName: 'Aerospace Valve Housing',
    rawMaterialType: 'Aluminum 7075-T6',
    rawMaterialDimension: '100x50x25mm',
    materialCost: 150,
    machiningCost: 850,
    outsourcedProcessesCost: 200,
    unitPrice: 1200,
    quantity: 25,
    totalPrice: 30000,
    assignedProcesses: ['Turning', '3-Axis Milling', '5-Axis Milling']
  },
  status: 'In Progress'
};

const TaskAutomationPage: React.FC = () => {
  const [generatedTasks, setGeneratedTasks] = useState<JobTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<JobTask | null>(null);
  const [selectedSubtask, setSelectedSubtask] = useState<JobSubtask | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateTasks = async () => {
    setIsGenerating(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const tasks = generateJobTasks(mockOrder);
      setGeneratedTasks(tasks);
      
      // Auto-select first task for preview
      if (tasks.length > 0) {
        setSelectedTask(tasks[0]);
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTaskUpdate = (updatedTask: JobTask) => {
    setGeneratedTasks(prev => 
      prev.map(task => task.id === updatedTask.id ? updatedTask : task)
    );
    setSelectedTask(updatedTask);
  };

  const getSubtaskIcon = (subtaskType?: ManufacturingSubtaskType) => {
    switch (subtaskType) {
      case 'setup_sheet': return <FileText className="h-4 w-4" />;
      case 'tool_list': return <Wrench className="h-4 w-4" />;
      case 'tool_life_verification': return <ShieldCheck className="h-4 w-4" />;
      case 'machining': return <Cog className="h-4 w-4" />;
      case 'fai': return <CheckSquare className="h-4 w-4" />;
      default: return <ClipboardList className="h-4 w-4" />;
    }
  };

  const getSubtaskColor = (subtaskType?: ManufacturingSubtaskType) => {
    switch (subtaskType) {
      case 'setup_sheet': return 'bg-blue-100 text-blue-800';
      case 'tool_list': return 'bg-purple-100 text-purple-800';
      case 'tool_life_verification': return 'bg-green-100 text-green-800';
      case 'machining': return 'bg-orange-100 text-orange-800';
      case 'fai': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Automation</h1>
          <p className="text-muted-foreground mt-2">
            Automatically generate tasks and subtasks for accepted orders with AS9100D compliance
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Zap className="h-4 w-4 mr-2" />
          Automated Workflow
        </Badge>
      </div>

      {/* Demo Order Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Demo Order: {mockOrder.item.partName}
          </CardTitle>
          <CardDescription>
            This demonstration shows how tasks are automatically generated for accepted manufacturing orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium">Part Number</p>
              <p className="text-lg">{mockOrder.item.partName}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Quantity</p>
              <p className="text-lg">{mockOrder.item.quantity} pieces</p>
            </div>
            <div>
              <p className="text-sm font-medium">Material</p>
              <p className="text-lg">{mockOrder.item.rawMaterialType}</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div>
            <p className="text-sm font-medium mb-2">Assigned Manufacturing Processes</p>
            <div className="flex flex-wrap gap-2">
              {mockOrder.item.assignedProcesses?.map((process, index) => (
                <Badge key={index} variant="outline">
                  <Cog className="h-3 w-3 mr-1" />
                  {process}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <Button 
              onClick={handleGenerateTasks} 
              disabled={isGenerating}
              className="w-full md:w-auto"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Generating Tasks...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Generate Tasks & Subtasks
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Tasks */}
      {generatedTasks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Generated Tasks</CardTitle>
              <CardDescription>
                {generatedTasks.length} tasks created automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {generatedTasks.map((task, index) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTask?.id === task.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {task.category === 'manufacturing_process' ? (
                            <Cog className="h-4 w-4 text-orange-600" />
                          ) : (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          )}
                          <span className="font-medium text-sm">{task.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {task.subtasks.length} subtasks
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Task Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedTask?.category === 'manufacturing_process' ? (
                  <Cog className="h-5 w-5 text-orange-600" />
                ) : (
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                )}
                {selectedTask?.name || 'Select a task to view details'}
              </CardTitle>
              {selectedTask && (
                <div className="flex items-center gap-2">
                  <Badge variant={selectedTask.category === 'manufacturing_process' ? 'default' : 'secondary'}>
                    {selectedTask.category === 'manufacturing_process' ? 'Manufacturing Process' : 'Non-Manufacturing Task'}
                  </Badge>
                  <Badge variant="outline">
                    AS9100D: {selectedTask.as9100dClause}
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {selectedTask ? (
                <Tabs defaultValue="subtasks">
                  <TabsList>
                    <TabsTrigger value="subtasks">Subtasks & Forms</TabsTrigger>
                    <TabsTrigger value="details">Task Details</TabsTrigger>
                    <TabsTrigger value="edit">Edit Task</TabsTrigger>
                  </TabsList>

                  <TabsContent value="subtasks" className="space-y-4">
                    <div className="grid gap-3">
                      {selectedTask.subtasks.map((subtask: JobSubtask, index: number) => (
                        <div
                          key={subtask.id}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedSubtask?.id === subtask.id 
                              ? 'bg-primary/10 border-primary' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedSubtask(subtask)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getSubtaskIcon(subtask.manufacturingSubtaskType)}
                              <span className="font-medium">{subtask.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {subtask.isSchedulable && (
                                <Badge variant="default" className="text-xs">
                                  Schedulable
                                </Badge>
                              )}
                              {subtask.isPrintable && (
                                <Badge variant="outline" className="text-xs">
                                  <FileText className="h-3 w-3 mr-1" />
                                  Form
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {subtask.description}
                          </p>
                          {subtask.instructions && (
                            <p className="text-xs bg-muted p-2 rounded">
                              <strong>Instructions:</strong> {subtask.instructions}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                            <span>Duration: {subtask.estimatedDurationMinutes} min</span>
                            {subtask.manufacturingSubtaskType && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getSubtaskColor(subtask.manufacturingSubtaskType)}`}
                              >
                                {subtask.manufacturingSubtaskType.replace('_', ' ').toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Basic Information</h4>
                        <div className="space-y-2 text-sm">
                          <div><strong>Category:</strong> {selectedTask.category}</div>
                          <div><strong>Priority:</strong> {selectedTask.priority}</div>
                          <div><strong>Duration:</strong> {selectedTask.estimatedDurationHours}h</div>
                          <div><strong>AS9100D Clause:</strong> {selectedTask.as9100dClause}</div>
                        </div>
                      </div>
                      {selectedTask.category === 'manufacturing_process' && (
                        <div>
                          <h4 className="font-medium mb-2">Manufacturing Details</h4>
                          <div className="space-y-2 text-sm">
                            <div><strong>Process Type:</strong> {selectedTask.manufacturingProcessType}</div>
                            <div><strong>Machine Type:</strong> {selectedTask.machineType}</div>
                            <div><strong>Setup Time:</strong> {selectedTask.setupTimeMinutes} min</div>
                            <div><strong>Cycle Time:</strong> {selectedTask.cycleTimeMinutes} min</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {selectedTask.requiredDocuments && selectedTask.requiredDocuments.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Required Documents</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedTask.requiredDocuments.map((doc: string, index: number) => (
                            <Badge key={index} variant="outline">
                              <FileText className="h-3 w-3 mr-1" />
                              {doc.replace('_', ' ').toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="edit" className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="h-4 w-4" />
                        <span className="font-medium">Task Modification</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Use the task editor to modify task properties, subtasks, and requirements while maintaining AS9100D compliance.
                      </p>
                      
                      <TaskEditor 
                        task={selectedTask}
                        onSave={handleTaskUpdate}
                        trigger={
                          <Button variant="outline">
                            <Settings className="h-4 w-4 mr-2" />
                            Open Task Editor
                          </Button>
                        }
                      />

                      <div className="mt-4">
                        <h5 className="font-medium mb-2">Available Modifications:</h5>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Task priority and timing parameters</li>
                          <li>• Subtask requirements and sequences</li>
                          <li>• Manufacturing parameters (setup/cycle times)</li>
                          <li>• Required documentation and approvals</li>
                          <li>• Quality control checkpoints</li>
                          <li>• Custom subtask creation and removal</li>
                        </ul>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a task from the list to view details and forms</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Cog className="h-5 w-5" />
              Manufacturing Processes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Each manufacturing process automatically generates 5 standard subtasks:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Setup Sheet</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wrench className="h-4 w-4 text-purple-600" />
                <span>Tool List</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span>Tool Life Verification</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Cog className="h-4 w-4 text-orange-600" />
                <span>Machining (Schedulable)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckSquare className="h-4 w-4 text-red-600" />
                <span>FAI - First Article Inspection</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Non-Manufacturing Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Compulsory tasks for every job:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                <span>Contract Review</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckSquare className="h-4 w-4 text-green-600" />
                <span>Material Approval</span>
                <Badge variant="outline" className="ml-2 text-xs">+Traceability</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span>Lot Based Production Planning</span>
                <Badge variant="outline" className="ml-2 text-xs">4 Subtasks</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckSquare className="h-4 w-4 text-orange-600" />
                <span>Final Inspection</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckSquare className="h-4 w-4 text-gray-600" />
                <span>Packaging & Shipping</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              AS9100D Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              All tasks maintain full traceability:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span>Quality Documentation</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Process Records</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ClipboardList className="h-4 w-4 text-orange-600" />
                <span>Inspection Reports</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span>FAI & Traceability</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaskAutomationPage; 