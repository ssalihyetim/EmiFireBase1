'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Shield,
  FileText,
  Camera,
  Ruler,
  Eye,
  Settings
} from 'lucide-react';
import type { JobTask, JobSubtask } from '@/types';
import type { QualityResult } from '@/types/archival';

// Form validation schema
const qualityAssessmentSchema = z.object({
  qualityScore: z.number().min(1).max(10),
  inspectionType: z.enum(['fai', 'in_process', 'final', 'dimensional', 'visual', 'functional']),
  result: z.enum(['pass', 'fail', 'conditional', 'rework_required']),
  inspectedBy: z.string().min(1, 'Inspector name is required'),
  notes: z.string().optional(),
  measurements: z.array(z.object({
    dimension: z.string(),
    specified: z.string(),
    actual: z.string(),
    tolerance: z.string(),
    withinSpec: z.boolean()
  })).optional(),
  photos: z.array(z.string()).optional()
});

type QualityAssessmentForm = z.infer<typeof qualityAssessmentSchema>;

interface TaskCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: JobTask;
  onComplete: (qualityResult: QualityResult, operatorNotes?: string[]) => Promise<void>;
  isLoading?: boolean;
}

const inspectionTypeLabels = {
  fai: 'First Article Inspection',
  in_process: 'In-Process Quality Check',
  final: 'Final Inspection',
  dimensional: 'Dimensional Inspection',
  visual: 'Visual Inspection',
  functional: 'Functional Test'
};

const resultLabels = {
  pass: 'Pass',
  fail: 'Fail',
  conditional: 'Conditional Pass',
  rework_required: 'Rework Required'
};

const resultColors = {
  pass: 'bg-green-100 text-green-700 border-green-300',
  fail: 'bg-red-100 text-red-700 border-red-300',
  conditional: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  rework_required: 'bg-orange-100 text-orange-700 border-orange-300'
};

const resultIcons = {
  pass: CheckCircle2,
  fail: XCircle,
  conditional: AlertTriangle,
  rework_required: Settings
};

export default function TaskCompletionDialog({
  open,
  onOpenChange,
  task,
  onComplete,
  isLoading = false
}: TaskCompletionDialogProps) {
  const [measurements, setMeasurements] = useState<Array<{
    dimension: string;
    specified: string;
    actual: string;
    tolerance: string;
    withinSpec: boolean;
  }>>([]);

  const form = useForm<QualityAssessmentForm>({
    resolver: zodResolver(qualityAssessmentSchema),
    defaultValues: {
      qualityScore: 8,
      inspectionType: 'final',
      result: 'pass',
      inspectedBy: '',
      notes: '',
      measurements: [],
      photos: []
    }
  });

  const watchedResult = form.watch('result');
  const watchedScore = form.watch('qualityScore');
  const watchedInspectionType = form.watch('inspectionType');

  const onSubmit = async (data: QualityAssessmentForm) => {
    const qualityResult: QualityResult = {
      id: `${task.id}_completion_${Date.now()}`,
      taskId: task.id,
      inspectionType: data.inspectionType,
      result: data.result,
      score: data.qualityScore,
      inspectedBy: data.inspectedBy,
      inspectionDate: new Date().toISOString(),
      ...(measurements.length > 0 && { measurements }),
      notes: data.notes,
      photos: data.photos
    };

    const operatorNotes = data.notes ? [data.notes] : undefined;

    await onComplete(qualityResult, operatorNotes);
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

  const getQualityScoreColor = (score: number) => {
    if (score >= 9) return 'text-green-600';
    if (score >= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityScoreLabel = (score: number) => {
    if (score >= 9) return 'Excellent';
    if (score >= 8) return 'Good';
    if (score >= 7) return 'Acceptable';
    if (score >= 6) return 'Below Standard';
    return 'Unacceptable';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Complete Task with Quality Assessment
          </DialogTitle>
          <DialogDescription asChild>
            <div>
              Task: <span className="font-medium">{task.name}</span>
              {task.as9100dClause && (
                <Badge variant="outline" className="ml-2">
                  AS9100D {task.as9100dClause}
                </Badge>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Quality Score Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Quality Assessment
                </CardTitle>
                <CardDescription>
                  Rate the overall quality of work performed (1-10 scale)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="qualityScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quality Score</FormLabel>
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
                          <div className="flex justify-between items-center">
                            <span className={`text-2xl font-bold ${getQualityScoreColor(watchedScore)}`}>
                              {watchedScore}/10
                            </span>
                            <Badge variant="outline" className={getQualityScoreColor(watchedScore)}>
                              {getQualityScoreLabel(watchedScore)}
                            </Badge>
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        AS9100D Compliance requires ≥8/10 for standard acceptance
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Inspection Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Inspection Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                            {Object.entries(inspectionTypeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
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
                            {Object.entries(resultLabels).map(([value, label]) => {
                              const Icon = resultIcons[value as keyof typeof resultIcons];
                              return (
                                <SelectItem key={value} value={value}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    {label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="inspectedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inspector Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter inspector name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Measurements Section (for dimensional inspections) */}
            {watchedInspectionType === 'dimensional' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Ruler className="h-5 w-5" />
                    Dimensional Measurements
                  </CardTitle>
                  <CardDescription>
                    Record dimensional inspection results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {measurements.map((measurement, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Measurement {index + 1}</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeMeasurement(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Dimension"
                          value={measurement.dimension}
                          onChange={(e) => updateMeasurement(index, 'dimension', e.target.value)}
                        />
                        <Input
                          placeholder="Specified Value"
                          value={measurement.specified}
                          onChange={(e) => updateMeasurement(index, 'specified', e.target.value)}
                        />
                        <Input
                          placeholder="Actual Value"
                          value={measurement.actual}
                          onChange={(e) => updateMeasurement(index, 'actual', e.target.value)}
                        />
                        <Input
                          placeholder="Tolerance"
                          value={measurement.tolerance}
                          onChange={(e) => updateMeasurement(index, 'tolerance', e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={measurement.withinSpec}
                          onChange={(e) => updateMeasurement(index, 'withinSpec', e.target.checked)}
                        />
                        <label className="text-sm">Within Specification</label>
                      </div>
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
            )}

            {/* Notes Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Inspector Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional notes about the quality assessment..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include any observations, issues found, or recommendations
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Quality Summary */}
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Quality Assessment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Inspection Type</p>
                    <p className="font-medium">{inspectionTypeLabels[watchedInspectionType]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Result</p>
                    <div>
                      <Badge variant="outline" className={resultColors[watchedResult]}>
                        {resultLabels[watchedResult]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quality Score</p>
                    <p className={`font-bold text-lg ${getQualityScoreColor(watchedScore)}`}>
                      {watchedScore}/10 - {getQualityScoreLabel(watchedScore)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">AS9100D Compliance</p>
                    <div>
                      <Badge variant={watchedScore >= 8 ? "default" : "destructive"}>
                        {watchedScore >= 8 ? "Compliant" : "Non-Compliant"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Complete Task
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 