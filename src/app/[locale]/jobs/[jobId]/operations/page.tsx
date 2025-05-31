"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Play, 
  Clock, 
  Settings, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Copy,
  Calendar,
  Wrench,
  AlertTriangle,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  CheckSquare
} from "lucide-react";
import { ProcessInstance, Machine, MachineType, PriorityLevel } from "@/types/planning";
import { Job, OrderFirestoreData, JobTask } from "@/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { 
  generateUnifiedJobTasks, 
  syncTaskWithSchedule, 
  updateTaskFromOperation,
  createTaskFromOperation,
  taskToProcessInstance 
} from "@/lib/unified-task-automation";
import { saveJobTasks, loadJobTasks } from "@/lib/firebase-tasks";

// Process templates for operation creation
const OPERATION_TEMPLATES: Record<string, {
  machineType: MachineType;
  setupTimeMinutes: number;
  cycleTimeMinutes: number;
  requiredMachineCapabilities: string[];
  description: string;
}> = {
  "Turning": {
    machineType: "turning",
    setupTimeMinutes: 30,
    cycleTimeMinutes: 5,
    requiredMachineCapabilities: ["turning"],
    description: "CNC turning operation"
  },
  "3-Axis Milling": {
    machineType: "milling", 
    setupTimeMinutes: 45,
    cycleTimeMinutes: 15,
    requiredMachineCapabilities: ["3-axis-milling"],
    description: "3-axis CNC milling"
  },
  "4-Axis Milling": {
    machineType: "milling",
    setupTimeMinutes: 60,
    cycleTimeMinutes: 20,
    requiredMachineCapabilities: ["4-axis-milling"],
    description: "4-axis CNC milling"
  },
  "5-Axis Milling": {
    machineType: "5-axis",
    setupTimeMinutes: 90,
    cycleTimeMinutes: 30,
    requiredMachineCapabilities: ["5-axis-milling", "complex-geometry"],
    description: "5-axis CNC milling for complex parts"
  },
  "Grinding": {
    machineType: "milling",
    setupTimeMinutes: 25,
    cycleTimeMinutes: 8,
    requiredMachineCapabilities: ["precision"],
    description: "Precision grinding operation"
  },
  "Deburring": {
    machineType: "milling",
    setupTimeMinutes: 15,
    cycleTimeMinutes: 3,
    requiredMachineCapabilities: [],
    description: "Manual/automated deburring"
  }
};

type OperationStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'on_hold';

interface ExtendedProcessInstance extends ProcessInstance {
  status: OperationStatus;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  assignedMachine?: string;
  completionPercentage: number;
  notes?: string;
}

interface NextOperation {
  suggestedOperation: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  canStart: boolean;
  dependencies: string[];
}

export default function JobOperationsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [operations, setOperations] = useState<ExtendedProcessInstance[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [unifiedTasks, setUnifiedTasks] = useState<JobTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddOperation, setShowAddOperation] = useState(false);
  const [nextOperations, setNextOperations] = useState<NextOperation[]>([]);
  
  // New operation form state
  const [newOperation, setNewOperation] = useState({
    baseProcessName: '',
    setupTimeMinutes: 0,
    cycleTimeMinutes: 0,
    description: '',
    customerPriority: 'medium' as PriorityLevel,
    notes: ''
  });

  useEffect(() => {
    if (jobId) {
      loadJobData();
      loadMachines();
    }
  }, [jobId]);

  useEffect(() => {
    if (operations.length > 0 && job) {
      calculateNextOperations();
      syncWithUnifiedTasks();
    }
  }, [operations, job]);

  const loadJobData = async () => {
    try {
      // Parse jobId to get order and item info
      const [orderId, , ...itemParts] = jobId.split('-');
      const itemId = itemParts.join('-');
      
      // Get order data
      const orderDoc = await getDoc(doc(db, "orders", orderId));
      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }
      
      const orderData = orderDoc.data() as OrderFirestoreData;
      const targetItem = orderData.items.find(item => 
        item.id === itemId || 
        orderData.items.indexOf(item).toString() === itemId
      );
      
      if (!targetItem) {
        throw new Error('Item not found in order');
      }
      
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
        status: "In Progress",
      };
      
      setJob(jobData);
      
      // Create process instances from assigned processes
      const processInstances = createProcessInstancesFromJob(jobData);
      setOperations(processInstances);
      
      // Load or generate unified tasks
      await loadUnifiedTasks(jobData, processInstances);
      
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

  const loadMachines = async () => {
    try {
      const machinesSnapshot = await getDocs(collection(db, "machines"));
      const machineData: Machine[] = machinesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          type: data.type,
          model: data.model,
          isActive: data.isActive,
          capabilities: data.capabilities,
          hourlyRate: data.hourlyRate,
          currentWorkload: data.currentWorkload || 0,
          availableFrom: data.availableFrom,
          workingHours: data.workingHours,
          operatorRequired: data.operatorRequired,
          maintenanceWindows: data.maintenanceWindows || [],
          maintenanceSchedule: data.maintenanceSchedule,
          createdAt: data.createdAt?.toDate().toISOString(),
          updatedAt: data.updatedAt?.toDate().toISOString()
        } as Machine;
      });
      setMachines(machineData);
    } catch (error) {
      console.error('Failed to load machines:', error);
    }
  };

  const createProcessInstancesFromJob = (jobData: Job): ExtendedProcessInstance[] => {
    const assignedProcesses = jobData.item.assignedProcesses || [];
    const instances: ExtendedProcessInstance[] = [];
    
    assignedProcesses.forEach((processName, index) => {
      const template = OPERATION_TEMPLATES[processName];
      if (template) {
        const instance: ExtendedProcessInstance = {
          id: `${jobData.id}_${processName.toLowerCase().replace(/\s+/g, '_')}_${index + 1}`,
          baseProcessName: processName,
          instanceNumber: index + 1,
          displayName: `${processName} ${index + 1}`,
          machineType: template.machineType,
          setupTimeMinutes: template.setupTimeMinutes,
          cycleTimeMinutes: template.cycleTimeMinutes,
          description: template.description,
          requiredMachineCapabilities: template.requiredMachineCapabilities,
          orderIndex: index + 1,
          estimatedCost: 0,
          dependencies: [],
          quantity: jobData.item.quantity,
          customerPriority: 'medium',
          offerId: jobData.orderId,
          status: index === 0 ? 'pending' : 'pending',
          completionPercentage: 0
        };
        instances.push(instance);
      }
    });
    
    return instances;
  };

  const calculateNextOperations = () => {
    if (!job) return;
    
    const suggestions: NextOperation[] = [];
    const completedOps = operations.filter(op => op.status === 'completed');
    const pendingOps = operations.filter(op => op.status === 'pending');
    
    // Basic sequence suggestions
    if (completedOps.length === 0) {
      suggestions.push({
        suggestedOperation: 'Material Preparation',
        reason: 'Start with material verification and setup',
        priority: 'high',
        canStart: true,
        dependencies: []
      });
    }
    
    if (completedOps.some(op => op.baseProcessName === 'Turning') && 
        !operations.some(op => op.baseProcessName.includes('Milling'))) {
      suggestions.push({
        suggestedOperation: '3-Axis Milling',
        reason: 'Turning complete, ready for milling operations',
        priority: 'high',
        canStart: true,
        dependencies: ['Turning']
      });
    }
    
    if (completedOps.some(op => op.baseProcessName.includes('3-Axis')) && 
        !operations.some(op => op.baseProcessName.includes('5-Axis'))) {
      suggestions.push({
        suggestedOperation: '5-Axis Milling',
        reason: 'Complex geometry machining after basic milling',
        priority: 'medium',
        canStart: true,
        dependencies: ['3-Axis Milling']
      });
    }
    
    setNextOperations(suggestions);
  };

  const loadUnifiedTasks = async (jobData: Job, processInstances: ExtendedProcessInstance[]) => {
    try {
      // Load existing tasks from Firebase
      const existingTasks = await loadJobTasks(jobId);
      
      if (existingTasks.length > 0) {
        // Use existing tasks
        setUnifiedTasks(existingTasks);
        console.log(`Loaded ${existingTasks.length} existing unified tasks`);
      } else {
        // Generate new unified tasks (manufacturing + non-manufacturing)
        const convertedProcesses = processInstances.map(op => ({
          id: op.id,
          baseProcessName: op.baseProcessName,
          instanceNumber: op.instanceNumber,
          displayName: op.displayName,
          machineType: op.machineType,
          setupTimeMinutes: op.setupTimeMinutes,
          cycleTimeMinutes: op.cycleTimeMinutes,
          description: op.description,
          requiredMachineCapabilities: op.requiredMachineCapabilities,
          orderIndex: op.orderIndex,
          estimatedCost: op.estimatedCost,
          dependencies: op.dependencies,
          quantity: op.quantity,
          customerPriority: op.customerPriority,
          dueDate: op.dueDate,
          offerId: op.offerId
        }));
        
        const newUnifiedTasks = generateUnifiedJobTasks(jobData, convertedProcesses);
        setUnifiedTasks(newUnifiedTasks);
        
        // Save to Firebase
        await saveJobTasks(jobId, newUnifiedTasks);
        
        console.log(`Generated ${newUnifiedTasks.length} new unified tasks`);
        toast({
          title: "Unified Tasks Generated",
          description: `Generated ${newUnifiedTasks.length} tasks (manufacturing + quality + documentation)`,
        });
      }
    } catch (error) {
      console.error('Failed to load unified tasks:', error);
      toast({
        title: "Error Loading Tasks",
        description: "Could not load or generate unified task system",
        variant: "destructive",
      });
    }
  };

  const syncWithUnifiedTasks = async () => {
    if (!job || operations.length === 0 || unifiedTasks.length === 0) return;
    
    try {
      let tasksUpdated = false;
      const updatedTasks = [...unifiedTasks];
      
      // Sync operations with manufacturing tasks
      operations.forEach(operation => {
        const correspondingTask = updatedTasks.find(task => 
          task.category === 'manufacturing_process' && 
          (task.processInstanceId === operation.id || 
           task.name.includes(operation.baseProcessName))
        );
        
        if (correspondingTask) {
          // Update existing manufacturing task
          const processInstance = {
            id: operation.id,
            baseProcessName: operation.baseProcessName,
            instanceNumber: operation.instanceNumber,
            displayName: operation.displayName,
            machineType: operation.machineType,
            setupTimeMinutes: operation.setupTimeMinutes,
            cycleTimeMinutes: operation.cycleTimeMinutes,
            description: operation.description,
            requiredMachineCapabilities: operation.requiredMachineCapabilities,
            orderIndex: operation.orderIndex,
            estimatedCost: operation.estimatedCost,
            dependencies: operation.dependencies,
            quantity: operation.quantity,
            customerPriority: operation.customerPriority,
            dueDate: operation.dueDate,
            offerId: operation.offerId
          };
          
          const updatedTask = updateTaskFromOperation(correspondingTask, processInstance);
          const taskIndex = updatedTasks.findIndex(t => t.id === correspondingTask.id);
          if (taskIndex !== -1) {
            updatedTasks[taskIndex] = updatedTask;
            tasksUpdated = true;
          }
        } else {
          // Create new manufacturing task for new operation
          const newTask = createTaskFromOperation(job, {
            id: operation.id,
            baseProcessName: operation.baseProcessName,
            instanceNumber: operation.instanceNumber,
            displayName: operation.displayName,
            machineType: operation.machineType,
            setupTimeMinutes: operation.setupTimeMinutes,
            cycleTimeMinutes: operation.cycleTimeMinutes,
            description: operation.description,
            requiredMachineCapabilities: operation.requiredMachineCapabilities,
            orderIndex: operation.orderIndex,
            estimatedCost: operation.estimatedCost,
            dependencies: operation.dependencies,
            quantity: operation.quantity,
            customerPriority: operation.customerPriority,
            dueDate: operation.dueDate,
            offerId: operation.offerId
          }, updatedTasks.length);
          
          updatedTasks.push(newTask);
          tasksUpdated = true;
        }
      });
      
      if (tasksUpdated) {
        setUnifiedTasks(updatedTasks);
        await saveJobTasks(jobId, updatedTasks);
        console.log('Synchronized operations with unified tasks');
      }
    } catch (error) {
      console.error('Failed to sync with unified tasks:', error);
    }
  };

  const addOperation = async () => {
    if (!newOperation.baseProcessName || !job) return;
    
    const template = OPERATION_TEMPLATES[newOperation.baseProcessName];
    if (!template) return;
    
    const newInstance: ExtendedProcessInstance = {
      id: `${job.id}_${newOperation.baseProcessName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      baseProcessName: newOperation.baseProcessName,
      instanceNumber: operations.length + 1,
      displayName: `${newOperation.baseProcessName} ${operations.length + 1}`,
      machineType: template.machineType,
      setupTimeMinutes: newOperation.setupTimeMinutes || template.setupTimeMinutes,
      cycleTimeMinutes: newOperation.cycleTimeMinutes || template.cycleTimeMinutes,
      description: newOperation.description || template.description,
      requiredMachineCapabilities: template.requiredMachineCapabilities,
      orderIndex: operations.length + 1,
      estimatedCost: 0,
      dependencies: [],
      quantity: job.item.quantity,
      customerPriority: newOperation.customerPriority,
      offerId: job.orderId,
      status: 'pending',
      completionPercentage: 0,
      notes: newOperation.notes,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    // Add to operations
    const updatedOperations = [...operations, newInstance];
    setOperations(updatedOperations);
    
    // Create corresponding manufacturing task
    try {
      const newManufacturingTask = createTaskFromOperation(job, {
        id: newInstance.id,
        baseProcessName: newInstance.baseProcessName,
        instanceNumber: newInstance.instanceNumber,
        displayName: newInstance.displayName,
        machineType: newInstance.machineType,
        setupTimeMinutes: newInstance.setupTimeMinutes,
        cycleTimeMinutes: newInstance.cycleTimeMinutes,
        description: newInstance.description,
        requiredMachineCapabilities: newInstance.requiredMachineCapabilities,
        orderIndex: newInstance.orderIndex,
        estimatedCost: newInstance.estimatedCost,
        dependencies: newInstance.dependencies,
        quantity: newInstance.quantity,
        customerPriority: newInstance.customerPriority,
        dueDate: newInstance.dueDate,
        offerId: newInstance.offerId
      }, unifiedTasks.length);
      
      const updatedTasks = [...unifiedTasks, newManufacturingTask];
      setUnifiedTasks(updatedTasks);
      
      // Save updated tasks to Firebase
      await saveJobTasks(jobId, updatedTasks);
      
      toast({
        title: "Operation & Task Added",
        description: `${newOperation.baseProcessName} operation and corresponding manufacturing task added successfully`,
      });
    } catch (error) {
      console.error('Failed to create corresponding task:', error);
      toast({
        title: "Operation Added",
        description: `${newOperation.baseProcessName} operation added (task sync failed)`,
        variant: "destructive",
      });
    }
    
    setShowAddOperation(false);
    setNewOperation({
      baseProcessName: '',
      setupTimeMinutes: 0,
      cycleTimeMinutes: 0,
      description: '',
      customerPriority: 'medium',
      notes: ''
    });
  };

  const scheduleOperations = async () => {
    if (operations.length === 0) {
      toast({
        title: "No Operations",
        description: "Add operations before scheduling",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Convert to ProcessInstance format for scheduling
      const processInstances: ProcessInstance[] = operations.map(op => ({
        id: op.id,
        baseProcessName: op.baseProcessName,
        instanceNumber: op.instanceNumber,
        displayName: op.displayName,
        machineType: op.machineType,
        setupTimeMinutes: op.setupTimeMinutes,
        cycleTimeMinutes: op.cycleTimeMinutes,
        description: op.description,
        requiredMachineCapabilities: op.requiredMachineCapabilities,
        orderIndex: op.orderIndex,
        estimatedCost: op.estimatedCost,
        dependencies: op.dependencies,
        quantity: op.quantity,
        customerPriority: op.customerPriority,
        offerId: op.offerId,
        dueDate: op.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      }));
      
      // Call enhanced auto-scheduling API
      const response = await fetch('/api/scheduling/enhanced-auto-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          processInstances,
          options: {
            optimizationStrategy: 'balanced',
            allowParallelProcessing: true,
            considerSetupTime: true,
            bufferTimePercentage: 10
          }
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update operations with scheduling results
        const updatedOperations = operations.map(op => {
          const scheduleEntry = result.entries.find((entry: any) => 
            entry.processInstanceId === op.id
          );
          
          if (scheduleEntry) {
            return {
              ...op,
              status: 'scheduled' as OperationStatus,
              scheduledStartTime: scheduleEntry.startTime,
              scheduledEndTime: scheduleEntry.endTime,
              assignedMachine: scheduleEntry.machineName
            };
          }
          return op;
        });
        
        setOperations(updatedOperations);
        
        // Sync scheduling results with unified tasks
        const updatedTasks = [...unifiedTasks];
        let tasksUpdated = false;
        
        result.entries.forEach((entry: any) => {
          const correspondingTask = updatedTasks.find(task => 
            task.category === 'manufacturing_process' && task.processInstanceId === entry.processInstanceId
          );
          
          if (correspondingTask) {
            const syncedTask = syncTaskWithSchedule(correspondingTask, {
              machineId: entry.machineId,
              machineName: entry.machineName,
              startTime: entry.startTime,
              endTime: entry.endTime,
              scheduleEntryId: entry.id
            });
            
            const taskIndex = updatedTasks.findIndex(t => t.id === correspondingTask.id);
            if (taskIndex !== -1) {
              updatedTasks[taskIndex] = syncedTask;
              tasksUpdated = true;
            }
          }
        });
        
        if (tasksUpdated) {
          setUnifiedTasks(updatedTasks);
          await saveJobTasks(jobId, updatedTasks);
        }
        
        toast({
          title: "Operations Scheduled",
          description: `${result.entries.length} operations scheduled successfully with unified task sync`,
        });
      } else {
        throw new Error(result.error || 'Scheduling failed');
      }
    } catch (error) {
      console.error('Scheduling failed:', error);
      toast({
        title: "Scheduling Failed",
        description: error instanceof Error ? error.message : "Could not schedule operations",
        variant: "destructive",
      });
    }
  };

  const navigateToTasks = () => {
    router.push(`/en/jobs/${jobId}/tasks`);
  };

  const getStatusIcon = (status: OperationStatus) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'scheduled': return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'in_progress': return <PlayCircle className="h-4 w-4 text-green-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'on_hold': return <PauseCircle className="h-4 w-4 text-orange-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: OperationStatus) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
      scheduled: "bg-blue-100 text-blue-700 border-blue-300",
      in_progress: "bg-green-100 text-green-700 border-green-300",
      completed: "bg-green-100 text-green-800 border-green-400",
      on_hold: "bg-orange-100 text-orange-700 border-orange-300"
    };
    
    return (
      <Badge variant="outline" className={variants[status]}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading job operations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Job Not Found</h3>
          <p className="text-muted-foreground">The requested job could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <PageHeader 
        title={`Operations: ${job?.item.partName}`}
        description={`Manage manufacturing operations for job ${job?.id}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={navigateToTasks}>
              <CheckSquare className="h-4 w-4 mr-2" />
              View Unified Tasks ({unifiedTasks.length})
            </Button>
          </div>
        }
      />

      {/* Job Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Job Summary
            {unifiedTasks.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {unifiedTasks.filter(t => t.category === 'manufacturing_process').length} Manufacturing + {' '}
                {unifiedTasks.filter(t => t.category === 'non_manufacturing_task').length} Support Tasks
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Order Number</Label>
              <p className="font-medium">{job?.orderNumber}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Client</Label>
              <p className="font-medium">{job?.clientName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
              <p className="font-medium">{job?.item.quantity}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Material</Label>
              <p className="font-medium">{job?.item.rawMaterialType || 'Not specified'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operations">Current Operations</TabsTrigger>
          <TabsTrigger value="next">Next Operations</TabsTrigger>
          <TabsTrigger value="schedule">Schedule View</TabsTrigger>
          <TabsTrigger value="unified-tasks">
            Unified Tasks ({unifiedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          {/* Current Operations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Manufacturing Operations</CardTitle>
              <div className="flex gap-2">
                <Dialog open={showAddOperation} onOpenChange={setShowAddOperation}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Operation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Operation</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="operation-type">Operation Type</Label>
                          <Select
                            value={newOperation.baseProcessName}
                            onValueChange={(value) => {
                              const template = OPERATION_TEMPLATES[value];
                              setNewOperation({
                                ...newOperation,
                                baseProcessName: value,
                                setupTimeMinutes: template?.setupTimeMinutes || 0,
                                cycleTimeMinutes: template?.cycleTimeMinutes || 0,
                                description: template?.description || ''
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select operation type" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(OPERATION_TEMPLATES).map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="priority">Priority</Label>
                          <Select
                            value={newOperation.customerPriority}
                            onValueChange={(value: PriorityLevel) => 
                              setNewOperation({...newOperation, customerPriority: value})
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="setup-time">Setup Time (minutes)</Label>
                          <Input
                            id="setup-time"
                            type="number"
                            value={newOperation.setupTimeMinutes}
                            onChange={(e) => setNewOperation({
                              ...newOperation, 
                              setupTimeMinutes: parseInt(e.target.value) || 0
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cycle-time">Cycle Time (minutes)</Label>
                          <Input
                            id="cycle-time"
                            type="number"
                            value={newOperation.cycleTimeMinutes}
                            onChange={(e) => setNewOperation({
                              ...newOperation, 
                              cycleTimeMinutes: parseInt(e.target.value) || 0
                            })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newOperation.description}
                          onChange={(e) => setNewOperation({
                            ...newOperation, 
                            description: e.target.value
                          })}
                          placeholder="Operation description..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={newOperation.notes}
                          onChange={(e) => setNewOperation({
                            ...newOperation, 
                            notes: e.target.value
                          })}
                          placeholder="Additional notes..."
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddOperation(false)}>
                          Cancel
                        </Button>
                        <Button onClick={addOperation}>
                          Add Operation
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button onClick={scheduleOperations} variant="outline">
                  <Play className="h-4 w-4 mr-2" />
                  Schedule All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {operations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">No Operations Added</p>
                  <p>Click "Add Operation" to start adding manufacturing operations.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Machine Type</TableHead>
                      <TableHead>Times</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned Machine</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operations.map((operation, index) => (
                      <TableRow key={operation.id}>
                        <TableCell>{operation.orderIndex}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{operation.displayName}</p>
                            <p className="text-sm text-muted-foreground">{operation.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{operation.machineType}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>Setup: {operation.setupTimeMinutes}m</p>
                            <p>Cycle: {operation.cycleTimeMinutes}m</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(operation.status)}</TableCell>
                        <TableCell>
                          {operation.assignedMachine ? (
                            <Badge variant="secondary">{operation.assignedMachine}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-600 transition-all duration-300"
                                style={{ width: `${operation.completionPercentage}%` }}
                              />
                            </div>
                            <span className="text-sm">{operation.completionPercentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline">
                              <Settings className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="next" className="space-y-4">
          {/* Next Operations Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle>Next Recommended Operations</CardTitle>
            </CardHeader>
            <CardContent>
              {nextOperations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">No Suggestions Available</p>
                  <p>Complete current operations to see next step recommendations.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {nextOperations.map((nextOp, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{nextOp.suggestedOperation}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{nextOp.reason}</p>
                            {nextOp.dependencies.length > 0 && (
                              <div className="flex gap-1">
                                <span className="text-xs text-muted-foreground">Depends on:</span>
                                {nextOp.dependencies.map(dep => (
                                  <Badge key={dep} variant="outline" className="text-xs">{dep}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={nextOp.priority === 'high' ? 'destructive' : 
                                     nextOp.priority === 'medium' ? 'default' : 'secondary'}
                            >
                              {nextOp.priority} priority
                            </Badge>
                            <Button 
                              size="sm" 
                              disabled={!nextOp.canStart}
                              onClick={() => {
                                setNewOperation({
                                  ...newOperation,
                                  baseProcessName: nextOp.suggestedOperation
                                });
                                setShowAddOperation(true);
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          {/* Schedule View */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Production Schedule</CardTitle>
              <Button 
                variant="outline"
                onClick={() => router.push(`/en/planning/auto-schedule?jobId=${jobId}`)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                View Full Schedule
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {operations.filter(op => op.status === 'scheduled').map(operation => (
                  <div key={operation.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{operation.displayName}</h4>
                      <Badge variant="outline">{operation.assignedMachine}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Start Time</Label>
                        <p>{operation.scheduledStartTime ? 
                          new Date(operation.scheduledStartTime).toLocaleString() : 'Not scheduled'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">End Time</Label>
                        <p>{operation.scheduledEndTime ? 
                          new Date(operation.scheduledEndTime).toLocaleString() : 'Not scheduled'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Duration</Label>
                        <p>{operation.setupTimeMinutes + (operation.cycleTimeMinutes * operation.quantity)} min</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Machine Type</Label>
                        <p className="capitalize">{operation.machineType}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {operations.filter(op => op.status === 'scheduled').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">No Scheduled Operations</p>
                    <p>Click "Schedule All" to automatically schedule operations.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unified-tasks" className="space-y-4">
          {/* Unified Task Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Unified Task Management</CardTitle>
              <Button onClick={navigateToTasks} variant="outline">
                <CheckSquare className="h-4 w-4 mr-2" />
                Full Task Interface
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {unifiedTasks.filter(t => t.category === 'manufacturing_process').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Manufacturing Tasks</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {unifiedTasks.filter(t => t.category === 'non_manufacturing_task').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Support Tasks</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {unifiedTasks.filter(t => t.scheduledMachineId).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Scheduled Tasks</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Manufacturing Tasks (Operations)</h4>
                {unifiedTasks.filter(t => t.category === 'manufacturing_process').map(task => (
                  <div key={task.id} className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">{task.name}</h5>
                      <div className="flex gap-2">
                        <Badge variant="outline">Manufacturing</Badge>
                        {task.scheduledMachineName && (
                          <Badge variant="secondary">{task.scheduledMachineName}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Machine Type</Label>
                        <p className="capitalize">{task.machineType}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Setup Time</Label>
                        <p>{task.setupTimeMinutes}m</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Cycle Time</Label>
                        <p>{task.cycleTimeMinutes}m × {task.quantity}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <p className="capitalize">{task.status.replace('_', ' ')}</p>
                      </div>
                    </div>
                    {task.scheduledStartTime && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Scheduled: {new Date(task.scheduledStartTime).toLocaleString()} - {new Date(task.scheduledEndTime!).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
                
                <h4 className="font-medium mt-6">Support Tasks (Quality & Documentation)</h4>
                {unifiedTasks.filter(t => t.category === 'non_manufacturing_task').map(task => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">{task.name}</h5>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="capitalize">{task.category}</Badge>
                        <Badge variant={task.priority === 'critical' ? 'destructive' : 'default'}>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Subtasks</Label>
                        <p>{task.subtasks.filter(s => s.status === 'completed').length}/{task.subtasks.length}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Duration</Label>
                        <p>{task.estimatedDurationHours}h</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">AS9100D</Label>
                        <p>{task.as9100dClause || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 