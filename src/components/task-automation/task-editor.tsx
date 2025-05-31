"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Save, 
  X, 
  Plus, 
  Clock, 
  AlertTriangle,
  FileText,
  Wrench,
  CheckSquare
} from 'lucide-react';
import type { JobTask, JobSubtask } from '@/types';
import type { TaskPriority, ManufacturingSubtaskType } from '@/types/tasks';

interface TaskEditorProps {
  task: JobTask;
  onSave: (updatedTask: JobTask) => void;
  trigger?: React.ReactNode;
}

export const TaskEditor: React.FC<TaskEditorProps> = ({ task, onSave, trigger }) => {
  const [editedTask, setEditedTask] = useState<JobTask>(task);
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    onSave(editedTask);
    setIsOpen(false);
  };

  const handleSubtaskUpdate = (subtaskId: string, updates: Partial<JobSubtask>) => {
    setEditedTask((prev: JobTask) => ({
      ...prev,
      subtasks: prev.subtasks.map((subtask: JobSubtask) =>
        subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
      )
    }));
  };

  const addCustomSubtask = () => {
    const newSubtask: JobSubtask = {
      id: `${editedTask.id}_custom_${Date.now()}`,
      taskId: editedTask.id,
      jobId: editedTask.jobId,
      templateId: 'custom',
      name: 'Custom Subtask',
      description: 'User-defined custom subtask',
      status: 'pending',
      isPrintable: false,
      hasCheckbox: true,
      isChecked: false,
      instructions: '',
      estimatedDurationMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setEditedTask((prev: JobTask) => ({
      ...prev,
      subtasks: [...prev.subtasks, newSubtask]
    }));
  };

  const removeSubtask = (subtaskId: string) => {
    setEditedTask((prev: JobTask) => ({
      ...prev,
      subtasks: prev.subtasks.filter((subtask: JobSubtask) => subtask.id !== subtaskId)
    }));
  };

  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'critical'];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Edit Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Task: {editedTask.name}
          </DialogTitle>
          <DialogDescription>
            Modify task properties, subtasks, and requirements
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="subtasks">Subtasks</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taskName">Task Name</Label>
                <Input
                  id="taskName"
                  value={editedTask.name}
                  onChange={(e) => setEditedTask((prev: JobTask) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={editedTask.priority} 
                  onValueChange={(value: TaskPriority) => 
                    setEditedTask((prev: JobTask) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(priority => (
                      <SelectItem key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedTask.description}
                onChange={(e) => setEditedTask((prev: JobTask) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (hours)</Label>
                <Input
                  id="duration"
                  type="number"
                  step="0.5"
                  value={editedTask.estimatedDurationHours}
                  onChange={(e) => setEditedTask((prev: JobTask) => ({ 
                    ...prev, 
                    estimatedDurationHours: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>

              {editedTask.category === 'manufacturing_process' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="setupTime">Setup Time (min)</Label>
                    <Input
                      id="setupTime"
                      type="number"
                      value={editedTask.setupTimeMinutes || 0}
                      onChange={(e) => setEditedTask((prev: JobTask) => ({ 
                        ...prev, 
                        setupTimeMinutes: parseInt(e.target.value) || 0 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cycleTime">Cycle Time (min)</Label>
                    <Input
                      id="cycleTime"
                      type="number"
                      value={editedTask.cycleTimeMinutes || 0}
                      onChange={(e) => setEditedTask((prev: JobTask) => ({ 
                        ...prev, 
                        cycleTimeMinutes: parseInt(e.target.value) || 0 
                      }))}
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="subtasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Subtasks ({editedTask.subtasks.length})</h3>
              <Button onClick={addCustomSubtask} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Subtask
              </Button>
            </div>

            <div className="space-y-3">
              {editedTask.subtasks.map((subtask: JobSubtask, index: number) => (
                <Card key={subtask.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {subtask.manufacturingSubtaskType === 'setup_sheet' && <FileText className="h-4 w-4" />}
                        {subtask.manufacturingSubtaskType === 'tool_list' && <Wrench className="h-4 w-4" />}
                        {subtask.manufacturingSubtaskType === 'machining' && <Settings className="h-4 w-4" />}
                        {!subtask.manufacturingSubtaskType && <CheckSquare className="h-4 w-4" />}
                        <Input
                          value={subtask.name}
                          onChange={(e) => handleSubtaskUpdate(subtask.id, { name: e.target.value })}
                          className="text-sm font-medium border-none p-0 h-auto"
                        />
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {subtask.isSchedulable && (
                          <Badge variant="default" className="text-xs">Schedulable</Badge>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeSubtask(subtask.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <Textarea
                      placeholder="Subtask description..."
                      value={subtask.description}
                      onChange={(e) => handleSubtaskUpdate(subtask.id, { description: e.target.value })}
                      rows={2}
                    />
                    
                    <Textarea
                      placeholder="Work instructions..."
                      value={subtask.instructions || ''}
                      onChange={(e) => handleSubtaskUpdate(subtask.id, { instructions: e.target.value })}
                      rows={2}
                    />

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Duration (min)</Label>
                        <Input
                          type="number"
                          value={subtask.estimatedDurationMinutes}
                          onChange={(e) => handleSubtaskUpdate(subtask.id, { 
                            estimatedDurationMinutes: parseInt(e.target.value) || 0 
                          })}
                          className="text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Printable</Label>
                        <Select 
                          value={subtask.isPrintable ? 'yes' : 'no'} 
                          onValueChange={(value) => handleSubtaskUpdate(subtask.id, { 
                            isPrintable: value === 'yes' 
                          })}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Has Checkbox</Label>
                        <Select 
                          value={subtask.hasCheckbox ? 'yes' : 'no'} 
                          onValueChange={(value) => handleSubtaskUpdate(subtask.id, { 
                            hasCheckbox: value === 'yes' 
                          })}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="as9100d">AS9100D Clause</Label>
                <Input
                  id="as9100d"
                  value={editedTask.as9100dClause}
                  onChange={(e) => setEditedTask((prev: JobTask) => ({ ...prev, as9100dClause: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={editedTask.category}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {editedTask.category === 'manufacturing_process' && (
              <div className="space-y-4">
                <Separator />
                <h4 className="font-medium">Manufacturing Process Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="machineType">Machine Type</Label>
                    <Input
                      id="machineType"
                      value={editedTask.machineType || ''}
                      onChange={(e) => setEditedTask((prev: JobTask) => ({ ...prev, machineType: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="processType">Process Type</Label>
                    <Input
                      id="processType"
                      value={editedTask.manufacturingProcessType || ''}
                      onChange={(e) => setEditedTask((prev: JobTask) => ({ ...prev, manufacturingProcessType: e.target.value as any }))}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <Separator />
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800">Quality & Compliance</span>
                </div>
                <p className="text-sm text-amber-700">
                  Changes to tasks must maintain AS9100D compliance and traceability requirements. 
                  Ensure all modifications are documented and approved according to quality procedures.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Total Duration: {editedTask.subtasks.reduce((sum: number, sub: JobSubtask) => sum + (sub.estimatedDurationMinutes || 0), 0)} minutes
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 