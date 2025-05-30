"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order, Job, JobStatus, Attachment, OrderFirestoreData, JobTask } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Layers, MoreHorizontal, PlayCircle, PauseCircle, CheckCircle2, AlertTriangle, XCircle, ListChecks, Paperclip, Loader2, Cog, CheckSquare, Clock, TestTube } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { useTranslations } from "next-intl";
import { generateJobTasks, calculateJobProgress } from "@/lib/task-automation";
import { saveJobTasks, loadJobTasks, jobHasTasks, cleanupCorruptedTimestamps, hasCorruptedTimestamps } from "@/lib/firebase-tasks";
import { testFirebaseConnection } from "@/lib/firebase-test";

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
  const Icon = JobStatusIconMap[status] || AlertTriangle;
  const colorClasses: Record<JobStatus, string> = {
    Pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    "In Progress": "bg-blue-100 text-blue-700 border-blue-300",
    "Awaiting Next Process": "bg-orange-100 text-orange-700 border-orange-300",
    Completed: "bg-green-100 text-green-700 border-green-300", // Corrected color for better visibility
    "On Hold": "bg-gray-100 text-gray-700 border-gray-300",
    Blocked: "bg-red-100 text-red-700 border-red-300",
  };

  return (
    <Badge variant="outline" className={`capitalize ${colorClasses[status] || "bg-gray-200 text-gray-800 border-gray-400"}`}>
      <Icon className={`h-3 w-3 mr-1 ${status === 'In Progress' ? 'animate-pulse' : ''}`} />
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
function TaskProgressDisplay({ progress }: { progress: ReturnType<typeof calculateJobProgress> | null }) {
  if (!progress) {
    return <span className="text-xs text-muted-foreground">No tasks</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
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
    </div>
  );
}

// Task Actions Component
function TaskActionsCell({ 
  job, 
  hasTasks, 
  isGenerating, 
  onGenerateTasks, 
  onViewTasks 
}: { 
  job: Job;
  hasTasks: boolean;
  isGenerating: boolean;
  onGenerateTasks: (job: Job) => void;
  onViewTasks: (job: Job) => void;
}) {
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
              Generate Tasks
            </>
          )}
        </Button>
      ) : (
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onViewTasks(job)}
          className="text-xs"
        >
          <CheckSquare className="h-3 w-3 mr-1" />
          View Tasks
        </Button>
      )}
    </div>
  );
}

export default function JobsPage() {
  const t = useTranslations('JobsPage');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [jobTasks, setJobTasks] = useState<Record<string, JobTask[]>>({});
  const [taskGenerationLoading, setTaskGenerationLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Generate tasks for a specific job
  const handleGenerateTasks = async (job: Job) => {
    setTaskGenerationLoading(prev => ({ ...prev, [job.id]: true }));
    
    try {
      console.log('Generating tasks for job:', job.id, job.item.partName);
      console.log('Job processes:', job.item.assignedProcesses);
      
      const tasks = generateJobTasks(job);
      console.log('Generated tasks:', tasks.length);
      console.log('Task details:', tasks.map(t => ({ 
        id: t.id, 
        name: t.name, 
        subtasks: t.subtasks.length 
      })));
      
      // Enhanced debugging: Check for undefined values in generated tasks
      console.log('=== DEBUGGING TASK DATA ===');
      tasks.forEach((task, taskIndex) => {
        console.log(`Task ${taskIndex + 1} (${task.id}):`);
        
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
      console.log('Attempting to save to Firebase...');
      await saveJobTasks(job.id, tasks);
      console.log('Successfully saved to Firebase');
      
      // Update local state
      setJobTasks(prev => ({ ...prev, [job.id]: tasks }));
      
      toast({
        title: "Tasks Generated Successfully",
        description: `Generated ${tasks.length} tasks for ${job.item.partName}`,
      });
    } catch (error) {
      console.error("Failed to generate tasks:", error);
      toast({
        title: "Task Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate tasks for this job",
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
      await fetchActiveOrderItemsAsJobs();
    } catch (error) {
      toast({
        title: "Data Cleanup Failed",
        description: "Could not fix corrupted data",
        variant: "destructive",
      });
    }
  };

  const fetchActiveOrderItemsAsJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, ORDERS_COLLECTION_NAME),
        where("status", "in", ["New", "Processing"]) 
      );
      const querySnapshot = await getDocs(q);
      const allJobs: Job[] = [];
      querySnapshot.forEach((docSnap) => {
        const orderData = docSnap.data() as OrderFirestoreData; 
        orderData.items.forEach((item, itemIndex) => {
          allJobs.push({
            id: `${docSnap.id}-item-${item.id || itemIndex}`,
            orderId: docSnap.id,
            orderNumber: orderData.orderNumber,
            clientName: orderData.clientName,
            item: {
              ...item,
              rawMaterialType: item.rawMaterialType || '',
              rawMaterialDimension: item.rawMaterialDimension || '',
              assignedProcesses: item.assignedProcesses || [],
              attachments: item.attachments || [],
            },
            status: "Pending", // Default status for new jobs
          });
        });
      });
      setJobs(allJobs);
      
      // Load existing tasks for all jobs
      await loadExistingTasks(allJobs);
      
    } catch (error) {
      console.error("Failed to load jobs from Firestore orders:", error);
      setJobs([]);
      toast({
        title: t('error_loading_jobs_toast_title'), // Example: Add to messages
        description: "Could not retrieve job data from Firestore.", // Example: Add to messages
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, t, loadExistingTasks]);

  useEffect(() => {
    fetchActiveOrderItemsAsJobs();
  }, [fetchActiveOrderItemsAsJobs]);

  const handleUpdateJobStatus = (jobId: string, newStatus: JobStatus) => {
    // This would eventually update Firestore, for now just a toast
    toast({
      title: "Update Job Status (Not Implemented)",
      description: `Changing status for job ${jobId} to ${newStatus}.`,
    });
     // Example of how you might update local state:
    // setJobs(prevJobs => prevJobs.map(job => job.id === jobId ? { ...job, status: newStatus } : job));
  };

  const handleViewTasks = (job: Job) => {
    const tasks = jobTasks[job.id];
    if (tasks && tasks.length > 0) {
      // Navigate to dedicated task management page
      window.location.href = `/en/jobs/${job.id}/tasks`;
    }
  };

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
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
            <Button variant="outline">
              <ListChecks className="mr-2 h-4 w-4" /> {t('button_viewProcessBoard')}
            </Button>
          </div>
        }
      />
      
      {/* Task Automation Summary */}
      {jobs.length > 0 && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{jobs.length}</div>
                <div className="text-sm text-muted-foreground">Total Jobs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Object.keys(jobTasks).length}
                </div>
                <div className="text-sm text-muted-foreground">Jobs with Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Object.values(jobTasks).reduce((total, tasks) => total + tasks.length, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Tasks Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.values(jobTasks).reduce((total, tasks) => 
                    total + tasks.reduce((subtotal, task) => subtotal + task.subtasks.length, 0), 0
                  )}
                </div>
                <div className="text-sm text-muted-foreground">Total Subtasks</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Layers className="mr-2 h-5 w-5 text-primary" /> {t('currentJobsTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">{t('loading_jobs')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table_jobId')}</TableHead>
                  <TableHead>{t('table_orderNumber')}</TableHead>
                  <TableHead>{t('table_client')}</TableHead>
                  <TableHead>{t('table_partName')}</TableHead>
                  <TableHead>{t('table_material')}</TableHead>
                  <TableHead>{t('table_dimensions')}</TableHead>
                  <TableHead className="text-center">{t('table_qty')}</TableHead>
                  <TableHead>{t('table_processes')}</TableHead>
                  <TableHead>Task Progress</TableHead>
                  <TableHead>{t('table_status')}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const jobProgress = getJobTaskProgress(job.id);
                  const hasTasks = jobTasks[job.id] && jobTasks[job.id].length > 0;
                  const isGeneratingTasks = taskGenerationLoading[job.id] || false;
                  
                  return (
                    <TableRow key={job.id} className="hover:bg-muted/10">
                      <TableCell className="font-mono text-xs">{job.id}</TableCell>
                      <TableCell className="font-medium">{job.orderNumber}</TableCell>
                      <TableCell>{job.clientName}</TableCell>
                      <TableCell>{job.item.partName}</TableCell>
                      <TableCell>{job.item.rawMaterialType || t('na', {defaultMessage:'N/A'})}</TableCell>
                      <TableCell>{job.item.rawMaterialDimension || t('na', {defaultMessage:'N/A'})}</TableCell>
                      <TableCell className="text-center">{job.item.quantity}</TableCell>
                      <TableCell>
                        <AssignedProcessesList processes={job.item.assignedProcesses} />
                      </TableCell>
                      <TableCell>
                        <TaskProgressDisplay progress={jobProgress} />
                      </TableCell>
                      <TableCell>
                        <JobStatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <TaskActionsCell
                          job={job}
                          hasTasks={hasTasks}
                          isGenerating={isGeneratingTasks}
                          onGenerateTasks={handleGenerateTasks}
                          onViewTasks={handleViewTasks}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {jobs.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center h-24 text-muted-foreground">
                      {t('no_active_jobs_found')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
