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
  AlertTriangle, 
  FileText,
  Shield,
  Clock,
  User,
  Settings
} from 'lucide-react';
import type { JobTask } from '@/types';

const contractReviewSchema = z.object({
  requirementsUnderstood: z.boolean(),
  deliverableDefined: z.boolean(),
  resourcesAvailable: z.boolean(),
  timelineRealistic: z.boolean(),
  riskAssessmentComplete: z.boolean(),
  customerRequirementsAccepted: z.boolean(),
  reviewedBy: z.string().min(1, 'Reviewer name required'),
  salesManagerApproval: z.boolean(),
  engineeringApproval: z.boolean(),
  as9100dCompliance: z.boolean(),
  notes: z.string().optional(),
});

type ContractReviewForm = z.infer<typeof contractReviewSchema>;

interface ContractReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: JobTask;
  onComplete: (reviewResult: ContractReviewResult) => Promise<void>;
  isLoading?: boolean;
}

export interface ContractReviewResult {
  id: string;
  taskId: string;
  reviewType: 'contract_analysis' | 'drawing_review' | 'requirement_verification';
  status: 'accepted' | 'rejected' | 'conditional';
  reviewedBy: string;
  reviewDate: string;
  complianceChecks: {
    requirementsUnderstood: boolean;
    deliverableDefined: boolean;
    resourcesAvailable: boolean;
    timelineRealistic: boolean;
    riskAssessmentComplete: boolean;
    customerRequirementsAccepted: boolean;
    as9100dCompliant: boolean;
  };
  approvals: {
    salesManager: boolean;
    engineering: boolean;
  };
  notes?: string;
}

export default function ContractReviewDialog({
  open,
  onOpenChange,
  task,
  onComplete,
  isLoading = false
}: ContractReviewDialogProps) {
  const form = useForm<ContractReviewForm>({
    resolver: zodResolver(contractReviewSchema),
    defaultValues: {
      requirementsUnderstood: false,
      deliverableDefined: false,
      resourcesAvailable: false,
      timelineRealistic: false,
      riskAssessmentComplete: false,
      customerRequirementsAccepted: false,
      reviewedBy: '',
      salesManagerApproval: false,
      engineeringApproval: false,
      as9100dCompliance: false,
      notes: ''
    }
  });

  const watchedCompliance = form.watch('as9100dCompliance');
  const watchedSalesApproval = form.watch('salesManagerApproval');
  const watchedEngineeringApproval = form.watch('engineeringApproval');

  const onSubmit = async (data: ContractReviewForm) => {
    const overallStatus = data.customerRequirementsAccepted && 
                         data.resourcesAvailable && 
                         data.timelineRealistic ? 'accepted' : 'conditional';

    const reviewResult: ContractReviewResult = {
      id: `${task.id}_contract_review_${Date.now()}`,
      taskId: task.id,
      reviewType: 'contract_analysis',
      status: overallStatus,
      reviewedBy: data.reviewedBy,
      reviewDate: new Date().toISOString(),
      complianceChecks: {
        requirementsUnderstood: data.requirementsUnderstood,
        deliverableDefined: data.deliverableDefined,
        resourcesAvailable: data.resourcesAvailable,
        timelineRealistic: data.timelineRealistic,
        riskAssessmentComplete: data.riskAssessmentComplete,
        customerRequirementsAccepted: data.customerRequirementsAccepted,
        as9100dCompliant: data.as9100dCompliance,
      },
      approvals: {
        salesManager: data.salesManagerApproval,
        engineering: data.engineeringApproval,
      },
      notes: data.notes
    };

    await onComplete(reviewResult);
    onOpenChange(false);
    form.reset();
  };

  const isReviewValid = watchedCompliance && 
                       watchedSalesApproval && 
                       watchedEngineeringApproval &&
                       form.getValues('reviewedBy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Contract Review - AS9100D Clause 8.2.3.1
          </DialogTitle>
          <DialogDescription asChild>
            <div>
              Contract review for: <span className="font-medium">{task.name}</span>
              <Badge variant="outline" className="ml-2">
                Requirements Review
              </Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Requirements Review */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Requirements Analysis
                  </CardTitle>
                  <CardDescription>
                    AS9100D 8.2.3.1 - Review of requirements for products and services
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('requirementsUnderstood')}
                        onCheckedChange={(checked) => form.setValue('requirementsUnderstood', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Requirements Understood</label>
                        <p className="text-xs text-muted-foreground">
                          Technical and customer requirements clearly defined
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('deliverableDefined')}
                        onCheckedChange={(checked) => form.setValue('deliverableDefined', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Deliverables Defined</label>
                        <p className="text-xs text-muted-foreground">
                          Scope of work and deliverables clearly specified
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('resourcesAvailable')}
                        onCheckedChange={(checked) => form.setValue('resourcesAvailable', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Resources Available</label>
                        <p className="text-xs text-muted-foreground">
                          Required personnel, equipment, and materials available
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('timelineRealistic')}
                        onCheckedChange={(checked) => form.setValue('timelineRealistic', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Timeline Realistic</label>
                        <p className="text-xs text-muted-foreground">
                          Delivery schedule achievable with available capacity
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('riskAssessmentComplete')}
                        onCheckedChange={(checked) => form.setValue('riskAssessmentComplete', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Risk Assessment Complete</label>
                        <p className="text-xs text-muted-foreground">
                          Technical and schedule risks identified and assessed
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('customerRequirementsAccepted')}
                        onCheckedChange={(checked) => form.setValue('customerRequirementsAccepted', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Customer Requirements Accepted</label>
                        <p className="text-xs text-muted-foreground">
                          All customer requirements can be met as specified
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Approvals */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Review & Approval
                  </CardTitle>
                  <CardDescription>
                    Required approvals and compliance verification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Reviewed By</label>
                    <Input
                      placeholder="Contract reviewer name"
                      value={form.watch('reviewedBy')}
                      onChange={(e) => form.setValue('reviewedBy', e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('salesManagerApproval')}
                        onCheckedChange={(checked) => form.setValue('salesManagerApproval', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Sales Manager Approval</label>
                        <p className="text-xs text-muted-foreground">
                          Commercial terms and customer relationship approved
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('engineeringApproval')}
                        onCheckedChange={(checked) => form.setValue('engineeringApproval', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Engineering Lead Approval</label>
                        <p className="text-xs text-muted-foreground">
                          Technical feasibility and specifications approved
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('as9100dCompliance')}
                        onCheckedChange={(checked) => form.setValue('as9100dCompliance', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">AS9100D Clause 8.2.3.1 Compliance</label>
                        <p className="text-xs text-muted-foreground">
                          All contract review requirements satisfied
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Review Notes</label>
                    <Textarea
                      placeholder="Contract review notes and observations..."
                      className="min-h-[80px]"
                      value={form.watch('notes')}
                      onChange={(e) => form.setValue('notes', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Review Summary */}
              <Card className="border-2 border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Contract Review Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Review Status</p>
                      <Badge variant={isReviewValid ? "default" : "destructive"}>
                        {isReviewValid ? "Review Complete" : "Review Incomplete"}
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
              disabled={isLoading || !isReviewValid}
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
                  Complete Review
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 