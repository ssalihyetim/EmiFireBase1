"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order, Job, JobStatus, Attachment, OrderFirestoreData, JobTask } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Layers, MoreHorizontal, PlayCircle, PauseCircle, CheckCircle2, AlertTriangle, XCircle, ListChecks, Paperclip, Loader2, Cog, CheckSquare, Clock, TestTube, Settings, Factory, Package, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { useTranslations } from "next-intl";
import { generateJobTasks, calculateJobProgress } from "@/lib/task-automation";
import { saveJobTasks, loadJobTasks, jobHasTasks, cleanupCorruptedTimestamps, hasCorruptedTimestamps } from "@/lib/firebase-tasks";
import { loadAllJobs, deleteJob } from "@/lib/firebase-jobs";
import { testFirebaseConnection } from "@/lib/firebase-test";
import OrderToJobConverter from "@/components/jobs/OrderToJobConverter";

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
  tasks
}: { 
  job: Job;
  hasTasks: boolean;
  isGenerating: boolean;
  onGenerateTasks: (job: Job) => void;
  onViewTasks: (job: Job) => void;
  tasks?: JobTask[];
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
        </div>
      )}
    </div>
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

  // Delete a specific job
  const handleDeleteJob = async (job: Job) => {
    if (!confirm(`Are you sure you want to delete job for ${job.item.partName}? This will also delete all associated tasks.`)) {
      return;
    }

    try {
      await deleteJob(job.id);
      toast({
        title: "Job Deleted",
        description: `Successfully deleted job for ${job.item.partName}`,
      });
      // Reload jobs
      await fetchJobs();
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Could not delete job",
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

  return (
    <div>
      <PageHeader
        title={t('title')}
        description="Order-based job management with automatic task generation and manufacturing forms"
        actions={
          <div className="flex space-x-2">
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
            <Button variant="outline">
              <ListChecks className="mr-2 h-4 w-4" /> {t('button_viewProcessBoard')}
            </Button>
          </div>
        }
      />
      
      {/* Order to Job Conversion */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Job Creation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Create Jobs from Orders</h3>
              <p className="text-sm text-muted-foreground mb-4">
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
            </div>
            <div className="flex items-center">
              <OrderToJobConverter 
                orders={orders}
                onJobCreated={handleJobCreated}
                onRefresh={() => { fetchJobs(); fetchOrders(); }}
              />
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
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Jobs Created Yet</h3>
            <p className="mb-4">Create jobs from orders to get started with manufacturing planning.</p>
            <OrderToJobConverter 
              orders={orders}
              onJobCreated={handleJobCreated}
              onRefresh={() => { fetchJobs(); fetchOrders(); }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Manufacturing Jobs ({jobs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tasks</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const progress = getJobTaskProgress(job.id);
                    const hasTasks = jobTasks[job.id]?.length > 0;
                    
                    return (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{job.item.partName}</div>
                            <div className="text-sm text-muted-foreground">
                              {job.item.rawMaterialType}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{job.clientName}</TableCell>
                        <TableCell className="font-mono text-sm">{job.orderNumber}</TableCell>
                        <TableCell>{job.item.quantity}</TableCell>
                        <TableCell>
                          {job.dueDate ? (
                            <div className="text-sm">
                              {new Date(job.dueDate).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {job.priority && (
                            <Badge variant={
                              job.priority === 'critical' ? 'destructive' :
                              job.priority === 'urgent' ? 'default' : 'secondary'
                            }>
                              {job.priority}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <JobStatusBadge status={job.status} />
                        </TableCell>
                        <TableCell>
                          {hasTasks ? (
                            <div className="flex items-center gap-1">
                              <CheckSquare className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{jobTasks[job.id].length} tasks</span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateTasks(job)}
                              disabled={taskGenerationLoading[job.id]}
                            >
                              {taskGenerationLoading[job.id] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Cog className="h-4 w-4 mr-1" />
                                  Generate
                                </>
                              )}
                            </Button>
                          )}
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
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteJob(job)}
                            >
                              <Trash2 className="h-4 w-4" />
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
      )}
    </div>
  );
}
