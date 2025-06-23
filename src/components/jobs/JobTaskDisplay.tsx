"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronDown, 
  ChevronRight, 
  CheckSquare, 
  Clock, 
  Settings, 
  Paperclip, 
  Plus, 
  Upload, 
  FileText, 
  Trash2,
  Edit3,
  Calendar,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  Wrench,
  TestTube,
  FileCheck,
  Target,
  Shield,
  CheckCircle2
} from "lucide-react";
import type { Job, JobTask, JobSubtask, TaskStatus, SubtaskStatus } from "@/types";
import type { QualityResult } from "@/types/archival";
import { updateTaskInFirestore, updateSubtaskInFirestore } from "@/lib/firebase-tasks";
import { 
  completeTrackedTask, 
  getTaskQualityRequirements 
} from "@/lib/quality-aware-task-completion";
import TaskCompletionDialog from "@/components/quality/TaskCompletionDialog";
import AttachmentUpload from "./AttachmentUpload";

interface JobTaskDisplayProps {
  job: Job;
  tasks: JobTask[];
  onTasksUpdate: (tasks: JobTask[]) => void;
}

// Minimal task item with quality-aware completion
function MinimalTaskItem({ 
  task, 
  job, 
  onUpdate 
}: { 
  task: JobTask; 
  job: Job; 
  onUpdate: (task: JobTask) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(task.notes || '');
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [isLoadingQuality, setIsLoadingQuality] = useState(false);
  const { toast } = useToast();

  const handleTaskToggle = async (checked: boolean) => {
    if (checked) {
      // If completing the task, open quality assessment dialog
      setQualityDialogOpen(true);
    } else {
      // If unchecking, just update status normally
      const newStatus: TaskStatus = 'pending';
      const updatedTask = { ...task, status: newStatus, updatedAt: new Date().toISOString() };
      
      try {
        await updateTaskInFirestore(updatedTask);
        onUpdate(updatedTask);
        toast({
          title: "Task Updated",
          description: `${task.name} marked as ${newStatus}`,
        });
      } catch (error) {
        console.error('Failed to update task:', error);
        toast({
          title: "Update Failed",
          description: "Could not update task status",
          variant: "destructive",
        });
      }
    }
  };

  const handleQualityCompletion = async (qualityResult: QualityResult, operatorNotes?: string[]) => {
    try {
      setIsLoadingQuality(true);
      
      // Complete task with quality assessment
      const updatedTask = await completeTrackedTask(task, qualityResult, operatorNotes, 'current-user');
      onUpdate(updatedTask);
      
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

  const handleNotesUpdate = async () => {
    try {
      const updatedTask = { ...task, notes, updatedAt: new Date().toISOString() };
      await updateTaskInFirestore(updatedTask);
      onUpdate(updatedTask);
      setIsEditing(false);
      toast({
        title: "Notes Updated",
        description: "Task notes saved successfully",
      });
    } catch (error) {
      console.error('Failed to update notes:', error);
      toast({
        title: "Update Failed",
        description: "Could not save notes",
        variant: "destructive",
      });
    }
  };

  const handleAttachmentAdd = async (attachment: { name: string; url: string; type: string; size: number }) => {
    try {
      const currentAttachments = task.attachments || [];
      const newAttachments = [...currentAttachments, attachment];
      const updatedTask = { ...task, attachments: newAttachments, updatedAt: new Date().toISOString() };
      
      await updateTaskInFirestore(updatedTask);
      onUpdate(updatedTask);
      
      toast({
        title: "Attachment Added",
        description: `${attachment.name} has been attached to ${task.name}`,
      });
    } catch (error) {
      console.error('Failed to add attachment:', error);
      toast({
        title: "Upload Failed",
        description: "Could not attach the file",
        variant: "destructive",
      });
    }
  };

  const getTaskIcon = () => {
    if (task.category === 'manufacturing_process') {
      return <Wrench className="h-4 w-4 text-blue-600" />;
    } else if (task.name.toLowerCase().includes('quality') || task.name.toLowerCase().includes('inspection')) {
      return <TestTube className="h-4 w-4 text-green-600" />;
    } else if (task.name.toLowerCase().includes('document') || task.name.toLowerCase().includes('report')) {
      return <FileCheck className="h-4 w-4 text-orange-600" />;
    } else {
      return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (task.status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'pending': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const completedSubtasks = task.subtasks.filter(s => s.status === 'completed').length;
  const progressPercentage = task.subtasks.length > 0 
    ? Math.round((completedSubtasks / task.subtasks.length) * 100) 
    : (task.status === 'completed' ? 100 : 0);

  // Get quality requirements for this task
  const qualityRequirements = getTaskQualityRequirements(task);

  return (
    <div className="border-l-2 border-gray-200 pl-4 py-2 hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-3">
        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="p-0 h-6 w-6"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        {/* Task Checkbox */}
        <Checkbox
          checked={task.status === 'completed'}
          onCheckedChange={handleTaskToggle}
          className="border-2"
        />

        {/* Task Icon */}
        {getTaskIcon()}

        {/* Task Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
              {task.name}
            </span>
            <Badge variant="outline" className="text-xs">
              {task.category === 'manufacturing_process' ? 'Mfg' : 'Support'}
            </Badge>
            {task.priority === 'critical' && (
              <Badge variant="destructive" className="text-xs">Critical</Badge>
            )}
            {task.scheduledMachineName && (
              <Badge variant="secondary" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {task.scheduledMachineName}
              </Badge>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center space-x-2 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {completedSubtasks}/{task.subtasks.length}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-1">
          {task.estimatedDurationHours && (
            <span className="text-xs text-gray-500">{task.estimatedDurationHours}h</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-6 w-6"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit3 className="h-3 w-3" />
          </Button>
          <AttachmentUpload 
            onAttachmentAdd={handleAttachmentAdd}
            disabled={false}
          />
          {task.attachments && task.attachments.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {task.attachments.length} files
            </Badge>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 ml-9 space-y-3">
          {/* Task Description */}
          {task.description && (
            <p className="text-sm text-gray-600">{task.description}</p>
          )}

          {/* Notes Section */}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                className="text-sm min-h-[60px]"
              />
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleNotesUpdate}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                <p className="text-sm text-gray-700">{notes}</p>
              </div>
            )
          )}

          {/* Subtasks */}
          {task.subtasks.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700">Subtasks:</h5>
              {task.subtasks.map((subtask) => (
                <MinimalSubtaskItem 
                  key={subtask.id} 
                  subtask={subtask} 
                  task={task}
                  job={job}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          )}

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700">Attachments:</h5>
              <div className="space-y-1">
                {task.attachments.map((attachment, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-sm">
                    <Paperclip className="h-3 w-3 text-gray-500" />
                    <a 
                      href={attachment.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate"
                    >
                      {attachment.name}
                    </a>
                    {attachment.size && (
                      <span className="text-xs text-gray-500">
                        ({(attachment.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manufacturing Details */}
          {task.category === 'manufacturing_process' && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <div className="flex items-center space-x-4 text-sm">
                {task.machineType && (
                  <span><strong>Machine:</strong> {task.machineType}</span>
                )}
                {task.setupTimeMinutes && (
                  <span><strong>Setup:</strong> {task.setupTimeMinutes}m</span>
                )}
                {task.cycleTimeMinutes && (
                  <span><strong>Cycle:</strong> {task.cycleTimeMinutes}m × {task.quantity}</span>
                )}
              </div>
              {task.scheduledStartTime && (
                <div className="text-sm text-blue-600 mt-1">
                  <strong>Scheduled:</strong> {new Date(task.scheduledStartTime).toLocaleString()}
                  {task.scheduledEndTime && ` - ${new Date(task.scheduledEndTime).toLocaleString()}`}
                </div>
              )}
            </div>
          )}

          {/* Quality Requirements Display */}
          {task.status !== 'completed' && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">Quality Requirements</span>
                {qualityRequirements.as9100dCompliance && (
                  <Badge variant="outline" className="text-xs">AS9100D</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Min. Score:</span>
                  <span className="ml-1 font-medium">{qualityRequirements.minimumQualityScore}/10</span>
                </div>
                <div>
                  <span className="text-gray-600">Inspections:</span>
                  <span className="ml-1 font-medium">{qualityRequirements.requiredInspections.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quality Assessment Dialog */}
      <TaskCompletionDialog
        open={qualityDialogOpen}
        onOpenChange={setQualityDialogOpen}
        task={task}
        onComplete={handleQualityCompletion}
        isLoading={isLoadingQuality}
      />
    </div>
  );
}

// Minimal subtask item
function MinimalSubtaskItem({ 
  subtask, 
  task, 
  job, 
  onUpdate 
}: { 
  subtask: JobSubtask; 
  task: JobTask; 
  job: Job; 
  onUpdate: (task: JobTask) => void;
}) {
  const { toast } = useToast();

  const handleSubtaskToggle = async (checked: boolean) => {
    const newStatus: SubtaskStatus = checked ? 'completed' : 'pending';
    
    try {
      const updatedSubtask = { ...subtask, status: newStatus, isChecked: checked, updatedAt: new Date().toISOString() };
      await updateSubtaskInFirestore(updatedSubtask);
      
      const updatedSubtasks = task.subtasks.map(s => 
        s.id === subtask.id ? updatedSubtask : s
      );
      const updatedTask = { ...task, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() };
      
      onUpdate(updatedTask);
      
      toast({
        title: "Subtask Updated",
        description: `${subtask.name} marked as ${newStatus}`,
      });
    } catch (error) {
      console.error('Failed to update subtask:', error);
      toast({
        title: "Update Failed",
        description: "Could not update subtask",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center space-x-2 pl-4">
      <Checkbox
        checked={subtask.isChecked || subtask.status === 'completed'}
        onCheckedChange={handleSubtaskToggle}
        className="border border-gray-300"
      />
      <span className={`text-sm ${subtask.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-700'}`}>
        {subtask.name}
      </span>
      {subtask.estimatedDurationMinutes && (
        <span className="text-xs text-gray-500">({subtask.estimatedDurationMinutes}m)</span>
      )}
    </div>
  );
}

// Main component
export default function JobTaskDisplay({ job, tasks, onTasksUpdate }: JobTaskDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localTasks, setLocalTasks] = useState(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleTaskUpdate = (updatedTask: JobTask) => {
    const newTasks = localTasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    setLocalTasks(newTasks);
    onTasksUpdate(newTasks);
  };

  if (tasks.length === 0) {
    return null;
  }

  const manufacturingTasks = tasks.filter(t => t.category === 'manufacturing_process');
  const supportTasks = tasks.filter(t => t.category === 'non_manufacturing_task');
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalProgress = Math.round((completedTasks / tasks.length) * 100);

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <CheckSquare className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-sm">
            Tasks ({completedTasks}/{tasks.length})
          </span>
          <div className="flex space-x-2">
            {manufacturingTasks.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <Wrench className="h-3 w-3 mr-1" />
                {manufacturingTasks.length} Mfg
              </Badge>
            )}
            {supportTasks.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {supportTasks.length} Support
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-12 bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
          <span className="text-xs text-gray-600">{totalProgress}%</span>
        </div>
      </div>

      {/* Expanded Task List */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-3 space-y-1">
          {localTasks.map((task) => (
            <MinimalTaskItem
              key={task.id}
              task={task}
              job={job}
              onUpdate={handleTaskUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
} 