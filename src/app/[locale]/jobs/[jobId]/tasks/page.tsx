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
  ExternalLink
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
import { validateAS9100DCompliance, getQualityTemplateForSubtask } from '@/lib/quality-template-integration';
import { loadJobTasks, updateTaskInFirestore, updateSubtaskInFirestore, saveJobTasks } from '@/lib/firebase-tasks';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { OrderFirestoreData } from '@/types';

const TaskStatusIcon = {
  pending: Clock,
  in_progress: PlayCircle,
  completed: CheckCircle2,
  blocked: AlertTriangle,
  cancelled: PauseCircle,
};

const TaskStatusColors = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  blocked: 'bg-red-100 text-red-700 border-red-300',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-300',
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
  onToggle, 
  onNotesChange 
}: { 
  subtask: JobSubtask;
  onToggle: (subtaskId: string, checked: boolean) => void;
  onNotesChange: (subtaskId: string, notes: string) => void;
}) {
  const [notes, setNotes] = useState(subtask.notes || '');
  const qualityDoc = getQualityTemplateForSubtask(subtask.id, subtask.qualityTemplateId);
  const compliance = validateAS9100DCompliance(subtask);

  const handleNotesBlur = () => {
    if (notes !== (subtask.notes || '')) {
      onNotesChange(subtask.id, notes);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {subtask.hasCheckbox && (
            <Checkbox
              checked={subtask.isChecked}
              onCheckedChange={(checked) => onToggle(subtask.id, !!checked)}
              className="mt-1"
            />
          )}
          <div className="flex-1">
            <h4 className="font-medium text-sm">{subtask.name}</h4>
            <p className="text-xs text-muted-foreground mt-1">{subtask.description}</p>
            
            {subtask.instructions && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                <strong>Instructions:</strong> {subtask.instructions}
              </div>
            )}

            {subtask.requiredDocuments && subtask.requiredDocuments.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground">Required Documents:</p>
                <ul className="text-xs text-muted-foreground ml-4 list-disc">
                  {subtask.requiredDocuments.map((doc, idx) => (
                    <li key={idx}>{doc}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          <div className="flex items-center space-x-2">
            {subtask.qualityTemplateId && (
              <Badge variant="secondary" className="text-xs">
                {subtask.qualityTemplateId}
              </Badge>
            )}
            {subtask.isPrintable && (
              <Button size="sm" variant="ghost" title="Print quality template">
                <Printer className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {subtask.estimatedDurationMinutes && (
            <span className="text-xs text-muted-foreground">
              Est: {subtask.estimatedDurationMinutes}min
            </span>
          )}
          
          {subtask.status === 'completed' && subtask.completedBy && (
            <div className="text-xs text-muted-foreground text-right">
              <div>✓ {subtask.completedBy}</div>
              {subtask.completedAt && (
                <div>{new Date(subtask.completedAt).toLocaleDateString()}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quality Compliance Issues */}
      {!compliance.isCompliant && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
          <p className="text-xs font-medium text-yellow-800">Quality Issues:</p>
          <ul className="text-xs text-yellow-700 ml-4 list-disc">
            {compliance.issues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes Section */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Notes:</Label>
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
  allTasks,
  onStatusChange, 
  onSubtaskToggle, 
  onSubtaskNotesChange 
}: { 
  task: JobTask;
  allTasks: JobTask[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSubtaskToggle: (subtaskId: string, checked: boolean) => void;
  onSubtaskNotesChange: (subtaskId: string, notes: string) => void;
}) {
  const canStart = canTaskStart(task, allTasks);
  const completedSubtasks = task.subtasks.filter(s => s.status === 'completed').length;
  const progressPercentage = task.subtasks.length > 0 
    ? Math.round((completedSubtasks / task.subtasks.length) * 100)
    : task.status === 'completed' ? 100 : 0;

  const handleStartTask = () => {
    if (canStart && task.status === 'pending') {
      onStatusChange(task.id, 'in_progress');
    }
  };

  const handleCompleteTask = () => {
    if (task.status === 'in_progress') {
      onStatusChange(task.id, 'completed');
    }
  };

  return (
    <Card className={`transition-all duration-200 ${
      task.status === 'completed' ? 'bg-green-50 border-green-200' : 
      task.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
      canStart ? 'border-blue-300' : 'bg-gray-50'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {task.name}
              <Badge variant="outline" className="text-xs">
                {task.type}
              </Badge>
              {task.priority === 'critical' && (
                <Badge variant="destructive" className="text-xs">
                  Critical
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
            
            {task.as9100dClause && (
              <Badge variant="secondary" className="text-xs mt-2">
                AS9100D: {task.as9100dClause}
              </Badge>
            )}
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <TaskStatusBadge status={task.status} />
            
            {task.estimatedDurationHours && (
              <span className="text-xs text-muted-foreground">
                Est: {task.estimatedDurationHours}h
              </span>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Progress</span>
            <span>{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {completedSubtasks}/{task.subtasks.length} subtasks completed
          </div>
        </div>

        {/* Task Actions */}
        <div className="flex gap-2 pt-2">
          {task.status === 'pending' && canStart && (
            <Button size="sm" onClick={handleStartTask}>
              <PlayCircle className="h-3 w-3 mr-1" />
              Start Task
            </Button>
          )}
          
          {task.status === 'in_progress' && (
            <Button size="sm" onClick={handleCompleteTask} variant="outline">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete Task
            </Button>
          )}

          {task.status === 'pending' && !canStart && (
            <Button size="sm" disabled variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              Waiting for Dependencies
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <Separator />
          <div>
            <h4 className="font-medium text-sm mb-3">Subtasks ({task.subtasks.length})</h4>
            <div className="space-y-3">
              {task.subtasks.map((subtask) => (
                <SubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  onToggle={onSubtaskToggle}
                  onNotesChange={onSubtaskNotesChange}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
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

  // Load job data from Firebase based on jobId
  useEffect(() => {
    const loadJobData = async () => {
      if (!jobId) {
        console.error('No jobId provided');
        setIsLoading(false);
        return;
      }

      try {
        // Parse jobId to get orderId and item info
        // Format: "orderId-item-itemId" or "orderId-item-itemIndex"
        const jobIdParts = jobId.split('-item-');
        if (jobIdParts.length !== 2) {
          throw new Error('Invalid job ID format');
        }

        const orderId = jobIdParts[0];
        const itemIdentifier = jobIdParts[1];

        // Load order data from Firebase
        const ordersQuery = query(
          collection(db, 'orders'),
          where('__name__', '==', orderId)
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        
        if (ordersSnapshot.empty) {
          throw new Error('Order not found');
        }

        const orderDoc = ordersSnapshot.docs[0];
        const orderData = orderDoc.data() as OrderFirestoreData;
        
        // Find the specific item
        let targetItem = null;
        let itemIndex = -1;
        
        // Try to find by item ID first, then by index
        targetItem = orderData.items.find((item, index) => {
          if (item.id === itemIdentifier) {
            itemIndex = index;
            return true;
          }
          if (index.toString() === itemIdentifier) {
            itemIndex = index;
            return true;
          }
          return false;
        });

        if (!targetItem) {
          throw new Error('Item not found in order');
        }

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

  const handleTaskStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    if (!job) return;
    
    // Find the task name for the toast before updating state
    const taskToUpdate = tasks.find(task => task.id === taskId);
    if (!taskToUpdate) return;
    
    setTasks(prevTasks => 
      prevTasks.map(task => {
        if (task.id === taskId) {
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
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Jobs
            </Button>
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

      {/* Tasks Grid */}
      <div className="grid gap-6">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            allTasks={tasks}
            onStatusChange={handleTaskStatusChange}
            onSubtaskToggle={handleSubtaskToggle}
            onSubtaskNotesChange={handleSubtaskNotesChange}
          />
        ))}
      </div>
    </div>
  );
} 