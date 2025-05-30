'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Settings, Printer, Save, Edit3, Clock, CheckCircle, Download } from 'lucide-react';
import { SetupSheet, SetupSheetParameter } from '@/types/manufacturing-templates';
import { createSetupSheet, updateSetupSheet } from '@/lib/firebase-manufacturing';
import { toast } from 'sonner';

interface SetupSheetFormProps {
  subtaskId: string;
  jobId: string;
  taskId: string;
  processName: string;
  machineNumber: string;
  initialData?: SetupSheet;
  onSave?: (setupSheet: SetupSheet) => void;
  onPrint?: (setupSheet: SetupSheet) => void;
}

export default function SetupSheetForm({
  subtaskId,
  jobId,
  taskId,
  processName,
  machineNumber,
  initialData,
  onSave,
  onPrint
}: SetupSheetFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!initialData);
  
  // Form state
  const [formData, setFormData] = useState<Partial<SetupSheet>>({
    subtaskId,
    jobId,
    taskId,
    processName,
    machineNumber,
    operatorName: '',
    setupDate: new Date().toISOString().split('T')[0],
    workholding: '',
    programs: [],
    toolList: [],
    safetyRequirements: [],
    qualityRequirements: [],
    specialInstructions: '',
    status: 'draft',
    ...initialData
  });

  const [parameters, setParameters] = useState<SetupSheetParameter[]>(
    initialData?.parameters || []
  );

  const [programs, setPrograms] = useState<string[]>(
    initialData?.programs || []
  );

  const [safetyRequirements, setSafetyRequirements] = useState<string[]>(
    initialData?.safetyRequirements || []
  );

  const [qualityRequirements, setQualityRequirements] = useState<string[]>(
    initialData?.qualityRequirements || []
  );

  const addParameter = () => {
    const newParameter: SetupSheetParameter = {
      id: `param-${Date.now()}`,
      parameterName: '',
      specification: '',
      actualValue: '',
      tolerance: '',
      unit: '',
      checkMethod: '',
      isCompliant: false,
      notes: ''
    };
    setParameters([...parameters, newParameter]);
  };

  const updateParameter = (index: number, field: keyof SetupSheetParameter, value: any) => {
    const updatedParameters = [...parameters];
    updatedParameters[index] = { ...updatedParameters[index], [field]: value };
    setParameters(updatedParameters);
  };

  const removeParameter = (index: number) => {
    const updatedParameters = parameters.filter((_, i) => i !== index);
    setParameters(updatedParameters);
  };

  const addListItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (item.trim() && !list.includes(item.trim())) {
      setList([...list, item.trim()]);
    }
  };

  const removeListItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const setupSheetData = {
        ...formData,
        parameters,
        programs,
        safetyRequirements,
        qualityRequirements
      } as SetupSheet;

      let savedId = initialData?.id;
      
      if (initialData?.id) {
        // Update existing
        await updateSetupSheet(initialData.id, setupSheetData);
        toast.success('Setup sheet updated successfully');
      } else {
        // Create new
        savedId = await createSetupSheet(setupSheetData);
        toast.success('Setup sheet created successfully');
      }

      const savedSetupSheet = { ...setupSheetData, id: savedId! };
      
      setIsEditing(false);
      onSave?.(savedSetupSheet);
    } catch (error) {
      console.error('Error saving setup sheet:', error);
      toast.error('Failed to save setup sheet');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (formData.id) {
      const setupSheet = {
        ...formData,
        parameters,
        programs,
        safetyRequirements,
        qualityRequirements
      } as SetupSheet;
      
      onPrint?.(setupSheet);
      window.print();
    }
  };

  const handleDownload = () => {
    const setupSheet = {
      ...formData,
      parameters,
      programs,
      safetyRequirements,
      qualityRequirements
    } as SetupSheet;

    // Generate downloadable content
    const content = generateSetupSheetContent(setupSheet);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `setup-sheet-${setupSheet.processName || 'document'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Setup sheet downloaded successfully');
  };

  const generateSetupSheetContent = (setupSheet: SetupSheet): string => {
    return `
SETUP SHEET - ${setupSheet.processName || 'N/A'}
${'='.repeat(15 + (setupSheet.processName?.length || 3))}

SETUP INFORMATION
----------------
Process Name: ${setupSheet.processName || 'N/A'}
Machine Number: ${setupSheet.machineNumber || 'N/A'}
Operator Name: ${setupSheet.operatorName || 'N/A'}
Setup Date: ${setupSheet.setupDate || 'N/A'}
Workholding: ${setupSheet.workholding || 'N/A'}
Status: ${setupSheet.status || 'Draft'}

JOB DETAILS
-----------
Job ID: ${setupSheet.jobId || 'N/A'}
Task ID: ${setupSheet.taskId || 'N/A'}
Subtask ID: ${setupSheet.subtaskId || 'N/A'}

PROGRAMS
--------
${programs.length > 0 ? programs.map((program, index) => `${index + 1}. ${program}`).join('\n') : 'No programs specified.'}

SETUP PARAMETERS
---------------
${parameters.map(param => `
Parameter: ${param.parameterName || 'N/A'}
Specification: ${param.specification || 'N/A'}
Actual Value: ${param.actualValue || 'N/A'}
Tolerance: ${param.tolerance || 'N/A'}
Unit: ${param.unit || 'N/A'}
Check Method: ${param.checkMethod || 'N/A'}
Compliance: ${param.isCompliant ? 'YES' : 'NO'}
Notes: ${param.notes || 'N/A'}
`).join('\n')}

SAFETY REQUIREMENTS
------------------
${safetyRequirements.length > 0 ? safetyRequirements.map((req, index) => `${index + 1}. ${req}`).join('\n') : 'No safety requirements specified.'}

QUALITY REQUIREMENTS
-------------------
${qualityRequirements.length > 0 ? qualityRequirements.map((req, index) => `${index + 1}. ${req}`).join('\n') : 'No quality requirements specified.'}

SPECIAL INSTRUCTIONS
-------------------
${setupSheet.specialInstructions || 'No special instructions provided.'}

APPROVAL INFORMATION
-------------------
${setupSheet.status === 'approved' ? `
Approved By: ${setupSheet.approvedBy || 'N/A'}
Approved At: ${setupSheet.approvedAt || 'N/A'}
` : 'Document not yet approved.'}

Generated: ${new Date().toLocaleString()}
Document ID: ${setupSheet.id || 'Draft'}
`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'in_use': return 'secondary';
      case 'completed': return 'default';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Setup Sheet - {processName}
          </CardTitle>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </>
            ) : (
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="processName">Process Name</Label>
              <Input
                id="processName"
                value={formData.processName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, processName: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="machineNumber">Machine Number</Label>
              <Input
                id="machineNumber"
                value={formData.machineNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, machineNumber: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="operatorName">Operator Name</Label>
              <Input
                id="operatorName"
                value={formData.operatorName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, operatorName: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="setupDate">Setup Date</Label>
              <Input
                id="setupDate"
                type="date"
                value={formData.setupDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, setupDate: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="setupStartTime">Setup Start Time</Label>
              <Input
                id="setupStartTime"
                type="time"
                value={formData.setupStartTime || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, setupStartTime: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="setupEndTime">Setup End Time</Label>
              <Input
                id="setupEndTime"
                type="time"
                value={formData.setupEndTime || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, setupEndTime: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label>Status</Label>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(formData.status || 'draft')}>
                  {formData.status}
                </Badge>
                {isEditing && (
                  <Select 
                    value={formData.status || 'draft'} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="in_use">In Use</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="workholding">Workholding</Label>
            <Input
              id="workholding"
              value={formData.workholding || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, workholding: e.target.value }))}
              disabled={!isEditing}
              placeholder="e.g., 6-inch vise, 4-jaw chuck, fixture #123"
            />
          </div>
        </CardContent>
      </Card>

      {/* Programs */}
      <Card>
        <CardHeader>
          <CardTitle>CNC Programs</CardTitle>
        </CardHeader>
        <CardContent>
          {programs.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No programs added yet.
            </div>
          ) : (
            <div className="space-y-2">
              {programs.map((program, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={program} disabled className="flex-1" />
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeListItem(programs, setPrograms, index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {isEditing && (
            <div className="flex gap-2 mt-4">
              <Input
                placeholder="Program name/number"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addListItem(programs, setPrograms, e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  const input = e.currentTarget.previousSibling as HTMLInputElement;
                  addListItem(programs, setPrograms, input.value);
                  input.value = '';
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Parameters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Setup Parameters</CardTitle>
          {isEditing && (
            <Button onClick={addParameter} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Parameter
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {parameters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No parameters added yet. Click "Add Parameter" to start.
            </div>
          ) : (
            <div className="space-y-4">
              {parameters.map((parameter, index) => (
                <Card key={parameter.id} className="relative">
                  <CardContent className="pt-4">
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeParameter(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-2">
                        <Label>Parameter Name</Label>
                        <Input
                          value={parameter.parameterName}
                          onChange={(e) => updateParameter(index, 'parameterName', e.target.value)}
                          disabled={!isEditing}
                          placeholder="e.g., Spindle Speed"
                        />
                      </div>
                      <div>
                        <Label>Specification</Label>
                        <Input
                          value={parameter.specification}
                          onChange={(e) => updateParameter(index, 'specification', e.target.value)}
                          disabled={!isEditing}
                          placeholder="e.g., 1200"
                        />
                      </div>
                      <div>
                        <Label>Actual Value</Label>
                        <Input
                          value={parameter.actualValue || ''}
                          onChange={(e) => updateParameter(index, 'actualValue', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>Tolerance</Label>
                        <Input
                          value={parameter.tolerance || ''}
                          onChange={(e) => updateParameter(index, 'tolerance', e.target.value)}
                          disabled={!isEditing}
                          placeholder="±10"
                        />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Input
                          value={parameter.unit || ''}
                          onChange={(e) => updateParameter(index, 'unit', e.target.value)}
                          disabled={!isEditing}
                          placeholder="RPM, mm, etc."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <Label>Check Method</Label>
                        <Input
                          value={parameter.checkMethod}
                          onChange={(e) => updateParameter(index, 'checkMethod', e.target.value)}
                          disabled={!isEditing}
                          placeholder="Visual, Gauge, etc."
                        />
                      </div>
                      <div>
                        <Label>Checked By</Label>
                        <Input
                          value={parameter.checkedBy || ''}
                          onChange={(e) => updateParameter(index, 'checkedBy', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>Checked At</Label>
                        <Input
                          type="datetime-local"
                          value={parameter.checkedAt || ''}
                          onChange={(e) => updateParameter(index, 'checkedAt', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="flex items-center space-x-2 mt-6">
                        <Checkbox
                          id={`compliant-${parameter.id}`}
                          checked={parameter.isCompliant || false}
                          onCheckedChange={(checked) => updateParameter(index, 'isCompliant', checked)}
                          disabled={!isEditing}
                        />
                        <Label htmlFor={`compliant-${parameter.id}`}>Compliant</Label>
                        {parameter.isCompliant && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>Notes</Label>
                      <Textarea
                        value={parameter.notes || ''}
                        onChange={(e) => updateParameter(index, 'notes', e.target.value)}
                        disabled={!isEditing}
                        rows={2}
                        placeholder="Any additional notes..."
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safety Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Safety Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          {safetyRequirements.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No safety requirements added yet.
            </div>
          ) : (
            <div className="space-y-2">
              {safetyRequirements.map((requirement, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={requirement} disabled className="flex-1" />
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeListItem(safetyRequirements, setSafetyRequirements, index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {isEditing && (
            <div className="flex gap-2 mt-4">
              <Input
                placeholder="Safety requirement"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addListItem(safetyRequirements, setSafetyRequirements, e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  const input = e.currentTarget.previousSibling as HTMLInputElement;
                  addListItem(safetyRequirements, setSafetyRequirements, input.value);
                  input.value = '';
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          {qualityRequirements.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No quality requirements added yet.
            </div>
          ) : (
            <div className="space-y-2">
              {qualityRequirements.map((requirement, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={requirement} disabled className="flex-1" />
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeListItem(qualityRequirements, setQualityRequirements, index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {isEditing && (
            <div className="flex gap-2 mt-4">
              <Input
                placeholder="Quality requirement"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addListItem(qualityRequirements, setQualityRequirements, e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  const input = e.currentTarget.previousSibling as HTMLInputElement;
                  addListItem(qualityRequirements, setQualityRequirements, input.value);
                  input.value = '';
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Special Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Special Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.specialInstructions || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
            disabled={!isEditing}
            rows={4}
            placeholder="Any special instructions for this setup..."
          />
        </CardContent>
      </Card>

      {/* Approval Section */}
      {formData.status === 'approved' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Approval Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="approvedBy">Approved By</Label>
              <Input
                id="approvedBy"
                value={formData.approvedBy || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, approvedBy: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="approvedAt">Approved At</Label>
              <Input
                id="approvedAt"
                type="datetime-local"
                value={formData.approvedAt || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, approvedAt: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 