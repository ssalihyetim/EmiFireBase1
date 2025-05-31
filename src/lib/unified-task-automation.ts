import type { Job, JobTask, JobSubtask } from '@/types';
import type { TaskTemplate, SubtaskTemplate, UnifiedTaskView, TaskOperationSync } from '../types/tasks';
import type { ProcessInstance, Machine, MachineType } from '@/types/planning';
import { 
  getTaskTemplatesForProcesses, 
  getTaskTemplateById,
  COMPULSORY_TASKS,
  PROCESS_TO_TASK_MAP 
} from '../config/task-templates';
import { 
  getSubtaskTemplatesByIds,
  getSubtaskTemplateById 
} from '../config/subtask-templates';
import { generateJobTasks, createJobTaskFromTemplate, setupTaskDependencies } from './task-automation';

// === Unified Task Management System ===

/**
 * Generate unified tasks that include both manufacturing and non-manufacturing tasks
 * This is the new main entry point that replaces generateJobTasks for the unified system
 */
export function generateUnifiedJobTasks(
  job: Job, 
  existingOperations?: ProcessInstance[]
): JobTask[] {
  const tasks: JobTask[] = [];
  const now = new Date().toISOString();
  
  // 1. Generate standard non-manufacturing tasks (compulsory tasks)
  const standardTasks = generateStandardTasks(job);
  tasks.push(...standardTasks);
  
  // 2. Generate manufacturing tasks from assigned processes and existing operations
  const manufacturingTasks = generateManufacturingTasks(job, existingOperations);
  tasks.push(...manufacturingTasks);
  
  // 3. Set up dependencies between all tasks (manufacturing and non-manufacturing)
  setupUnifiedTaskDependencies(tasks);
  
  return tasks;
}

/**
 * Generate standard non-manufacturing tasks (compulsory tasks)
 */
export function generateStandardTasks(job: Job): JobTask[] {
  const tasks: JobTask[] = [];
  
  // Generate compulsory tasks that are required for every job
  COMPULSORY_TASKS.forEach((template, index) => {
    const task = createJobTaskFromTemplate(job, template, index);
    // Mark as non-manufacturing
    task.category = 'non_manufacturing_task';
    tasks.push(task);
  });
  
  return tasks;
}

/**
 * Generate manufacturing tasks from assigned processes and operations
 */
export function generateManufacturingTasks(
  job: Job, 
  existingOperations?: ProcessInstance[]
): JobTask[] {
  const tasks: JobTask[] = [];
  const assignedProcesses = job.item.assignedProcesses || [];
  
  // Create manufacturing tasks for each assigned process
  assignedProcesses.forEach((processName, index) => {
    const manufacturingTask = createManufacturingTask(job, processName, index, existingOperations);
    if (manufacturingTask) {
      tasks.push(manufacturingTask);
    }
  });
  
  // If there are existing operations, ensure they are represented as tasks
  if (existingOperations) {
    existingOperations.forEach((operation, index) => {
      const existingTask = tasks.find(task => 
        task.processInstanceId === operation.id || 
        task.name.includes(operation.baseProcessName)
      );
      
      if (!existingTask) {
        const operationTask = createTaskFromOperation(job, operation, tasks.length + index);
        tasks.push(operationTask);
      }
    });
  }
  
  return tasks;
}

/**
 * Create a manufacturing task from a process name
 */
export function createManufacturingTask(
  job: Job, 
  processName: string, 
  sequenceIndex: number,
  existingOperations?: ProcessInstance[]
): JobTask | null {
  const now = new Date().toISOString();
  
  // Find the corresponding operation if it exists
  const correspondingOperation = existingOperations?.find(op => 
    op.baseProcessName === processName
  );
  
  // Get task template for this process
  const taskTemplateId = PROCESS_TO_TASK_MAP[processName];
  if (!taskTemplateId) {
    console.warn(`No task template found for process: ${processName}`);
    return null;
  }
  
  const taskTemplate = getTaskTemplateById(taskTemplateId);
  if (!taskTemplate) {
    console.warn(`Task template not found: ${taskTemplateId}`);
    return null;
  }
  
  // Create the manufacturing task
  const taskId = generateManufacturingTaskId(job.id, processName, sequenceIndex);
  const subtasks = generateSubtasks(taskId, job.id, taskTemplate);
  
  const manufacturingTask: JobTask = {
    id: taskId,
    jobId: job.id,
    templateId: taskTemplate.id,
    name: taskTemplate.name,
    description: taskTemplate.description,
    type: 'manufacturing',
    status: 'pending',
    priority: taskTemplate.priority,
    category: 'manufacturing_process',
    estimatedDurationHours: taskTemplate.estimatedDurationHours,
    subtasks,
    dependencies: taskTemplate.dependencies || [],
    as9100dClause: taskTemplate.as9100dClause,
    createdAt: now,
    updatedAt: now,
    
    // Manufacturing-specific fields
    isManufacturingProcess: true,
    processInstanceId: correspondingOperation?.id,
    machineType: correspondingOperation?.machineType || taskTemplate.machineType,
    setupTimeMinutes: correspondingOperation?.setupTimeMinutes || taskTemplate.setupTimeMinutes,
    cycleTimeMinutes: correspondingOperation?.cycleTimeMinutes || taskTemplate.cycleTimeMinutes,
    quantity: correspondingOperation?.quantity || job.item.quantity,
    requiredCapabilities: correspondingOperation?.requiredMachineCapabilities || taskTemplate.requiredCapabilities,
    
    // Operations integration
    operationIndex: sequenceIndex + 1,
    customerPriority: correspondingOperation?.customerPriority || 'medium',
    dueDate: correspondingOperation?.dueDate,
    offerId: correspondingOperation?.offerId || job.orderId
  };
  
  return manufacturingTask;
}

/**
 * Create a task from an existing ProcessInstance (operation)
 */
export function createTaskFromOperation(
  job: Job, 
  operation: ProcessInstance, 
  sequenceIndex: number
): JobTask {
  const now = new Date().toISOString();
  const taskId = generateManufacturingTaskId(job.id, operation.baseProcessName, sequenceIndex);
  
  // Get the task template if available
  const taskTemplateId = PROCESS_TO_TASK_MAP[operation.baseProcessName];
  const taskTemplate = taskTemplateId ? getTaskTemplateById(taskTemplateId) : null;
  
  // Generate subtasks based on template or create basic manufacturing subtasks
  const subtasks = taskTemplate 
    ? generateSubtasks(taskId, job.id, taskTemplate)
    : generateBasicManufacturingSubtasks(taskId, job.id, operation);
  
  const operationTask: JobTask = {
    id: taskId,
    jobId: job.id,
    templateId: taskTemplate?.id || `custom_${operation.baseProcessName.toLowerCase()}`,
    name: operation.displayName || operation.baseProcessName,
    description: operation.description,
    type: 'manufacturing',
    status: 'pending',
    priority: 'high',
    category: 'manufacturing_process',
    estimatedDurationHours: (operation.setupTimeMinutes + (operation.cycleTimeMinutes * operation.quantity)) / 60,
    subtasks,
    dependencies: operation.dependencies || [],
    createdAt: now,
    updatedAt: now,
    
    // Manufacturing-specific fields
    isManufacturingProcess: true,
    processInstanceId: operation.id,
    machineType: operation.machineType,
    setupTimeMinutes: operation.setupTimeMinutes,
    cycleTimeMinutes: operation.cycleTimeMinutes,
    quantity: operation.quantity,
    requiredCapabilities: operation.requiredMachineCapabilities,
    
    // Operations integration
    operationIndex: operation.orderIndex,
    customerPriority: operation.customerPriority,
    dueDate: operation.dueDate,
    offerId: operation.offerId
  };
  
  return operationTask;
}

/**
 * Generate basic manufacturing subtasks when no template is available
 */
export function generateBasicManufacturingSubtasks(
  taskId: string,
  jobId: string,
  operation: ProcessInstance
): JobSubtask[] {
  const now = new Date().toISOString();
  
  const basicSubtasks: JobSubtask[] = [
    {
      id: `${taskId}_setup`,
      taskId,
      jobId,
      templateId: 'basic_setup',
      name: 'Machine Setup',
      description: `Setup machine for ${operation.baseProcessName}`,
      status: 'pending',
      category: 'manufacturing_process',
      isPrintable: true,
      hasCheckbox: true,
      isChecked: false,
      instructions: `Prepare machine and tooling for ${operation.baseProcessName} operation`,
      estimatedDurationMinutes: operation.setupTimeMinutes,
      isManufacturingStep: true,
      machineRequired: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: `${taskId}_production`,
      taskId,
      jobId,
      templateId: 'basic_production',
      name: 'Production Run',
      description: `Execute ${operation.baseProcessName} production`,
      status: 'pending',
      category: 'manufacturing_process',
      isPrintable: true,
      hasCheckbox: true,
      isChecked: false,
      instructions: `Perform ${operation.baseProcessName} according to work instructions`,
      estimatedDurationMinutes: operation.cycleTimeMinutes * operation.quantity,
      isManufacturingStep: true,
      machineRequired: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: `${taskId}_inspection`,
      taskId,
      jobId,
      templateId: 'basic_inspection',
      name: 'In-Process Inspection',
      description: `Quality inspection for ${operation.baseProcessName}`,
      status: 'pending',
      category: 'quality',
      isPrintable: true,
      hasCheckbox: true,
      isChecked: false,
      instructions: 'Perform required dimensional and visual inspection',
      estimatedDurationMinutes: 15,
      isManufacturingStep: false,
      machineRequired: false,
      createdAt: now,
      updatedAt: now
    }
  ];
  
  return basicSubtasks;
}

/**
 * Set up dependencies for unified task system (manufacturing + non-manufacturing)
 */
export function setupUnifiedTaskDependencies(tasks: JobTask[]): void {
  const taskMap = new Map(tasks.map(task => [task.templateId, task.id]));
  const manufacturingTasks = tasks.filter(task => task.category === 'manufacturing_process');
  const nonManufacturingTasks = tasks.filter(task => task.category === 'non_manufacturing_task');
  
  tasks.forEach(task => {
    // Handle existing template dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      task.dependencies = task.dependencies
        .map(depTemplateId => taskMap.get(depTemplateId))
        .filter(Boolean) as string[];
    }
    
    // Special dependency logic for unified system
    switch (task.templateId) {
      case 'final_inspection':
        // Final inspection depends on ALL manufacturing tasks
        const allManufacturingTaskIds = manufacturingTasks.map(t => t.id);
        task.dependencies = [...(task.dependencies || []), ...allManufacturingTaskIds];
        break;
        
      case 'packaging_delivery':
        // Packaging depends on final inspection
        const finalInspectionTask = tasks.find(t => t.templateId === 'final_inspection');
        if (finalInspectionTask) {
          task.dependencies = [...(task.dependencies || []), finalInspectionTask.id];
        }
        break;
        
      case 'documentation_completion':
        // Documentation depends on final inspection
        const finalInspTask = tasks.find(t => t.templateId === 'final_inspection');
        if (finalInspTask) {
          task.dependencies = [...(task.dependencies || []), finalInspTask.id];
        }
        break;
    }
    
    // Manufacturing tasks depend on material verification and work instructions
    if (task.category === 'manufacturing_process') {
      const materialVerificationTask = tasks.find(t => t.templateId === 'material_verification');
      const workInstructionsTask = tasks.find(t => t.templateId === 'work_instructions_review');
      
      const prereqIds = [materialVerificationTask?.id, workInstructionsTask?.id].filter(Boolean) as string[];
      task.dependencies = [...(task.dependencies || []), ...prereqIds];
    }
  });
}

/**
 * Sync manufacturing task with scheduling results
 */
export function syncTaskWithSchedule(
  task: JobTask,
  scheduleEntry: {
    machineId: string;
    machineName: string;
    startTime: string;
    endTime: string;
    scheduleEntryId: string;
  }
): JobTask {
  const now = new Date().toISOString();
  
  return {
    ...task,
    status: 'ready', // Ready to start when scheduled
    scheduledMachineId: scheduleEntry.machineId,
    scheduledMachineName: scheduleEntry.machineName,
    scheduledStartTime: scheduleEntry.startTime,
    scheduledEndTime: scheduleEntry.endTime,
    scheduleEntryId: scheduleEntry.scheduleEntryId,
    updatedAt: now
  };
}

/**
 * Create unified task view that shows both manufacturing and non-manufacturing tasks
 */
export function createUnifiedTaskView(
  tasks: JobTask[],
  machines?: Machine[]
): UnifiedTaskView[] {
  return tasks.map(task => {
    const isManufacturing = task.category === 'manufacturing_process' || false;
    const completedSubtasks = task.subtasks.filter(sub => sub.status === 'completed').length;
    const totalSubtasks = task.subtasks.length;
    const percentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    
    // Find machine info if scheduled
    const assignedMachine = machines?.find(m => m.id === task.scheduledMachineId);
    
    // Build dependency info
    const dependencies = tasks
      .filter(t => task.dependencies?.includes(t.id))
      .map(depTask => ({
        taskId: depTask.id,
        taskName: depTask.name,
        isCompleted: depTask.status === 'completed',
        isManufacturing: depTask.category === 'manufacturing_process'
      }));
    
    const unifiedView: UnifiedTaskView = {
      task,
      isManufacturing,
      scheduleInfo: isManufacturing ? {
        isScheduled: !!task.scheduledMachineId,
        machineName: task.scheduledMachineName || assignedMachine?.name,
        startTime: task.scheduledStartTime,
        endTime: task.scheduledEndTime,
        onSchedule: checkIfOnSchedule(task)
      } : undefined,
      dependencies,
      progress: {
        percentage,
        completedSubtasks,
        totalSubtasks,
        currentStep: getCurrentStep(task)
      }
    };
    
    return unifiedView;
  });
}

/**
 * Update manufacturing task from operations page changes
 */
export function updateTaskFromOperation(
  existingTask: JobTask,
  updatedOperation: ProcessInstance
): JobTask {
  const now = new Date().toISOString();
  
  return {
    ...existingTask,
    name: updatedOperation.displayName || updatedOperation.baseProcessName,
    description: updatedOperation.description,
    setupTimeMinutes: updatedOperation.setupTimeMinutes,
    cycleTimeMinutes: updatedOperation.cycleTimeMinutes,
    quantity: updatedOperation.quantity,
    machineType: updatedOperation.machineType,
    requiredCapabilities: updatedOperation.requiredMachineCapabilities,
    customerPriority: updatedOperation.customerPriority,
    dueDate: updatedOperation.dueDate,
    estimatedDurationHours: (updatedOperation.setupTimeMinutes + (updatedOperation.cycleTimeMinutes * updatedOperation.quantity)) / 60,
    updatedAt: now
  };
}

/**
 * Convert manufacturing task to ProcessInstance for operations compatibility
 */
export function taskToProcessInstance(task: JobTask): ProcessInstance | null {
  if (task.category !== 'manufacturing_process') {
    return null;
  }
  
  return {
    id: task.processInstanceId || task.id,
    baseProcessName: task.name.split(' ')[0], // Extract base process name
    instanceNumber: task.operationIndex || 1,
    displayName: task.name,
    machineType: (task.machineType as MachineType) || 'milling',
    setupTimeMinutes: task.setupTimeMinutes || 30,
    cycleTimeMinutes: task.cycleTimeMinutes || 15,
    description: task.description,
    requiredMachineCapabilities: task.requiredCapabilities || [],
    orderIndex: task.operationIndex || 1,
    estimatedCost: 0,
    dependencies: task.dependencies || [],
    quantity: task.quantity || 1,
    customerPriority: task.customerPriority as any || 'medium',
    dueDate: task.dueDate,
    offerId: task.offerId || task.jobId
  };
}

// === Utility Functions ===

/**
 * Generate unique manufacturing task ID
 */
export function generateManufacturingTaskId(jobId: string, processName: string, sequence: number): string {
  const sanitizedProcess = processName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return `${jobId}-mfg-${sanitizedProcess}-${sequence.toString().padStart(2, '0')}`;
}

/**
 * Generate basic subtasks from template
 */
function generateSubtasks(taskId: string, jobId: string, template: TaskTemplate): JobSubtask[] {
  const now = new Date().toISOString();
  const subtaskTemplates = getSubtaskTemplatesByIds(template.requiredSubtasks);
  
  return subtaskTemplates.map((subTemplate, index) => {
    const subtaskId = `${taskId}_sub_${index.toString().padStart(2, '0')}`;
    
    const subtask: JobSubtask = {
      id: subtaskId,
      taskId,
      jobId,
      templateId: subTemplate.id,
      name: subTemplate.name,
      description: subTemplate.description,
      status: 'pending',
      category: subTemplate.category,
      qualityTemplateId: subTemplate.qualityTemplateId,
      isPrintable: subTemplate.isPrintable,
      hasCheckbox: subTemplate.hasCheckbox,
      isChecked: false,
      instructions: subTemplate.instructions,
      estimatedDurationMinutes: subTemplate.estimatedDurationMinutes,
      requiredDocuments: subTemplate.requiredDocuments,
      as9100dClause: subTemplate.as9100dClause,
      isManufacturingStep: subTemplate.isManufacturingStep,
      machineRequired: subTemplate.machineRequired,
      operatorSkillRequired: subTemplate.operatorSkillRequired,
      createdAt: now,
      updatedAt: now
    };
    
    return subtask;
  });
}

/**
 * Check if task is on schedule
 */
function checkIfOnSchedule(task: JobTask): boolean {
  if (!task.scheduledStartTime) return false;
  
  const scheduledStart = new Date(task.scheduledStartTime);
  const now = new Date();
  
  // Consider on schedule if not started yet or started within acceptable range
  if (task.status === 'pending' || task.status === 'ready') {
    return scheduledStart >= now;
  }
  
  if (task.status === 'in_progress' && task.actualStart) {
    const actualStart = new Date(task.actualStart);
    const timeDifference = Math.abs(actualStart.getTime() - scheduledStart.getTime());
    return timeDifference <= 30 * 60 * 1000; // Within 30 minutes
  }
  
  return true; // Assume on schedule for completed tasks
}

/**
 * Get current step for task progress
 */
function getCurrentStep(task: JobTask): string | undefined {
  const inProgressSubtask = task.subtasks.find(sub => sub.status === 'in_progress');
  if (inProgressSubtask) {
    return inProgressSubtask.name;
  }
  
  const nextPendingSubtask = task.subtasks.find(sub => sub.status === 'pending');
  if (nextPendingSubtask) {
    return `Next: ${nextPendingSubtask.name}`;
  }
  
  return undefined;
}

// Remove the subtask category assignments and fix the function
export function generateManufacturingSubtasks(processName: string, operation: any): JobSubtask[] {
  const subtasks: JobSubtask[] = [];
  const subtaskId = `subtask-${Date.now()}`;
  
  // Setup Sheet
  subtasks.push({
    id: `${subtaskId}-setup`,
    taskId: operation.taskId || '',
    jobId: operation.jobId || '',
    templateId: 'setup_sheet',
    name: 'Setup Sheet',
    description: `Setup machine for ${operation.baseProcessName}`,
    status: 'pending',
    isPrintable: true,
    hasCheckbox: true,
    isChecked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Tool List  
  subtasks.push({
    id: `${subtaskId}-tools`,
    taskId: operation.taskId || '',
    jobId: operation.jobId || '',
    templateId: 'tool_list',
    name: 'Tool List',
    description: `Execute ${operation.baseProcessName} production`,
    status: 'pending',
    isPrintable: true,
    hasCheckbox: true,
    isChecked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  return subtasks;
} 