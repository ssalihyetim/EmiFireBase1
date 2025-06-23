'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CalendarIcon, Package, Clock, CheckCircle, AlertTriangle, FileText, Cog, Factory, History, TrendingUp, Target, Zap } from 'lucide-react';
import { format, addDays, startOfDay, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { generateJobTasks } from '@/lib/task-automation';
import { saveJobTasks } from '@/lib/firebase-tasks';
import { createJob, saveJob } from '@/lib/firebase-jobs';
import { findSimilarPatterns } from '@/lib/enhanced-job-creation';
import { searchJobPatterns } from '@/lib/job-patterns';
import { generateArchiveDrivenJobSuggestions, createJobFromArchiveSuggestion, predictJobPerformance } from '@/lib/archive-driven-job-creation';
import { generateQualityIntelligence } from '@/lib/historical-quality-intelligence';
import { generateSetupIntelligence } from '@/lib/historical-setup-intelligence';
import { toast } from 'sonner';
import { generateJobIdWithLot, getPartNameWithLot, getLotNumberFromJobId } from '@/lib/lot-number-generator';
import type { Order, Job, JobTask, OfferItem } from '@/types';
import type { PatternSimilarity } from '@/types/archival';
import type { ArchiveDrivenJobSuggestion } from '@/lib/archive-driven-job-creation';

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
  selectedArchiveSuggestion?: ArchiveDrivenJobSuggestion;
  useArchiveDriven?: boolean;
}

export default function OrderToJobConverter({ 
  orders, 
  onJobCreated,
  onRefresh 
}: OrderToJobConverterProps) {
  const [selectedItems, setSelectedItems] = useState<JobCreationData[]>([]);
  const [isCreatingJobs, setIsCreatingJobs] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Pattern suggestions state
  const [patternSuggestions, setPatternSuggestions] = useState<Map<string, PatternSimilarity[]>>(new Map());
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);

  // Archive-driven suggestions state
  const [archiveSuggestions, setArchiveSuggestions] = useState<Map<string, ArchiveDrivenJobSuggestion[]>>(new Map());
  const [isLoadingArchives, setIsLoadingArchives] = useState(false);
  const [performancePredictions, setPerformancePredictions] = useState<Map<string, any>>(new Map());

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
      specialInstructions: '',
      useArchiveDriven: false
    }))
  );

  // Load pattern suggestions for an item
  const loadPatternSuggestions = async (item: OfferItem) => {
    const processes = item.assignedProcesses || [];
    const itemKey = `${item.partName}-${processes.join(',')}`;
    
    if (patternSuggestions.has(itemKey) || processes.length === 0) {
      return; // Already loaded or no processes to match
    }

    try {
      setIsLoadingPatterns(true);
      
      // Search for similar patterns
      const suggestions = await findSimilarPatterns({
        partNumber: item.partName,
        assignedProcesses: processes,
        rawMaterialType: item.rawMaterialType,
        quantity: item.quantity
      });

      setPatternSuggestions(prev => new Map(prev).set(itemKey, suggestions));
    } catch (error) {
      console.error('Error loading pattern suggestions:', error);
    } finally {
      setIsLoadingPatterns(false);
    }
  };

  // Load archive-driven suggestions for an item
  const loadArchiveSuggestions = async (item: OfferItem, deliveryDate?: string) => {
    const processes = item.assignedProcesses || [];
    const itemKey = `${item.partName}-archive`;
    
    if (archiveSuggestions.has(itemKey)) {
      return; // Already loaded
    }

    try {
      setIsLoadingArchives(true);
      
             // Convert OfferItem to OrderItem format for archive search
       const orderItem = {
         partName: item.partName,
         description: item.partName,
         quantity: item.quantity,
         material: item.rawMaterialType,
         specifications: item.rawMaterialDimension ? { dimensions: item.rawMaterialDimension } : {},
         processes: processes
       };

      // Generate archive-driven suggestions
      const suggestions = await generateArchiveDrivenJobSuggestions(
        [orderItem], 
        deliveryDate || addDays(new Date(), 30).toISOString()
      );

      setArchiveSuggestions(prev => new Map(prev).set(itemKey, suggestions));

      // Load performance prediction
      if (suggestions.length > 0) {
        const prediction = await predictJobPerformance(
          {
            partName: item.partName,
            processes: processes,
            quantity: item.quantity,
            material: item.rawMaterialType
          },
          deliveryDate || addDays(new Date(), 30).toISOString()
        );
        
        setPerformancePredictions(prev => new Map(prev).set(itemKey, prediction));
      }

    } catch (error) {
      console.error('Error loading archive suggestions:', error);
    } finally {
      setIsLoadingArchives(false);
    }
  };

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

      // Load both pattern and archive suggestions for this item
      loadPatternSuggestions(itemData.item);
      loadArchiveSuggestions(itemData.item, suggestedDueDate.toISOString());
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

    // If due date changed, reload archive suggestions with new date
    if (updates.dueDate) {
      const item = selectedItems.find(i => i.orderId === orderId && i.itemId === itemId);
      if (item) {
        loadArchiveSuggestions(item.item, updates.dueDate.toISOString());
      }
    }
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
        let job: Job;
        let tasks: JobTask[];

        // Check if using archive-driven creation
        if (itemData.useArchiveDriven && itemData.selectedArchiveSuggestion) {
          console.log(`🏭 Creating archive-driven job for ${itemData.item.partName}`);
          
          // Create job from archive suggestion
          const archiveResult = await createJobFromArchiveSuggestion(
            itemData.selectedArchiveSuggestion,
            {
              deliveryDate: itemData.dueDate?.toISOString().split('T')[0],
              priority: itemData.priority as any,
              specialRequirements: itemData.specialInstructions ? [itemData.specialInstructions] : undefined
            }
          );

          // Generate job ID with lot number (aerospace: order-based lot tracking)
          const jobIdWithLot = await generateJobIdWithLot(
            itemData.orderId, 
            itemData.itemId, 
            itemData.item.partName,
            true // Use order-based lots for aerospace manufacturing
          );

          job = {
            ...archiveResult.job,
            id: jobIdWithLot,
            orderId: itemData.orderId,
            orderNumber: itemData.orderNumber,
            clientName: itemData.customerName
          };

          tasks = archiveResult.tasks.map(task => ({
            ...task,
            jobId: job.id
          }));

          // Also save subtasks
          if (archiveResult.subtasks.length > 0) {
            // Note: You might want to save subtasks to a separate collection
            console.log(`📋 Archive-driven job includes ${archiveResult.subtasks.length} subtasks`);
          }

          toast.success(
            `Archive-driven job created: ${itemData.item.partName}`,
            {
              description: `Based on ${itemData.selectedArchiveSuggestion.recommendationType} from archive ${itemData.selectedArchiveSuggestion.sourceArchiveId.slice(-8)}. ${archiveResult.processingNotes.length} optimizations applied.`
            }
          );

        } else {
          // Standard job creation
          console.log(`🔧 Creating standard job for ${itemData.item.partName}`);
          
          // Generate job ID with lot number (aerospace: order-based lot tracking)
          const jobIdWithLot = await generateJobIdWithLot(
            itemData.orderId, 
            itemData.itemId, 
            itemData.item.partName,
            true // Use order-based lots for aerospace manufacturing
          );
          
          job = {
            id: jobIdWithLot,
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

          // Generate tasks automatically
          tasks = generateJobTasks(job);

          toast.success(
            `Standard job created: ${itemData.item.partName}`,
            {
              description: `${tasks.length} tasks generated (${tasks.filter(t => t.category === 'manufacturing_process').length} manufacturing + ${tasks.filter(t => t.category === 'non_manufacturing_task').length} support)`
            }
          );
        }

        // Save job to database
        await saveJob(job);
        await saveJobTasks(job.id, tasks);

        createdJobs.push(job);
      }

      // Notify parent components
      createdJobs.forEach(job => onJobCreated?.(job));
      onRefresh?.();

      // Clear selection and close dialog
      setSelectedItems([]);
      setIsDialogOpen(false);

      const archiveDrivenCount = selectedItems.filter(item => item.useArchiveDriven).length;
      const standardCount = selectedItems.length - archiveDrivenCount;

      toast.success(
        `Successfully created ${createdJobs.length} jobs`,
        {
          description: `${archiveDrivenCount > 0 ? `${archiveDrivenCount} archive-driven` : ''}${archiveDrivenCount > 0 && standardCount > 0 ? ', ' : ''}${standardCount > 0 ? `${standardCount} standard` : ''} jobs created`
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

  // Get pattern suggestions for an item
  const getPatternSuggestions = (item: OfferItem): PatternSimilarity[] => {
    const processes = item.assignedProcesses || [];
    const itemKey = `${item.partName}-${processes.join(',')}`;
    return patternSuggestions.get(itemKey) || [];
  };

  // Get archive suggestions for an item
  const getArchiveSuggestions = (item: OfferItem): ArchiveDrivenJobSuggestion[] => {
    const itemKey = `${item.partName}-archive`;
    return archiveSuggestions.get(itemKey) || [];
  };

  // Get performance prediction for an item
  const getPerformancePrediction = (item: OfferItem) => {
    const itemKey = `${item.partName}-archive`;
    return performancePredictions.get(itemKey);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Factory className="h-4 w-4 mr-2" />
          Create Jobs from Orders
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Convert Orders to Jobs
          </DialogTitle>
          <DialogDescription>
            Select order items to convert to manufacturing jobs. Choose between standard job creation 
            or archive-driven optimization based on historical data.
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

                  const archiveSuggestions = getArchiveSuggestions(jobData.item);
                  const patternSuggestions = getPatternSuggestions(jobData.item);
                  const performancePrediction = getPerformancePrediction(jobData.item);

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
                        {/* Due Date and Priority */}
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

                        {/* Archive-Driven vs Standard Job Creation Toggle */}
                        {archiveSuggestions.length > 0 && (
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-3">
                              <History className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-sm text-blue-800">
                                Job Creation Method
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <Button
                                variant={!jobData.useArchiveDriven ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateItemData(jobData.orderId, jobData.itemId, { 
                                  useArchiveDriven: false,
                                  selectedArchiveSuggestion: undefined
                                })}
                              >
                                <Cog className="h-3 w-3 mr-1" />
                                Standard
                              </Button>
                              <Button
                                variant={jobData.useArchiveDriven ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateItemData(jobData.orderId, jobData.itemId, { 
                                  useArchiveDriven: true,
                                  selectedArchiveSuggestion: archiveSuggestions[0]
                                })}
                              >
                                <History className="h-3 w-3 mr-1" />
                                Archive-Driven
                              </Button>
                            </div>

                            {jobData.useArchiveDriven && (
                              <div className="space-y-2">
                                <Label className="text-xs">Select Archive Suggestion:</Label>
                                <Select
                                  value={jobData.selectedArchiveSuggestion?.sourceArchiveId || archiveSuggestions[0]?.sourceArchiveId}
                                  onValueChange={(value) => {
                                    const suggestion = archiveSuggestions.find(s => s.sourceArchiveId === value);
                                    updateItemData(jobData.orderId, jobData.itemId, { 
                                      selectedArchiveSuggestion: suggestion 
                                    });
                                  }}
                                >
                                  <SelectTrigger className="text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {archiveSuggestions.map((suggestion) => (
                                      <SelectItem key={suggestion.sourceArchiveId} value={suggestion.sourceArchiveId}>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">
                                            {Math.round(suggestion.similarityScore)}%
                                          </Badge>
                                          <span className="text-xs">
                                            {suggestion.recommendationType.replace('_', ' ')} • 
                                            Q: {suggestion.historicalPerformance.averageQualityScore.toFixed(1)}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Historical Intelligence Tabs */}
                        {(archiveSuggestions.length > 0 || patternSuggestions.length > 0) && (
                          <Tabs defaultValue="archive" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="archive" className="text-xs">
                                <History className="h-3 w-3 mr-1" />
                                Archive
                              </TabsTrigger>
                              <TabsTrigger value="patterns" className="text-xs">
                                <Package className="h-3 w-3 mr-1" />
                                Patterns
                              </TabsTrigger>
                              <TabsTrigger value="prediction" className="text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Prediction
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="archive" className="mt-3">
                              {archiveSuggestions.length > 0 ? (
                                <div className="space-y-2">
                                  {archiveSuggestions.slice(0, 2).map((suggestion, index) => (
                                    <div key={index} className="bg-white p-3 rounded border">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">
                                          Archive {suggestion.sourceArchiveId.slice(-8)}
                                        </span>
                                        <div className="flex gap-1">
                                          <Badge variant="outline" className="text-xs">
                                            {Math.round(suggestion.similarityScore)}% match
                                          </Badge>
                                          <Badge variant="outline" className="text-xs">
                                            {Math.round(suggestion.confidenceLevel)}% confidence
                                          </Badge>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>Quality: {suggestion.historicalPerformance.averageQualityScore.toFixed(1)}/10</div>
                                        <div>Duration: {suggestion.historicalPerformance.averageCompletionTime.toFixed(1)}h</div>
                                        <div>On-time: {suggestion.historicalPerformance.onTimeDeliveryRate.toFixed(0)}%</div>
                                        <div>Success: {suggestion.historicalPerformance.successRate.toFixed(0)}%</div>
                                      </div>
                                      <p className="text-xs text-blue-600 mt-2">
                                        {suggestion.recommendations.slice(0, 2).join(' • ')}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : isLoadingArchives ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  Searching archives...
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No archive data found</p>
                              )}
                            </TabsContent>

                            <TabsContent value="patterns" className="mt-3">
                              {patternSuggestions.length > 0 ? (
                                <div className="space-y-2">
                                  {patternSuggestions.slice(0, 2).map((suggestion, index) => (
                                    <div key={index} className="bg-white p-3 rounded border">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">Pattern {suggestion.patternId}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {Math.round(suggestion.similarityScore * 100)}% match
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        Risk: {suggestion.riskAssessment} • 
                                        Processes: {suggestion.matchingProcesses.join(', ')}
                                      </p>
                                      <p className="text-xs text-purple-600 mt-1">
                                        {suggestion.recommendation.replace('_', ' ')}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : isLoadingPatterns ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  Searching patterns...
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No patterns found</p>
                              )}
                            </TabsContent>

                            <TabsContent value="prediction" className="mt-3">
                              {performancePrediction ? (
                                <div className="bg-white p-3 rounded border">
                                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                    <div className="flex items-center gap-1">
                                      <Target className="h-3 w-3 text-green-600" />
                                      Quality: {performancePrediction.predictedQualityScore.toFixed(1)}/10
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-blue-600" />
                                      Duration: {performancePrediction.predictedDuration.toFixed(1)}h
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3 text-purple-600" />
                                      On-time: {performancePrediction.onTimeDeliveryProbability.toFixed(0)}%
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Zap className="h-3 w-3 text-orange-600" />
                                      Confidence: {performancePrediction.confidenceLevel}%
                                    </div>
                                  </div>
                                  {performancePrediction.riskFactors.length > 0 && (
                                    <div className="pt-2 border-t">
                                      <p className="text-xs font-medium text-red-600 mb-1">Risk Factors:</p>
                                      <p className="text-xs text-red-600">
                                        {performancePrediction.riskFactors.slice(0, 2).join(' • ')}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">Loading prediction...</p>
                              )}
                            </TabsContent>
                          </Tabs>
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
                          <p className="text-sm font-medium mb-2">
                            Will Auto-Generate {jobData.useArchiveDriven ? '(Archive-Optimized)' : '(Standard)'}:
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>Routing Sheet</span>
                              {jobData.useArchiveDriven && <Badge variant="secondary" className="text-xs ml-1">Optimized</Badge>}
                            </div>
                            <div className="flex items-center gap-1">
                              <Cog className="h-3 w-3" />
                              <span>Setup Sheets</span>
                              {jobData.useArchiveDriven && <Badge variant="secondary" className="text-xs ml-1">Historical</Badge>}
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              <span>Tool Lists</span>
                              {jobData.useArchiveDriven && <Badge variant="secondary" className="text-xs ml-1">Proven</Badge>}
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>Quality Tasks</span>
                              {jobData.useArchiveDriven && <Badge variant="secondary" className="text-xs ml-1">Enhanced</Badge>}
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
                      {selectedItems.filter(item => item.useArchiveDriven).length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedItems.filter(item => item.useArchiveDriven).length} Archive-Driven
                        </Badge>
                      )}
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