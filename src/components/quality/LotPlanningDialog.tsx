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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle2, 
  Calendar,
  Settings,
  Clock,
  User,
  BarChart3
} from 'lucide-react';
import type { JobTask } from '@/types';

const lotPlanningSchema = z.object({
  capacityVerified: z.boolean(),
  resourcesAllocated: z.boolean(),
  routingSheetCreated: z.boolean(),
  timelineDeveloped: z.boolean(),
  qualityCheckpointsPlanned: z.boolean(),
  riskMitigationPlanned: z.boolean(),
  plannedBy: z.string().min(1, 'Planner name required'),
  productionManagerApproval: z.boolean(),
  as9100dCompliance: z.boolean(),
  estimatedDuration: z.string().optional(),
  notes: z.string().optional(),
});

type LotPlanningForm = z.infer<typeof lotPlanningSchema>;

interface LotPlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: JobTask;
  onComplete: (planningResult: LotPlanningResult) => Promise<void>;
  isLoading?: boolean;
}

export interface LotPlanningResult {
  id: string;
  taskId: string;
  planningType: 'capacity_check' | 'resource_planning' | 'routing_creation' | 'timeline_creation';
  status: 'approved' | 'rejected' | 'conditional';
  plannedBy: string;
  planningDate: string;
  planningChecks: {
    capacityVerified: boolean;
    resourcesAllocated: boolean;
    routingSheetCreated: boolean;
    timelineDeveloped: boolean;
    qualityCheckpointsPlanned: boolean;
    riskMitigationPlanned: boolean;
    as9100dCompliant: boolean;
  };
  approvals: {
    productionManager: boolean;
  };
  estimatedDuration?: string;
  notes?: string;
}

export default function LotPlanningDialog({
  open,
  onOpenChange,
  task,
  onComplete,
  isLoading = false
}: LotPlanningDialogProps) {
  const form = useForm<LotPlanningForm>({
    resolver: zodResolver(lotPlanningSchema),
    defaultValues: {
      capacityVerified: false,
      resourcesAllocated: false,
      routingSheetCreated: false,
      timelineDeveloped: false,
      qualityCheckpointsPlanned: false,
      riskMitigationPlanned: false,
      plannedBy: '',
      productionManagerApproval: false,
      as9100dCompliance: false,
      estimatedDuration: '',
      notes: ''
    }
  });

  const watchedCompliance = form.watch('as9100dCompliance');
  const watchedProductionApproval = form.watch('productionManagerApproval');

  const onSubmit = async (data: LotPlanningForm) => {
    const overallStatus = data.capacityVerified && 
                         data.resourcesAllocated && 
                         data.timelineDeveloped ? 'approved' : 'conditional';

    const planningResult: LotPlanningResult = {
      id: `${task.id}_lot_planning_${Date.now()}`,
      taskId: task.id,
      planningType: 'capacity_check',
      status: overallStatus,
      plannedBy: data.plannedBy,
      planningDate: new Date().toISOString(),
      planningChecks: {
        capacityVerified: data.capacityVerified,
        resourcesAllocated: data.resourcesAllocated,
        routingSheetCreated: data.routingSheetCreated,
        timelineDeveloped: data.timelineDeveloped,
        qualityCheckpointsPlanned: data.qualityCheckpointsPlanned,
        riskMitigationPlanned: data.riskMitigationPlanned,
        as9100dCompliant: data.as9100dCompliance,
      },
      approvals: {
        productionManager: data.productionManagerApproval,
      },
      estimatedDuration: data.estimatedDuration,
      notes: data.notes
    };

    await onComplete(planningResult);
    onOpenChange(false);
    form.reset();
  };

  const isPlanningValid = watchedCompliance && 
                         watchedProductionApproval &&
                         form.getValues('plannedBy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Lot-Based Planning & Scheduling - AS9100D Clause 8.1
          </DialogTitle>
          <DialogDescription asChild>
            <div>
              Production planning for: <span className="font-medium">{task.name}</span>
              <Badge variant="outline" className="ml-2">
                Operational Planning & Control
              </Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Planning Activities */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Planning Activities
                  </CardTitle>
                  <CardDescription>
                    AS9100D 8.1 - Operational planning and control requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('capacityVerified')}
                        onCheckedChange={(checked) => form.setValue('capacityVerified', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Capacity Verified</label>
                        <p className="text-xs text-muted-foreground">
                          Machine availability and workload capacity confirmed
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('resourcesAllocated')}
                        onCheckedChange={(checked) => form.setValue('resourcesAllocated', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Resources Allocated</label>
                        <p className="text-xs text-muted-foreground">
                          Personnel, equipment, and materials planned
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('routingSheetCreated')}
                        onCheckedChange={(checked) => form.setValue('routingSheetCreated', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Routing Sheet Created</label>
                        <p className="text-xs text-muted-foreground">
                          Operation sequence and setup requirements defined
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('timelineDeveloped')}
                        onCheckedChange={(checked) => form.setValue('timelineDeveloped', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Timeline Developed</label>
                        <p className="text-xs text-muted-foreground">
                          Realistic timeline considering all dependencies
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('qualityCheckpointsPlanned')}
                        onCheckedChange={(checked) => form.setValue('qualityCheckpointsPlanned', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Quality Checkpoints Planned</label>
                        <p className="text-xs text-muted-foreground">
                          Quality control points integrated into schedule
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('riskMitigationPlanned')}
                        onCheckedChange={(checked) => form.setValue('riskMitigationPlanned', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Risk Mitigation Planned</label>
                        <p className="text-xs text-muted-foreground">
                          Schedule and technical risks identified with mitigation
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Approval & Details */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Planning Details
                  </CardTitle>
                  <CardDescription>
                    Planning information and approvals
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Planned By</label>
                    <Input
                      placeholder="Production planner name"
                      value={form.watch('plannedBy')}
                      onChange={(e) => form.setValue('plannedBy', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Estimated Duration (optional)</label>
                    <Input
                      placeholder="e.g., 2 weeks, 15 days"
                      value={form.watch('estimatedDuration')}
                      onChange={(e) => form.setValue('estimatedDuration', e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('productionManagerApproval')}
                        onCheckedChange={(checked) => form.setValue('productionManagerApproval', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Production Manager Approval</label>
                        <p className="text-xs text-muted-foreground">
                          Production schedule and resource allocation approved
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('as9100dCompliance')}
                        onCheckedChange={(checked) => form.setValue('as9100dCompliance', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">AS9100D Clause 8.1 Compliance</label>
                        <p className="text-xs text-muted-foreground">
                          All operational planning requirements satisfied
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Planning Notes</label>
                    <Textarea
                      placeholder="Planning notes, constraints, or special considerations..."
                      className="min-h-[80px]"
                      value={form.watch('notes')}
                      onChange={(e) => form.setValue('notes', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Planning Summary */}
              <Card className="border-2 border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Planning Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Planning Status</p>
                      <Badge variant={isPlanningValid ? "default" : "destructive"}>
                        {isPlanningValid ? "Planning Complete" : "Planning Incomplete"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">AS9100D Compliance</p>
                      <Badge variant={watchedCompliance ? "default" : "destructive"}>
                        {watchedCompliance ? "Compliant" : "Non-Compliant"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

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
              disabled={isLoading || !isPlanningValid}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Planning
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 