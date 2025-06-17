'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { JobSubtask } from '@/types/tasks';
import AttachmentUploader from '../shared/AttachmentUploader';

interface FAIReportFormProps {
  subtask: JobSubtask;
  onSave: (formData: any) => void;
  onClose: () => void;
}

export default function FAIReportForm({ subtask, onSave, onClose }: FAIReportFormProps) {
  const [formData, setFormData] = useState({
    // Basic Information
    partNumber: '',
    partName: '',
    revision: '',
    customerPO: '',
    workOrder: '',
    
    // FAI Details
    faiReason: 'new_part', // new_part, engineering_change, process_change, supplier_change
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectedBy: '',
    approvedBy: '',
    
    // Compliance Checklist
    dimensionalInspection: false,
    materialCertification: false,
    functionalTesting: false,
    visualInspection: false,
    surfaceFinishVerification: false,
    
    // Notes and Observations
    inspectionNotes: '',
    nonConformances: '',
    correctiveActions: '',
    
    // Attachments
    attachments: [] as any[]
  });
  
  const [isSaving, setIsSaving] = useState(false);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAttachmentUpload = (attachment: any) => {
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, attachment]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Validate required fields
    if (!formData.partNumber || !formData.inspectedBy) {
      alert('Please fill in all required fields (Part Number and Inspected By)');
      setIsSaving(false);
      return;
    }
    
    const saveData = {
      ...formData,
      subtaskId: subtask.id,
      status: 'completed',
      createdAt: new Date().toISOString()
    };
    
    // The parent component will handle the actual Firestore update
    await onSave(saveData);

    setIsSaving(false);
    onClose();
  };

  const getComplianceStatus = () => {
    const checkedItems = [
      formData.dimensionalInspection,
      formData.materialCertification,
      formData.functionalTesting,
      formData.visualInspection,
      formData.surfaceFinishVerification
    ].filter(Boolean).length;
    
    return { checked: checkedItems, total: 5 };
  };

  const compliance = getComplianceStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold">First Article Inspection Report</h3>
          <p className="text-sm text-gray-600">Subtask: {subtask.name}</p>
        </div>
        <div className="ml-auto">
          <Badge variant={compliance.checked === compliance.total ? "default" : "secondary"}>
            {compliance.checked}/{compliance.total} Checks Complete
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Part Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="partNumber">Part Number *</Label>
              <Input
                id="partNumber"
                value={formData.partNumber}
                onChange={(e) => updateFormData('partNumber', e.target.value)}
                placeholder="Enter part number"
                required
              />
            </div>
            <div>
              <Label htmlFor="partName">Part Name</Label>
              <Input
                id="partName"
                value={formData.partName}
                onChange={(e) => updateFormData('partName', e.target.value)}
                placeholder="Enter part name"
              />
            </div>
            <div>
              <Label htmlFor="revision">Revision</Label>
              <Input
                id="revision"
                value={formData.revision}
                onChange={(e) => updateFormData('revision', e.target.value)}
                placeholder="Rev A, Rev 1, etc."
              />
            </div>
            <div>
              <Label htmlFor="customerPO">Customer PO</Label>
              <Input
                id="customerPO"
                value={formData.customerPO}
                onChange={(e) => updateFormData('customerPO', e.target.value)}
                placeholder="Customer purchase order"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAI Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inspection Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="faiReason">FAI Reason</Label>
              <Select value={formData.faiReason} onValueChange={(value) => updateFormData('faiReason', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_part">New Part</SelectItem>
                  <SelectItem value="engineering_change">Engineering Change</SelectItem>
                  <SelectItem value="process_change">Process Change</SelectItem>
                  <SelectItem value="supplier_change">Supplier Change</SelectItem>
                  <SelectItem value="tooling_change">Tooling Change</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="inspectionDate">Inspection Date</Label>
              <Input
                id="inspectionDate"
                type="date"
                value={formData.inspectionDate}
                onChange={(e) => updateFormData('inspectionDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="inspectedBy">Inspected By *</Label>
              <Input
                id="inspectedBy"
                value={formData.inspectedBy}
                onChange={(e) => updateFormData('inspectedBy', e.target.value)}
                placeholder="Inspector name"
                required
              />
            </div>
            <div>
              <Label htmlFor="approvedBy">Approved By</Label>
              <Input
                id="approvedBy"
                value={formData.approvedBy}
                onChange={(e) => updateFormData('approvedBy', e.target.value)}
                placeholder="Quality manager name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            AS9100D Compliance Checklist
            {compliance.checked === compliance.total && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dimensionalInspection"
              checked={formData.dimensionalInspection}
              onCheckedChange={(checked) => updateFormData('dimensionalInspection', !!checked)}
            />
            <Label htmlFor="dimensionalInspection">Dimensional Inspection Complete</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="materialCertification"
              checked={formData.materialCertification}
              onCheckedChange={(checked) => updateFormData('materialCertification', !!checked)}
            />
            <Label htmlFor="materialCertification">Material Certification Verified</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="functionalTesting"
              checked={formData.functionalTesting}
              onCheckedChange={(checked) => updateFormData('functionalTesting', !!checked)}
            />
            <Label htmlFor="functionalTesting">Functional Testing Complete</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="visualInspection"
              checked={formData.visualInspection}
              onCheckedChange={(checked) => updateFormData('visualInspection', !!checked)}
            />
            <Label htmlFor="visualInspection">Visual Inspection Complete</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="surfaceFinishVerification"
              checked={formData.surfaceFinishVerification}
              onCheckedChange={(checked) => updateFormData('surfaceFinishVerification', !!checked)}
            />
            <Label htmlFor="surfaceFinishVerification">Surface Finish Verification</Label>
          </div>
        </CardContent>
      </Card>

      {/* Notes and Observations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes and Observations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="inspectionNotes">Inspection Notes</Label>
            <Textarea
              id="inspectionNotes"
              value={formData.inspectionNotes}
              onChange={(e) => updateFormData('inspectionNotes', e.target.value)}
              placeholder="Record measurements, observations, and inspection results..."
              className="min-h-[80px]"
            />
          </div>
          <div>
            <Label htmlFor="nonConformances">Non-Conformances</Label>
            <Textarea
              id="nonConformances"
              value={formData.nonConformances}
              onChange={(e) => updateFormData('nonConformances', e.target.value)}
              placeholder="Document any non-conformances found during inspection..."
              className="min-h-[60px]"
            />
          </div>
          <div>
            <Label htmlFor="correctiveActions">Corrective Actions</Label>
            <Textarea
              id="correctiveActions"
              value={formData.correctiveActions}
              onChange={(e) => updateFormData('correctiveActions', e.target.value)}
              placeholder="Document corrective actions taken to address non-conformances..."
              className="min-h-[60px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload FAI Documentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttachmentUploader
            parentId={subtask.id}
            storagePath={`jobs/${subtask.jobId}/fai_reports`}
            onUploadComplete={handleAttachmentUpload}
          />
          
          {formData.attachments.length > 0 && (
            <div className="mt-4">
              <Label className="text-sm font-medium">Uploaded Files:</Label>
              <div className="mt-2 space-y-2">
                {formData.attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm text-blue-600 hover:underline flex-1"
                    >
                      {file.name}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={isSaving || !formData.partNumber || !formData.inspectedBy}
        >
          {isSaving ? 'Saving...' : 'Save FAI Report'}
        </Button>
      </div>
    </div>
  );
} 