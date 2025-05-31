'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CalendarIcon, Package, Clock, CheckCircle, AlertTriangle, FileText, Cog, Factory } from 'lucide-react';
import { format, addDays, startOfDay, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { generateJobTasks } from '@/lib/task-automation';
import { saveJobTasks } from '@/lib/firebase-tasks';
import { createJob, saveJob } from '@/lib/firebase-jobs';
import { toast } from 'sonner';
import type { Order, Job, JobTask, OfferItem } from '@/types';

interface OrderToJobConverterProps {
  orders: Order[];
  onJobCreated?: (job: Job) => void;
  onRefresh?: () => void;
}

interface JobCreationData {
  orderId: string;
  itemId: string;
  item: OfferItem;
  customerName: string;
  orderNumber: string;
  dueDate: Date | undefined;
  priority: 'normal' | 'urgent' | 'critical';
  specialInstructions?: string;
}

export default function OrderToJobConverter({ 
  orders, 
  onJobCreated,
  onRefresh 
}: OrderToJobConverterProps) {
  const [selectedItems, setSelectedItems] = useState<JobCreationData[]>([]);
  const [isCreatingJobs, setIsCreatingJobs] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Get all order items that can be converted to jobs
  const availableItems = orders.flatMap(order => 
    order.items.map(item => ({
      orderId: order.id,
      itemId: item.id || `item-${order.items.indexOf(item)}`,
      item,
      customerName: order.clientName,
      orderNumber: order.orderNumber,
      dueDate: undefined,
      priority: 'normal' as const,
      specialInstructions: ''
    }))
  );

  const addItemToSelection = (itemData: JobCreationData) => {
    if (!selectedItems.find(selected => 
      selected.orderId === itemData.orderId && selected.itemId === itemData.itemId
    )) {
      // Auto-suggest due date (30 days from now, avoiding weekends)
      let suggestedDueDate = addDays(new Date(), 30);
      while (isWeekend(suggestedDueDate)) {
        suggestedDueDate = addDays(suggestedDueDate, 1);
      }

      setSelectedItems(prev => [...prev, {
        ...itemData,
        dueDate: suggestedDueDate
      }]);
    }
  };

  const removeItemFromSelection = (orderId: string, itemId: string) => {
    setSelectedItems(prev => prev.filter(item => 
      !(item.orderId === orderId && item.itemId === itemId)
    ));
  };

  const updateItemData = (orderId: string, itemId: string, updates: Partial<JobCreationData>) => {
    setSelectedItems(prev => prev.map(item => 
      item.orderId === orderId && item.itemId === itemId 
        ? { ...item, ...updates }
        : item
    ));
  };

  const calculateEstimatedCompletion = (dueDate: Date, processes: string[]) => {
    // Estimate based on number of processes (rough calculation)
    const estimatedDays = Math.max(processes.length * 2, 7); // Minimum 7 days
    const estimatedCompletion = addDays(new Date(), estimatedDays);
    
    return {
      estimatedCompletion,
      isOnTime: estimatedCompletion <= dueDate,
      daysDifference: Math.ceil((dueDate.getTime() - estimatedCompletion.getTime()) / (1000 * 60 * 60 * 24))
    };
  };

  const createJobsFromSelection = async () => {
    if (selectedItems.length === 0) return;

    setIsCreatingJobs(true);
    try {
      const createdJobs: Job[] = [];

      for (const itemData of selectedItems) {
        // Create the job
        const jobId = `${itemData.orderId}-item-${itemData.itemId}`;
        
        const job: Job = {
          id: jobId,
          orderId: itemData.orderId,
          orderNumber: itemData.orderNumber,
          clientName: itemData.customerName,
          item: itemData.item,
          status: 'Pending',
          dueDate: itemData.dueDate?.toISOString().split('T')[0],
          priority: itemData.priority,
          specialInstructions: itemData.specialInstructions,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Save job to database
        await saveJob(job);

        // Generate and save tasks automatically
        const tasks = generateJobTasks(job);
        await saveJobTasks(jobId, tasks);

        createdJobs.push(job);
        
        toast.success(
          `Job created: ${itemData.item.partName}`,
          {
            description: `${tasks.length} tasks generated (${tasks.filter(t => t.category === 'manufacturing_process').length} manufacturing + ${tasks.filter(t => t.category === 'non_manufacturing_task').length} support)`
          }
        );
      }

      // Notify parent components
      createdJobs.forEach(job => onJobCreated?.(job));
      onRefresh?.();

      // Clear selection and close dialog
      setSelectedItems([]);
      setIsDialogOpen(false);

      toast.success(
        `Successfully created ${createdJobs.length} jobs`,
        {
          description: 'All jobs have tasks and manufacturing forms ready'
        }
      );

    } catch (error) {
      console.error('Error creating jobs:', error);
      toast.error('Failed to create jobs', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsCreatingJobs(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Factory className="h-4 w-4 mr-2" />
          Create Jobs from Orders
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Convert Orders to Jobs
          </DialogTitle>
          <DialogDescription>
            Select order items to convert to manufacturing jobs. Each job will automatically generate tasks, 
            including routing sheets, setup sheets, and tool lists.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Items */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Available Order Items</h3>
            
            {availableItems.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No order items available for job creation</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {availableItems.map((itemData) => {
                  const isSelected = selectedItems.find(selected => 
                    selected.orderId === itemData.orderId && selected.itemId === itemData.itemId
                  );

                  return (
                    <Card 
                      key={`${itemData.orderId}-${itemData.itemId}`}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
                      )}
                      onClick={() => {
                        if (isSelected) {
                          removeItemFromSelection(itemData.orderId, itemData.itemId);
                        } else {
                          addItemToSelection(itemData);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{itemData.item.partName}</h4>
                          <Badge variant={isSelected ? "default" : "secondary"}>
                            {isSelected ? "Selected" : "Available"}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>Customer:</strong> {itemData.customerName}</p>
                          <p><strong>Order:</strong> {itemData.orderNumber}</p>
                          <p><strong>Quantity:</strong> {itemData.item.quantity} pieces</p>
                          <p><strong>Material:</strong> {itemData.item.rawMaterialType}</p>
                        </div>

                        {itemData.item.assignedProcesses && itemData.item.assignedProcesses.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium mb-2">Manufacturing Processes:</p>
                            <div className="flex flex-wrap gap-1">
                              {itemData.item.assignedProcesses.map((process, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  <Cog className="h-3 w-3 mr-1" />
                                  {process}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Items Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Job Configuration ({selectedItems.length})</h3>
            
            {selectedItems.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select order items to configure job details</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {selectedItems.map((jobData) => {
                  const estimation = jobData.dueDate ? 
                    calculateEstimatedCompletion(jobData.dueDate, jobData.item.assignedProcesses || []) 
                    : null;

                  return (
                    <Card key={`${jobData.orderId}-${jobData.itemId}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          {jobData.item.partName}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItemFromSelection(jobData.orderId, jobData.itemId)}
                          >
                            Remove
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Due Date */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Due Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !jobData.dueDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {jobData.dueDate ? format(jobData.dueDate, "PPP") : "Select date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={jobData.dueDate}
                                  onSelect={(date) => 
                                    updateItemData(jobData.orderId, jobData.itemId, { dueDate: date })
                                  }
                                  disabled={(date) => date < startOfDay(new Date())}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div>
                            <Label>Priority</Label>
                            <Select 
                              value={jobData.priority} 
                              onValueChange={(value: any) => 
                                updateItemData(jobData.orderId, jobData.itemId, { priority: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Estimation Display */}
                        {estimation && (
                          <div className={cn(
                            "p-3 rounded-lg border",
                            estimation.isOnTime ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                          )}>
                            <div className="flex items-center gap-2 mb-2">
                              {estimation.isOnTime ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="font-medium text-sm">
                                {estimation.isOnTime ? "On Schedule" : "Schedule Risk"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Estimated completion: {format(estimation.estimatedCompletion, "PPP")}
                              {estimation.daysDifference > 0 ? 
                                ` (${estimation.daysDifference} days early)` : 
                                ` (${Math.abs(estimation.daysDifference)} days late)`
                              }
                            </p>
                          </div>
                        )}

                        {/* Special Instructions */}
                        <div>
                          <Label>Special Instructions</Label>
                          <Input
                            placeholder="Optional special instructions for this job..."
                            value={jobData.specialInstructions || ''}
                            onChange={(e) => 
                              updateItemData(jobData.orderId, jobData.itemId, { 
                                specialInstructions: e.target.value 
                              })
                            }
                          />
                        </div>

                        {/* Auto-Generated Content Preview */}
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-sm font-medium mb-2">Will Auto-Generate:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>Routing Sheet</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Cog className="h-3 w-3" />
                              <span>Setup Sheets</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              <span>Tool Lists</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>Quality Tasks</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Create Jobs Button */}
                <Button 
                  onClick={createJobsFromSelection}
                  disabled={isCreatingJobs || selectedItems.some(item => !item.dueDate)}
                  className="w-full"
                  size="lg"
                >
                  {isCreatingJobs ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Creating Jobs & Tasks...
                    </>
                  ) : (
                    <>
                      <Factory className="h-4 w-4 mr-2" />
                      Create {selectedItems.length} Job{selectedItems.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 