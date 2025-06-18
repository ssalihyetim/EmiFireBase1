"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Clock, Wrench, AlertTriangle, CheckCircle, Package, Settings, Calendar, Trash2, Moon, Sun } from "lucide-react";
import { CalendarEvent } from "@/types/manufacturing-calendar";
import { Machine } from "@/types/planning";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface EventEditDialogProps {
  event: CalendarEvent | null;
  machines: Machine[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
}

export function EventEditDialog({
  event,
  machines,
  isOpen,
  onClose,
  onSave,
  onDelete
}: EventEditDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({});

  // Initialize form data when event changes
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        partName: event.partName,
        operationName: event.operationName,
        machineId: event.machineId,
        machineName: event.machineName,
        startTime: event.startTime,
        endTime: event.endTime,
        priority: event.priority,
        status: event.status,
        quantity: event.quantity,
        description: event.description,
        notes: event.notes,
        estimatedDuration: event.estimatedDuration,
        allowAfterHours: event.allowAfterHours || false,
        allowWeekends: event.allowWeekends || false
      });
    }
  }, [event]);

  if (!event) return null;

  const handleInputChange = (field: keyof CalendarEvent, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMachineChange = (machineId: string) => {
    const selectedMachine = machines.find(m => m.id === machineId);
    setFormData(prev => ({
      ...prev,
      machineId,
      machineName: selectedMachine?.name || ''
    }));
  };

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate duration when times change
      if (updated.startTime && updated.endTime) {
        const start = new Date(updated.startTime);
        const end = new Date(updated.endTime);
        const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        updated.estimatedDuration = duration;
      }
      
      return updated;
    });
  };

  const handleSave = async () => {
    if (!event?.id) return;
    
    setIsLoading(true);
    try {
      // Validate required fields
      if (!formData.startTime || !formData.endTime) {
        toast({
          title: "Validation Error",
          description: "Start time and end time are required.",
          variant: "destructive",
        });
        return;
      }

      if (new Date(formData.endTime!) <= new Date(formData.startTime!)) {
        toast({
          title: "Validation Error", 
          description: "End time must be after start time.",
          variant: "destructive",
        });
        return;
      }

      // Handle virtual event IDs (from multi-day splitting) by using original event ID
      const actualEventId = (event as any).originalEventId || event.id;
      
      await onSave(actualEventId, formData);
      toast({
        title: "Event Updated",
        description: "The manufacturing operation has been updated successfully.",
      });
      onClose();
    } catch (error) {
      console.error('Failed to update event:', error);
      toast({
        title: "Error",
        description: "Failed to update the event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event.id) return;
    
    const confirmed = window.confirm("Are you sure you want to delete this manufacturing operation? This action cannot be undone.");
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await onDelete(event.id);
      toast({
        title: "Event Deleted",
        description: "The manufacturing operation has been removed from the schedule.",
      });
      onClose();
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast({
        title: "Error",
        description: "Failed to delete the event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getMachineTypeColor = (machineType: string) => {
    switch (machineType) {
      case 'turning': return 'bg-blue-100 text-blue-700';
      case 'milling': return 'bg-green-100 text-green-700';
      case '5-axis': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700'
  };

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
    delayed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5" />
            Edit Manufacturing Operation
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Part & Operation Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-4 w-4" />
                  Part & Operation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="partName">Part Name</Label>
                    <Input
                      id="partName"
                      value={formData.partName || ''}
                      onChange={(e) => handleInputChange('partName', e.target.value)}
                      placeholder="Enter part name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="operationName">Operation Name</Label>
                    <Input
                      id="operationName"
                      value={formData.operationName || ''}
                      onChange={(e) => handleInputChange('operationName', e.target.value)}
                      placeholder="Enter operation name"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity || ''}
                    onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                    placeholder="Enter quantity"
                    min="1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter operation description"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Scheduling Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-4 w-4" />
                  Scheduling Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={formData.startTime ? formatDateTime(formData.startTime) : ''}
                      onChange={(e) => handleTimeChange('startTime', e.target.value ? new Date(e.target.value).toISOString() : '')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={formData.endTime ? formatDateTime(formData.endTime) : ''}
                      onChange={(e) => handleTimeChange('endTime', e.target.value ? new Date(e.target.value).toISOString() : '')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="estimatedDuration">Estimated Duration (minutes)</Label>
                    <Input
                      id="estimatedDuration"
                      type="number"
                      value={formData.estimatedDuration || ''}
                      onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value) || 0)}
                      placeholder="Enter duration in minutes"
                      min="1"
                    />
                  </div>
                  <div className="flex items-end">
                    {formData.estimatedDuration && (
                      <div className="text-sm text-muted-foreground bg-blue-50 p-2 rounded border">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {formatDuration(formData.estimatedDuration)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority || 'medium'} onValueChange={(value) => handleInputChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status || 'scheduled'} onValueChange={(value) => handleInputChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="delayed">Delayed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Extended Hours Options */}
                <div className="border-t pt-4">
                  <div className="mb-3">
                    <Label className="text-base font-medium">Extended Working Hours</Label>
                    <p className="text-sm text-muted-foreground">Enable this operation to run outside normal working hours or on weekends</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center justify-between space-x-3">
                      <div className="flex items-center space-x-2">
                        <Moon className="h-4 w-4 text-blue-600" />
                        <div>
                          <Label htmlFor="allowAfterHours" className="text-sm font-medium">After Hours</Label>
                          <p className="text-xs text-muted-foreground">Allow before 8 AM or after 5 PM</p>
                        </div>
                      </div>
                      <Switch
                        id="allowAfterHours"
                        checked={formData.allowAfterHours || false}
                        onCheckedChange={(checked) => handleInputChange('allowAfterHours', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between space-x-3">
                      <div className="flex items-center space-x-2">
                        <Sun className="h-4 w-4 text-orange-600" />
                        <div>
                          <Label htmlFor="allowWeekends" className="text-sm font-medium">Weekends</Label>
                          <p className="text-xs text-muted-foreground">Allow Saturday or Sunday</p>
                        </div>
                      </div>
                      <Switch
                        id="allowWeekends"
                        checked={formData.allowWeekends || false}
                        onCheckedChange={(checked) => handleInputChange('allowWeekends', checked)}
                      />
                    </div>
                  </div>

                  {(formData.allowAfterHours || formData.allowWeekends) && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-800">Extended Hours Enabled</p>
                          <div className="text-amber-700 mt-1">
                            {formData.allowAfterHours && (
                              <p>• This operation can run from 6 AM - 10 PM (extended from normal 8 AM - 5 PM)</p>
                            )}
                            {formData.allowWeekends && (
                              <p>• This operation can be scheduled on weekends when needed</p>
                            )}
                            <p className="mt-1 text-xs">Note: Extended hours may require supervisor approval and additional labor costs.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Machine Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wrench className="h-4 w-4" />
                  Machine Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="machine">Assigned Machine</Label>
                  <Select value={formData.machineId || ''} onValueChange={handleMachineChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a machine" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines.map((machine) => (
                        <SelectItem key={machine.id} value={machine.id}>
                          <div className="flex items-center gap-2">
                            <Badge className={getMachineTypeColor(machine.type)}>
                              {machine.type}
                            </Badge>
                            <span>{machine.name}</span>
                            {!machine.isActive && <span className="text-gray-500">(Inactive)</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.machineId && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    {(() => {
                      const selectedMachine = machines.find(m => m.id === formData.machineId);
                      if (!selectedMachine) return null;
                      
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getMachineTypeColor(selectedMachine.type)}>
                              {selectedMachine.type}
                            </Badge>
                            <span className="font-medium">{selectedMachine.name}</span>
                            <Badge variant={selectedMachine.isActive ? "default" : "secondary"}>
                              {selectedMachine.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            Model: {selectedMachine.model} | 
                            Rate: €{selectedMachine.hourlyRate || 0}/hr |
                            Workload: {selectedMachine.currentWorkload || 0}h
                          </div>
                          {selectedMachine.capabilities && (
                            <div className="flex flex-wrap gap-1">
                              {selectedMachine.capabilities.map((cap, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {cap}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any additional notes or special instructions..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Summary Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Operation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="text-sm">Part:</span>
                    <Badge variant="outline">{formData.partName || 'Not set'}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    <span className="text-sm">Operation:</span>
                    <Badge variant="outline">{formData.operationName || 'Not set'}</Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm">Priority:</span>
                    <Badge className={priorityColors[formData.priority as keyof typeof priorityColors] || priorityColors.medium}>
                      {formData.priority?.charAt(0).toUpperCase() + formData.priority?.slice(1) || 'Medium'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm">Status:</span>
                    <Badge className={statusColors[formData.status as keyof typeof statusColors] || statusColors.scheduled}>
                      {formData.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Scheduled'}
                    </Badge>
                  </div>

                  {formData.quantity && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Quantity:</span>
                      <Badge variant="outline">{formData.quantity}</Badge>
                    </div>
                  )}

                  {formData.estimatedDuration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Duration:</span>
                      <Badge variant="outline">{formatDuration(formData.estimatedDuration)}</Badge>
                    </div>
                  )}

                  {formData.allowAfterHours && (
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">After Hours:</span>
                      <Badge className="bg-blue-100 text-blue-700">Enabled</Badge>
                    </div>
                  )}

                  {formData.allowWeekends && (
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Weekends:</span>
                      <Badge className="bg-orange-100 text-orange-700">Enabled</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Original Event Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>Event ID:</strong> {event.id.slice(-8)}</div>
                <div><strong>Type:</strong> {event.type}</div>
                <div><strong>Created:</strong> {new Date(event.createdAt).toLocaleDateString()}</div>
                <div><strong>Updated:</strong> {new Date(event.updatedAt).toLocaleDateString()}</div>
                {event.operationIndex !== undefined && (
                  <div><strong>Operation #:</strong> {event.operationIndex + 1}</div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isLoading}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Operation
              </Button>
              
              <Button 
                variant="outline" 
                onClick={onClose}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 