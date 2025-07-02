'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  Settings, 
  CheckCircle2, 
  Package, 
  Timer, 
  User, 
  Wrench,
  BarChart3,
  AlertTriangle,
  Info
} from 'lucide-react';
import type { JobTask } from '@/types';
import type { QualityResult } from '@/types/archival';

// Enhanced manufacturing completion schema
const manufacturingCompletionSchema = z.object({
  // Timing Information
  setupStartTime: z.string().min(1, 'Setup start time is required'),
  setupEndTime: z.string().min(1, 'Setup end time is required'),
  processEndTime: z.string().min(1, 'Process end time is required'),
  averageCycleTimeMinutes: z.coerce.number().min(0.1, 'Average cycle time must be greater than 0'),
  
  // Production Quantities
  inputQuantity: z.coerce.number().min(1, 'Input quantity is required'),
  outputQuantity: z.coerce.number().min(0, 'Output quantity is required'),
  scrapQuantity: z.coerce.number().min(0, 'Scrap quantity cannot be negative').default(0),
  reworkQuantity: z.coerce.number().min(0, 'Rework quantity cannot be negative').default(0),
  
  // Operator Information
  operatorId: z.string().min(1, 'Operator ID is required'),
  machineUsed: z.string().min(1, 'Machine ID is required'),
  
  // Quality Assessment
  qualityScore: z.coerce.number().min(1).max(10).default(8),
  inspectionType: z.enum(['fai', 'in_process', 'final', 'dimensional', 'visual', 'functional']).default('final'),
  result: z.enum(['pass', 'fail', 'conditional', 'rework_required']).default('pass'),
  
  // Additional Data
  setupNotes: z.string().optional(),
  processNotes: z.string().optional(),
  issuesEncountered: z.string().optional(),
  toolsUsed: z.string().optional(), // Comma-separated tool numbers
  
  // Process-specific measurements
  measurements: z.array(z.object({
    dimension: z.string(),
    specified: z.string(),
    actual: z.string(),
    tolerance: z.string(),
    withinSpec: z.boolean()
  })).optional()
});

type ManufacturingCompletionForm = z.infer<typeof manufacturingCompletionSchema>;

interface ManufacturingProcessCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: JobTask;
  onComplete: (
    qualityResult: QualityResult, 
    manufacturingData: ManufacturingProcessData,
    operatorNotes?: string[]
  ) => Promise<void>;
  isLoading?: boolean;
}

export interface ManufacturingProcessData {
  // Timing data
  setupStartTime: string;
  setupEndTime: string;
  processEndTime: string;
  actualSetupTimeMinutes: number;
  actualProcessTimeMinutes: number;
  averageCycleTimeMinutes: number;
  
  // Production data
  inputQuantity: number;
  outputQuantity: number;
  scrapQuantity: number;
  reworkQuantity: number;
  yieldPercentage: number;
  
  // Operator data
  operatorId: string;
  machineUsed: string;
  toolsUsed: string[];
  
  // Process notes
  setupNotes?: string;
  processNotes?: string;
  issuesEncountered?: string;
  
  // Performance metrics
  setupEfficiency: number; // Actual vs estimated setup time
  cycleTimeEfficiency: number; // Actual vs estimated cycle time
  qualityEfficiency: number; // Good parts / total parts
}

export default function ManufacturingProcessCompletionDialog({
  open,
  onOpenChange,
  task,
  onComplete,
  isLoading = false
}: ManufacturingProcessCompletionDialogProps) {
  const [measurements, setMeasurements] = useState<Array<{
    dimension: string;
    specified: string;
    actual: string;
    tolerance: string;
    withinSpec: boolean;
  }>>([]);

  const form = useForm<ManufacturingCompletionForm>({
    resolver: zodResolver(manufacturingCompletionSchema),
    defaultValues: {
      setupStartTime: '',
      setupEndTime: '',
      processEndTime: '',
      averageCycleTimeMinutes: task.cycleTimeMinutes || 15,
      inputQuantity: task.quantity || 1,
      outputQuantity: task.quantity || 1,
      scrapQuantity: 0,
      reworkQuantity: 0,
      operatorId: '',
      machineUsed: task.scheduledMachineId || task.scheduledMachineName || '',
      qualityScore: 8,
      inspectionType: 'final',
      result: 'pass',
      setupNotes: '',
      processNotes: '',
      issuesEncountered: '',
      toolsUsed: ''
    }
  });

  const watchedSetupStart = form.watch('setupStartTime');
  const watchedSetupEnd = form.watch('setupEndTime');
  const watchedProcessEnd = form.watch('processEndTime');
  const watchedInputQuantity = form.watch('inputQuantity');
  const watchedOutputQuantity = form.watch('outputQuantity');
  const watchedScrapQuantity = form.watch('scrapQuantity');
  const watchedReworkQuantity = form.watch('reworkQuantity');
  const watchedQualityScore = form.watch('qualityScore');
  const watchedCycleTime = form.watch('averageCycleTimeMinutes');

  // Calculate derived metrics
  const actualSetupTime = React.useMemo(() => {
    if (watchedSetupStart && watchedSetupEnd) {
      const start = new Date(watchedSetupStart).getTime();
      const end = new Date(watchedSetupEnd).getTime();
      return Math.round((end - start) / (1000 * 60)); // Minutes
    }
    return 0;
  }, [watchedSetupStart, watchedSetupEnd]);

  const actualProcessTime = React.useMemo(() => {
    if (watchedSetupEnd && watchedProcessEnd) {
      const start = new Date(watchedSetupEnd).getTime();
      const end = new Date(watchedProcessEnd).getTime();
      return Math.round((end - start) / (1000 * 60)); // Minutes
    }
    return 0;
  }, [watchedSetupEnd, watchedProcessEnd]);

  const yieldPercentage = React.useMemo(() => {
    if (watchedInputQuantity > 0) {
      return Math.round((watchedOutputQuantity / watchedInputQuantity) * 100);
    }
    return 0;
  }, [watchedInputQuantity, watchedOutputQuantity]);

  const setupEfficiency = React.useMemo(() => {
    const estimatedSetup = task.setupTimeMinutes || 30;
    if (actualSetupTime > 0) {
      return Math.round((estimatedSetup / actualSetupTime) * 100);
    }
    return 100;
  }, [actualSetupTime, task.setupTimeMinutes]);

  const cycleTimeEfficiency = React.useMemo(() => {
    const estimatedCycle = task.cycleTimeMinutes || 15;
    if (watchedCycleTime > 0) {
      return Math.round((estimatedCycle / watchedCycleTime) * 100);
    }
    return 100;
  }, [watchedCycleTime, task.cycleTimeMinutes]);

  // Auto-fill current time for convenience
  const fillCurrentTime = (field: 'setupStartTime' | 'setupEndTime' | 'processEndTime') => {
    const now = new Date();
    // Format for datetime-local input
    const timeString = now.toISOString().slice(0, 16);
    form.setValue(field, timeString);
  };

  const onSubmit = async (data: ManufacturingCompletionForm) => {
    // Create quality result
    const qualityResult: QualityResult = {
      id: `${task.id}_manufacturing_completion_${Date.now()}`,
      taskId: task.id,
      inspectionType: data.inspectionType,
      result: data.result,
      score: data.qualityScore,
      inspectedBy: data.operatorId,
      inspectionDate: data.processEndTime,
      ...(measurements.length > 0 && { measurements }),
      notes: [data.setupNotes, data.processNotes, data.issuesEncountered].filter(Boolean).join('; ')
    };

    // Create manufacturing process data
    const manufacturingData: ManufacturingProcessData = {
      setupStartTime: data.setupStartTime,
      setupEndTime: data.setupEndTime,
      processEndTime: data.processEndTime,
      actualSetupTimeMinutes: actualSetupTime,
      actualProcessTimeMinutes: actualProcessTime,
      averageCycleTimeMinutes: data.averageCycleTimeMinutes,
      inputQuantity: data.inputQuantity,
      outputQuantity: data.outputQuantity,
      scrapQuantity: data.scrapQuantity,
      reworkQuantity: data.reworkQuantity,
      yieldPercentage: yieldPercentage,
      operatorId: data.operatorId,
      machineUsed: data.machineUsed,
      toolsUsed: data.toolsUsed ? data.toolsUsed.split(',').map(t => t.trim()).filter(Boolean) : [],
      setupNotes: data.setupNotes,
      processNotes: data.processNotes,
      issuesEncountered: data.issuesEncountered,
      setupEfficiency: setupEfficiency,
      cycleTimeEfficiency: cycleTimeEfficiency,
      qualityEfficiency: yieldPercentage
    };

    const operatorNotes = [
      `Setup Time: ${actualSetupTime} min (Est: ${task.setupTimeMinutes || 30} min, Efficiency: ${setupEfficiency}%)`,
      `Process Time: ${actualProcessTime} min`,
      `Cycle Time: ${data.averageCycleTimeMinutes} min (Est: ${task.cycleTimeMinutes || 15} min, Efficiency: ${cycleTimeEfficiency}%)`,
      `Yield: ${watchedOutputQuantity}/${data.inputQuantity} parts (${yieldPercentage}%)`,
      `Machine: ${data.machineUsed}`,
      `Operator: ${data.operatorId}`,
      ...(data.setupNotes ? [`Setup Notes: ${data.setupNotes}`] : []),
      ...(data.processNotes ? [`Process Notes: ${data.processNotes}`] : []),
      ...(data.issuesEncountered ? [`Issues: ${data.issuesEncountered}`] : [])
    ];

    await onComplete(qualityResult, manufacturingData, operatorNotes);
    onOpenChange(false);
    form.reset();
    setMeasurements([]);
  };

  const addMeasurement = () => {
    setMeasurements([...measurements, {
      dimension: '',
      specified: '',
      actual: '',
      tolerance: '',
      withinSpec: false
    }]);
  };

  const updateMeasurement = (index: number, field: string, value: string | boolean) => {
    const updated = [...measurements];
    updated[index] = { ...updated[index], [field]: value };
    setMeasurements(updated);
  };

  const removeMeasurement = (index: number) => {
    setMeasurements(measurements.filter((_, i) => i !== index));
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return 'text-green-600';
    if (efficiency >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getYieldColor = (yieldPercent: number) => {
    if (yieldPercent >= 95) return 'text-green-600';
    if (yieldPercent >= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Manufacturing Process Completion
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <div>
                Task: <span className="font-medium">{task.name}</span>
                {task.as9100dClause && (
                  <Badge variant="outline" className="ml-2">
                    AS9100D {task.as9100dClause}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Record actual setup times, process completion time, production quantities, and quality assessment
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Real-time Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Real-time Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      <span className={getEfficiencyColor(setupEfficiency)}>{setupEfficiency}%</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Setup Efficiency</div>
                    <div className="text-xs">{actualSetupTime}min actual vs {task.setupTimeMinutes || 30}min est</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      <span className={getEfficiencyColor(cycleTimeEfficiency)}>{cycleTimeEfficiency}%</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Cycle Time Efficiency</div>
                    <div className="text-xs">{watchedCycleTime}min vs {task.cycleTimeMinutes || 15}min est</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      <span className={getYieldColor(yieldPercentage)}>{yieldPercentage}%</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Yield</div>
                    <div className="text-xs">{watchedOutputQuantity}/{watchedInputQuantity} parts</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timing Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Process Timing
                </CardTitle>
                <CardDescription>
                  Record actual setup start time, setup completion, and process end time
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="setupStartTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setup Start Time</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fillCurrentTime('setupStartTime')}
                          >
                            Now
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="setupEndTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setup Complete Time</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fillCurrentTime('setupEndTime')}
                          >
                            Now
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="processEndTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Process End Time</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fillCurrentTime('processEndTime')}
                          >
                            Now
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="averageCycleTimeMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Average Cycle Time (minutes per piece)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          {...field}
                          placeholder="Enter actual average cycle time"
                        />
                      </FormControl>
                      <FormDescription>
                        Estimated: {task.cycleTimeMinutes || 15} minutes per piece
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {actualSetupTime > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-blue-800">
                      Calculated Setup Time: {actualSetupTime} minutes
                    </div>
                    <div className="text-xs text-blue-600">
                      Estimated: {task.setupTimeMinutes || 30} minutes
                      {setupEfficiency !== 100 && (
                        <span className={`ml-2 ${getEfficiencyColor(setupEfficiency)}`}>
                          ({setupEfficiency}% efficiency)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Production Quantities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Production Quantities
                </CardTitle>
                <CardDescription>
                  Record input material, output parts, scrap, and rework quantities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="inputQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Input Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            placeholder="Raw material pieces"
                          />
                        </FormControl>
                        <FormDescription>Raw material or previous process</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="outputQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Output Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            placeholder="Good parts produced"
                          />
                        </FormControl>
                        <FormDescription>Good parts produced</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scrapQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scrap Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            placeholder="Scrapped parts"
                          />
                        </FormControl>
                        <FormDescription>Parts scrapped</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reworkQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rework Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            placeholder="Parts for rework"
                          />
                        </FormControl>
                        <FormDescription>Parts requiring rework</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {yieldPercentage > 0 && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-green-800">
                      Yield: {watchedOutputQuantity}/{watchedInputQuantity} parts ({yieldPercentage}%)
                    </div>
                    {(watchedScrapQuantity > 0 || watchedReworkQuantity > 0) && (
                      <div className="text-xs text-green-600 mt-1">
                        {watchedScrapQuantity > 0 && `${watchedScrapQuantity} scrapped`}
                        {watchedScrapQuantity > 0 && watchedReworkQuantity > 0 && ', '}
                        {watchedReworkQuantity > 0 && `${watchedReworkQuantity} for rework`}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Operator & Machine Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Operator & Machine Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="operatorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operator ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter operator ID"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="machineUsed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Machine Used</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Machine ID or name"
                          />
                        </FormControl>
                        <FormDescription>Scheduled: {task.scheduledMachineName || 'Not assigned'}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="toolsUsed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tools Used</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="T01, T02, T03..."
                          />
                        </FormControl>
                        <FormDescription>Comma-separated tool numbers</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quality Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Quality Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="qualityScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quality Score (1-10)</FormLabel>
                        <FormControl>
                          <div className="space-y-3">
                            <Slider
                              value={[field.value]}
                              onValueChange={(values) => field.onChange(values[0])}
                              min={1}
                              max={10}
                              step={0.5}
                              className="w-full"
                            />
                            <div className="text-center">
                              <span className="text-2xl font-bold">{watchedQualityScore}/10</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="inspectionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inspection Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select inspection type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fai">First Article Inspection</SelectItem>
                            <SelectItem value="in_process">In-Process Quality Check</SelectItem>
                            <SelectItem value="final">Final Inspection</SelectItem>
                            <SelectItem value="dimensional">Dimensional Inspection</SelectItem>
                            <SelectItem value="visual">Visual Inspection</SelectItem>
                            <SelectItem value="functional">Functional Test</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="result"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Result</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select result" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pass">Pass</SelectItem>
                            <SelectItem value="fail">Fail</SelectItem>
                            <SelectItem value="conditional">Conditional Pass</SelectItem>
                            <SelectItem value="rework_required">Rework Required</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notes and Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Process Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="setupNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setup Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Any notes about setup process, adjustments made, etc."
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="processNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Process Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Notes about the manufacturing process, quality observations, etc."
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issuesEncountered"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issues Encountered</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Any problems, machine issues, tool problems, etc."
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Measurements Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Dimensional Measurements (Optional)
                </CardTitle>
                <CardDescription>
                  Record key dimensional checks performed during or after manufacturing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {measurements.map((measurement, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Dimension</Label>
                      <Input
                        value={measurement.dimension}
                        onChange={(e) => updateMeasurement(index, 'dimension', e.target.value)}
                        placeholder="Feature name"
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Specified</Label>
                      <Input
                        value={measurement.specified}
                        onChange={(e) => updateMeasurement(index, 'specified', e.target.value)}
                        placeholder="Target value"
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Actual</Label>
                      <Input
                        value={measurement.actual}
                        onChange={(e) => updateMeasurement(index, 'actual', e.target.value)}
                        placeholder="Measured value"
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Tolerance</Label>
                      <Input
                        value={measurement.tolerance}
                        onChange={(e) => updateMeasurement(index, 'tolerance', e.target.value)}
                        placeholder="±0.001"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={measurement.withinSpec}
                        onChange={(e) => updateMeasurement(index, 'withinSpec', e.target.checked)}
                      />
                      <Label>In Spec</Label>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMeasurement(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addMeasurement}
                  className="w-full"
                >
                  Add Measurement
                </Button>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? 'Completing...' : 'Complete Process'}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}