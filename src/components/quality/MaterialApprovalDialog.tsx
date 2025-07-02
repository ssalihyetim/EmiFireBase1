'use client';

import React from 'react';
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
  Shield,
  Package,
  Clock
} from 'lucide-react';
import type { JobTask } from '@/types';
import { getJobLotNumber } from '@/lib/centralized-lot-management';

const materialApprovalSchema = z.object({
  materialCertificateVerified: z.boolean(),
  traceabilityVerified: z.boolean(),
  physicalInspectionComplete: z.boolean(),
  lotNumberAssigned: z.string().min(1, 'Lot number is required'),
  approvedBy: z.string().min(1, 'Approver name is required'),
  qualityManagerSignoff: z.boolean(),
  as9100dCompliance: z.boolean(),
  supplierName: z.string().min(1, 'Supplier name is required'),
  notes: z.string().optional(),
});

type MaterialApprovalForm = z.infer<typeof materialApprovalSchema>;

interface MaterialApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: JobTask;
  jobId?: string;
  partNumber?: string;
  partName?: string;
  orderId?: string;
  onComplete: (approvalResult: MaterialApprovalResult) => Promise<void>;
  isLoading?: boolean;
}

export interface MaterialApprovalResult {
  id: string;
  taskId: string;
  approvalType: 'material_certification';
  status: 'approved' | 'rejected' | 'conditional';
  approvedBy: string;
  approvalDate: string;
  lotNumber: string;
  supplierName: string;
  complianceChecks: {
    certificateVerified: boolean;
    traceabilityVerified: boolean;
    physicalInspection: boolean;
    as9100dCompliant: boolean;
  };
  notes?: string;
}

export default function MaterialApprovalDialog({
  open,
  onOpenChange,
  task,
  jobId,
  partNumber,
  partName,
  orderId,
  onComplete,
  isLoading = false
}: MaterialApprovalDialogProps) {
  const form = useForm<MaterialApprovalForm>({
    resolver: zodResolver(materialApprovalSchema),
    defaultValues: {
      materialCertificateVerified: false,
      traceabilityVerified: false,
      physicalInspectionComplete: false,
      lotNumberAssigned: '',
      approvedBy: '',
      qualityManagerSignoff: false,
      as9100dCompliance: false,
      supplierName: '',
      notes: ''
    }
  });

  const watchedCompliance = form.watch('as9100dCompliance');
  const watchedQualitySignoff = form.watch('qualityManagerSignoff');

  const onSubmit = async (data: MaterialApprovalForm) => {
    const approvalResult: MaterialApprovalResult = {
      id: `${task.id}_material_approval_${Date.now()}`,
      taskId: task.id,
      approvalType: 'material_certification',
      status: 'approved',
      approvedBy: data.approvedBy,
      approvalDate: new Date().toISOString(),
      lotNumber: data.lotNumberAssigned,
      supplierName: data.supplierName,
      complianceChecks: {
        certificateVerified: data.materialCertificateVerified,
        traceabilityVerified: data.traceabilityVerified,
        physicalInspection: data.physicalInspectionComplete,
        as9100dCompliant: data.as9100dCompliance,
      },
      notes: data.notes
    };

    await onComplete(approvalResult);
    onOpenChange(false);
    form.reset();
  };

  const generateLotNumber = async () => {
    try {
      // Use centralized lot management if job information is available
      if (jobId && partNumber && partName && orderId) {
        const lotNumber = await getJobLotNumber(
          jobId,
          partNumber,
          partName,
          orderId,
          'material_approval'
        );
        form.setValue('lotNumberAssigned', lotNumber);
      } else {
        // Fallback to inline generation if job info is not available
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = date.getTime().toString().slice(-4);
        const lotNumber = `LOT-${dateStr}-${timeStr}`;
        form.setValue('lotNumberAssigned', lotNumber);
      }
    } catch (error) {
      console.error('Error generating lot number:', error);
      // Fallback to inline generation on error
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = date.getTime().toString().slice(-4);
      const lotNumber = `LOT-${dateStr}-${timeStr}`;
      form.setValue('lotNumberAssigned', lotNumber);
    }
  };

  const isApprovalValid = watchedCompliance && 
                         watchedQualitySignoff &&
                         form.getValues('lotNumberAssigned') &&
                         form.getValues('approvedBy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Material Approval - AS9100D Clause 8.4.3
          </DialogTitle>
          <DialogDescription asChild>
            <div>
              Material approval for: <span className="font-medium">{task.name}</span>
              <Badge variant="outline" className="ml-2">
                Control of Externally Provided Materials
              </Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Material Information */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Material Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Supplier Name</label>
                    <Input 
                      placeholder="Enter supplier name" 
                      {...form.register('supplierName')} 
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Assigned Lot Number</label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="LOT-YYYYMMDD-XXXX" 
                        {...form.register('lotNumberAssigned')} 
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateLotNumber}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('materialCertificateVerified')}
                        onCheckedChange={(checked) => form.setValue('materialCertificateVerified', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Material Certificate Verified</label>
                        <p className="text-xs text-muted-foreground">
                          Certificate matches specification requirements
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('traceabilityVerified')}
                        onCheckedChange={(checked) => form.setValue('traceabilityVerified', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Traceability Chain Verified</label>
                        <p className="text-xs text-muted-foreground">
                          Complete traceability from mill to delivery
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('physicalInspectionComplete')}
                        onCheckedChange={(checked) => form.setValue('physicalInspectionComplete', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Physical Inspection Complete</label>
                        <p className="text-xs text-muted-foreground">
                          Visual inspection for damage, contamination, etc.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Approval */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Approval & Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Approved By</label>
                    <Input 
                      placeholder="Quality Manager/Authorized Personnel" 
                      {...form.register('approvedBy')} 
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('qualityManagerSignoff')}
                        onCheckedChange={(checked) => form.setValue('qualityManagerSignoff', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Quality Manager Signoff</label>
                        <p className="text-xs text-muted-foreground">
                          Material approved for production use
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        checked={form.watch('as9100dCompliance')}
                        onCheckedChange={(checked) => form.setValue('as9100dCompliance', !!checked)}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">AS9100D Clause 8.4.3 Compliance</label>
                        <p className="text-xs text-muted-foreground">
                          All material approval requirements satisfied
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Notes (Optional)</label>
                    <Textarea
                      placeholder="Additional notes about material approval..."
                      className="min-h-[80px]"
                      {...form.register('notes')}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Approval Summary */}
              <Card className="border-2 border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Material Approval Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">AS9100D Compliance</p>
                      <Badge variant={isApprovalValid ? "default" : "destructive"}>
                        {isApprovalValid ? "Compliant" : "Non-Compliant"}
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
              disabled={isLoading || !isApprovalValid}
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
                  Approve Material
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 