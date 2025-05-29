import type { Job, JobTask, JobSubtask } from '@/types';
import type { TaskTemplate, SubtaskTemplate } from '@/types/tasks';
import { 
  getTaskTemplatesForProcesses, 
  getTaskTemplateById,
  COMPULSORY_TASKS 
} from '@/config/task-templates';
import { 
  getSubtaskTemplatesByIds,
  getSubtaskTemplateById 
} from '@/config/subtask-templates';

// === Core Task Generation Functions ===

/**
 * Generate all tasks for a job based on assigned processes
 * This is the main entry point for automatic task creation
 */
export function generateJobTasks(job: Job): JobTask[] {
  const tasks: JobTask[] = [];
  const now = new Date().toISOString();
  
  // Get task templates based on job's assigned processes
  const taskTemplates = getTaskTemplatesForProcesses(job.item.assignedProcesses || []);
  
  // Generate tasks from templates
  taskTemplates.forEach((template, index) => {
    const task = createJobTaskFromTemplate(job, template, index);
    tasks.push(task);
  });
  
  // Set up task dependencies
  setupTaskDependencies(tasks);
  
  return tasks;
}

/**
 * Create a JobTask instance from a TaskTemplate
 */
export function createJobTaskFromTemplate(
  job: Job, 
  template: TaskTemplate, 
  sequenceNumber: number = 0
): JobTask {
  const now = new Date().toISOString();
  const taskId = generateTaskId(job.id, template.id, sequenceNumber);
  
  // Generate subtasks for this task
  const subtasks = generateSubtasks(taskId, job.id, template);
  
  const task: JobTask = {
    id: taskId,
    jobId: job.id,
    templateId: template.id,
    name: template.name,
    description: template.description,
    type: template.type,
    status: 'pending',
    priority: template.priority,
    category: template.category,
    estimatedDurationHours: template.estimatedDurationHours,
    subtasks,
    dependencies: template.dependencies || [],
    as9100dClause: template.as9100dClause,
    createdAt: now,
    updatedAt: now
  };
  
  return task;
}

/**
 * Generate subtasks for a task based on its template
 */
export function generateSubtasks(
  taskId: string, 
  jobId: string, 
  taskTemplate: TaskTemplate
): JobSubtask[] {
  const now = new Date().toISOString();
  const subtaskTemplates = getSubtaskTemplatesByIds(taskTemplate.requiredSubtasks);
  
  return subtaskTemplates.map((template, index) => {
    const subtaskId = generateSubtaskId(taskId, template.id, index);
    
    const subtask: JobSubtask = {
      id: subtaskId,
      taskId,
      jobId,
      templateId: template.id,
      name: template.name,
      description: template.description,
      status: 'pending',
      category: template.category,
      qualityTemplateId: template.qualityTemplateId,
      isPrintable: template.isPrintable,
      hasCheckbox: template.hasCheckbox,
      isChecked: false,
      instructions: template.instructions,
      estimatedDurationMinutes: template.estimatedDurationMinutes,
      requiredDocuments: template.requiredDocuments,
      as9100dClause: template.as9100dClause,
      createdAt: now,
      updatedAt: now
    };
    
    return subtask;
  });
}

/**
 * Set up task dependencies based on template configuration
 */
export function setupTaskDependencies(tasks: JobTask[]): void {
  const taskMap = new Map(tasks.map(task => [task.templateId, task.id]));
  
  tasks.forEach(task => {
    if (task.dependencies && task.dependencies.length > 0) {
      // Convert template dependencies to actual task IDs
      task.dependencies = task.dependencies
        .map(depTemplateId => taskMap.get(depTemplateId))
        .filter(Boolean) as string[];
    }
    
    // Special logic for final inspection - depends on all production tasks
    if (task.templateId === 'final_inspection') {
      const productionTaskIds = tasks
        .filter(t => t.category === 'production')
        .map(t => t.id);
      task.dependencies = [...(task.dependencies || []), ...productionTaskIds];
    }
  });
}

/**
 * Add additional tasks to an existing job (e.g., when processes are added)
 */
export function addTasksToJob(
  existingTasks: JobTask[], 
  job: Job, 
  additionalProcesses: string[]
): JobTask[] {
  const existingTemplateIds = new Set(existingTasks.map(task => task.templateId));
  
  // Get templates for additional processes, excluding already existing ones
  const allTemplatesForProcesses = getTaskTemplatesForProcesses(additionalProcesses);
  const newTemplates = allTemplatesForProcesses.filter(
    template => !existingTemplateIds.has(template.id)
  );
  
  // Generate new tasks
  const newTasks = newTemplates.map((template, index) => 
    createJobTaskFromTemplate(job, template, existingTasks.length + index)
  );
  
  // Combine with existing tasks and setup dependencies
  const allTasks = [...existingTasks, ...newTasks];
  setupTaskDependencies(allTasks);
  
  return allTasks;
}

/**
 * Remove tasks when processes are removed from a job
 */
export function removeTasksFromJob(
  existingTasks: JobTask[], 
  processesToRemove: string[]
): JobTask[] {
  // Get task template IDs that should be removed
  const templatesToRemove = getTaskTemplatesForProcesses(processesToRemove)
    .filter(template => template.type === 'optional') // Never remove compulsory tasks
    .map(template => template.id);
  
  const templatesSet = new Set(templatesToRemove);
  
  // Filter out tasks that correspond to removed processes
  return existingTasks.filter(task => !templatesSet.has(task.templateId));
}

// === Task Status Management ===

/**
 * Update task status and handle workflow logic
 */
export function updateTaskStatus(
  task: JobTask, 
  newStatus: JobTask['status'],
  completedBy?: string
): JobTask {
  const now = new Date().toISOString();
  
  const updatedTask: JobTask = {
    ...task,
    status: newStatus,
    updatedAt: now
  };
  
  // Handle status-specific logic
  switch (newStatus) {
    case 'in_progress':
      if (!task.actualStart) {
        updatedTask.actualStart = now;
      }
      break;
      
    case 'completed':
      updatedTask.actualEnd = now;
      if (task.actualStart) {
        const startTime = new Date(task.actualStart).getTime();
        const endTime = new Date(now).getTime();
        updatedTask.actualDurationHours = (endTime - startTime) / (1000 * 60 * 60);
      }
      // Mark all subtasks as completed if task is completed
      updatedTask.subtasks = task.subtasks.map(subtask => ({
        ...subtask,
        status: subtask.status === 'pending' ? 'completed' : subtask.status,
        isChecked: true,
        completedBy: completedBy,
        completedAt: now,
        updatedAt: now
      }));
      break;
      
    case 'blocked':
      // Could add logic for handling blocked tasks
      break;
  }
  
  return updatedTask;
}

/**
 * Update subtask status and checkbox state
 */
export function updateSubtaskStatus(
  subtask: JobSubtask,
  isChecked: boolean,
  completedBy?: string,
  notes?: string
): JobSubtask {
  const now = new Date().toISOString();
  
  return {
    ...subtask,
    status: isChecked ? 'completed' : 'pending',
    isChecked,
    completedBy: isChecked ? completedBy : undefined,
    completedAt: isChecked ? now : undefined,
    notes: notes || subtask.notes,
    updatedAt: now
  };
}

// === Task Analysis & Validation ===

/**
 * Check if a task can be started based on dependencies
 */
export function canTaskStart(task: JobTask, allTasks: JobTask[]): boolean {
  if (!task.dependencies || task.dependencies.length === 0) {
    return true;
  }
  
  const taskMap = new Map(allTasks.map(t => [t.id, t]));
  
  return task.dependencies.every(depId => {
    const depTask = taskMap.get(depId);
    return depTask?.status === 'completed';
  });
}

/**
 * Get next available tasks that can be started
 */
export function getNextAvailableTasks(allTasks: JobTask[]): JobTask[] {
  return allTasks.filter(task => 
    task.status === 'pending' && canTaskStart(task, allTasks)
  );
}

/**
 * Calculate task completion percentage
 */
export function calculateTaskProgress(task: JobTask): number {
  if (task.status === 'completed') return 100;
  if (task.status === 'pending') return 0;
  
  if (task.subtasks.length === 0) {
    return task.status === 'in_progress' ? 50 : 0;
  }
  
  const completedSubtasks = task.subtasks.filter(s => s.status === 'completed').length;
  return Math.round((completedSubtasks / task.subtasks.length) * 100);
}

/**
 * Calculate overall job progress
 */
export function calculateJobProgress(tasks: JobTask[]): {
  overallProgress: number;
  completedTasks: number;
  totalTasks: number;
  completedSubtasks: number;
  totalSubtasks: number;
} {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  
  const totalSubtasks = tasks.reduce((sum, task) => sum + task.subtasks.length, 0);
  const completedSubtasks = tasks.reduce((sum, task) => 
    sum + task.subtasks.filter(s => s.status === 'completed').length, 0
  );
  
  const overallProgress = totalSubtasks > 0 
    ? Math.round((completedSubtasks / totalSubtasks) * 100)
    : totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;
  
  return {
    overallProgress,
    completedTasks,
    totalTasks,
    completedSubtasks,
    totalSubtasks
  };
}

// === Utility Functions ===

/**
 * Generate unique task ID
 */
export function generateTaskId(jobId: string, templateId: string, sequence: number): string {
  return `${jobId}-task-${templateId}-${sequence.toString().padStart(2, '0')}`;
}

/**
 * Generate unique subtask ID
 */
export function generateSubtaskId(taskId: string, templateId: string, sequence: number): string {
  return `${taskId}-subtask-${templateId}-${sequence.toString().padStart(2, '0')}`;
}

/**
 * Validate task completeness for quality compliance
 */
export function validateTaskCompleteness(task: JobTask): {
  isComplete: boolean;
  missingItems: string[];
  qualityIssues: string[];
} {
  const missingItems: string[] = [];
  const qualityIssues: string[] = [];
  
  // Check if all required subtasks are completed
  const incompleteSubtasks = task.subtasks.filter(s => 
    s.hasCheckbox && s.status !== 'completed'
  );
  
  if (incompleteSubtasks.length > 0) {
    missingItems.push(`${incompleteSubtasks.length} subtasks not completed`);
  }
  
  // Check for quality template requirements
  const qualitySubtasks = task.subtasks.filter(s => s.qualityTemplateId);
  const unverifiedQualitySubtasks = qualitySubtasks.filter(s => 
    s.status === 'completed' && !s.verifiedBy
  );
  
  if (unverifiedQualitySubtasks.length > 0) {
    qualityIssues.push(`${unverifiedQualitySubtasks.length} quality subtasks require verification`);
  }
  
  return {
    isComplete: missingItems.length === 0 && qualityIssues.length === 0,
    missingItems,
    qualityIssues
  };
} 