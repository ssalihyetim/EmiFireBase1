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
import { Plus, Trash2, FileText, Printer, Save, Edit3, Download, Upload, Paperclip } from 'lucide-react';
import { RoutingSheet, RoutingSheetEntry, RawMaterialLot } from '@/types/manufacturing-templates';
import { createRoutingSheet, updateRoutingSheet } from '@/lib/firebase-manufacturing';
import { getJobLotNumber } from '@/lib/centralized-lot-management';
import { toast } from 'sonner';

interface OperationData {
  processName: string;
  quantity?: number;
  setupTimeMinutes?: number;
  cycleTimeMinutes?: number;
  machineType?: string;
}

interface RoutingSheetFormProps {
  jobId: string;
  taskId: string;
  partName: string;
  customerName: string;
  orderNumber: string;
  assignedProcesses?: string[];
  operationData?: OperationData[];
  quantity?: number;
  initialData?: RoutingSheet;
  orderId?: string; // Add orderId for centralized lot management
  onSave?: (routingSheet: RoutingSheet) => void;
  onPrint?: (routingSheet: RoutingSheet) => void;
}

export default function RoutingSheetForm({
  jobId,
  taskId,
  partName,
  customerName,
  orderNumber,
  assignedProcesses = [],
  operationData = [],
  quantity = 1,
  initialData,
  orderId,
  onSave,
  onPrint
}: RoutingSheetFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!initialData);
  
  // Form state
  const [formData, setFormData] = useState<Partial<RoutingSheet>>({
    jobId,
    taskId,
    partName,
    customerName,
    orderNumber,
    partNumber: '',
    revision: 'A',
    quantity: quantity,
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'normal',
    operations: [],
    status: 'draft',
    createdBy: 'Current User', // This should come from auth
    ...initialData
  });

  const [rawMaterialLot, setRawMaterialLot] = useState<RawMaterialLot>({
    lotNumber: '',
    materialType: 'Steel',
    dimension: '',
    supplier: '',
    receivedDate: new Date().toISOString().split('T')[0],
    certificationNumber: '',
    notes: '',
    ...initialData?.rawMaterialLot
  });

  const [operations, setOperations] = useState<RoutingSheetEntry[]>(
    initialData?.operations || []
  );

  const [materialCertificates, setMaterialCertificates] = useState<File[]>([]);

  // Generate lot number on component mount if not editing
  useEffect(() => {
    if (!initialData && !rawMaterialLot.lotNumber) {
      generateNewLotNumber();
    }
  }, []);

  const generateNewLotNumber = async () => {
    try {
      const extractedOrderId = orderId || jobId.split('-')[0] || 'unknown-order';
      const lotNumber = await getJobLotNumber(
        jobId,
        partName,
        partName,
        extractedOrderId,
        'routing_sheet'
      );
      setRawMaterialLot(prev => ({ ...prev, lotNumber }));
    } catch (error) {
      console.error('Error generating lot number:', error);
      toast.error('Failed to generate lot number');
    }
  };

  const addOperation = () => {
    const newOperation: RoutingSheetEntry = {
      id: `op-${Date.now()}`,
      operationNumber: operations.length + 1,
      processName: '',
      machineNumber: '',
      setupTime: 0,
      cycleTime: 0,
      qualityCheck: false,
      notes: ''
    };
    setOperations([...operations, newOperation]);
  };

  const updateOperation = (index: number, field: keyof RoutingSheetEntry, value: any) => {
    const updatedOperations = [...operations];
    updatedOperations[index] = { ...updatedOperations[index], [field]: value };
    setOperations(updatedOperations);
  };

  const removeOperation = (index: number) => {
    const updatedOperations = operations.filter((_, i) => i !== index);
    // Renumber operations
    updatedOperations.forEach((op, i) => {
      op.operationNumber = i + 1;
    });
    setOperations(updatedOperations);
  };

  const autoPopulateFromProcesses = () => {
    if (operationData.length === 0 && assignedProcesses.length === 0) {
      toast.error('No assigned processes found for this job');
      return;
    }

    let newOperations: RoutingSheetEntry[] = [];

    if (operationData.length > 0) {
      // Use detailed operation data if available
      newOperations = operationData.map((opData, index) => ({
        id: `op-${Date.now()}-${index}`,
        operationNumber: operations.length + index + 1,
        processName: opData.processName,
        machineNumber: opData.machineType || '',
        setupTime: opData.setupTimeMinutes || 0,
        cycleTime: opData.cycleTimeMinutes || 0,
        qualityCheck: false,
        notes: `Auto-populated from operation data`
      }));
    } else {
      // Fallback to simple process names
      newOperations = assignedProcesses.map((processName, index) => ({
        id: `op-${Date.now()}-${index}`,
        operationNumber: operations.length + index + 1,
        processName,
        machineNumber: '',
        setupTime: 0,
        cycleTime: 0,
        qualityCheck: false,
        notes: `Auto-populated from assigned processes`
      }));
    }

    setOperations([...operations, ...newOperations]);
    toast.success(`Added ${newOperations.length} operations from job data`);
  };

  const calculateTotals = () => {
    const totalSetupTime = operations.reduce((sum, op) => sum + (op.setupTime || 0), 0);
    const totalCycleTime = operations.reduce((sum, op) => sum + (op.cycleTime || 0), 0);
    return { totalSetupTime, totalCycleTime };
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { totalSetupTime, totalCycleTime } = calculateTotals();
      
      const routingSheetData = {
        ...formData,
        rawMaterialLot,
        operations,
        totalSetupTime,
        totalCycleTime
      } as RoutingSheet;

      let savedId = initialData?.id;
      
      if (initialData?.id) {
        // Update existing
        await updateRoutingSheet(initialData.id, routingSheetData);
        toast.success('Routing sheet updated successfully');
      } else {
        // Create new
        savedId = await createRoutingSheet(routingSheetData);
        toast.success('Routing sheet created successfully');
      }

      const savedRoutingSheet = { ...routingSheetData, id: savedId! };
      
      setIsEditing(false);
      onSave?.(savedRoutingSheet);
    } catch (error) {
      console.error('Error saving routing sheet:', error);
      toast.error('Failed to save routing sheet');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (formData.id) {
      const { totalSetupTime, totalCycleTime } = calculateTotals();
      const routingSheet = {
        ...formData,
        rawMaterialLot,
        operations,
        totalSetupTime,
        totalCycleTime
      } as RoutingSheet;
      
      onPrint?.(routingSheet);
      // Open print dialog
      window.print();
    }
  };

  const handleDownload = () => {
    const { totalSetupTime, totalCycleTime } = calculateTotals();
    const routingSheet = {
      ...formData,
      rawMaterialLot,
      operations,
      totalSetupTime,
      totalCycleTime
    } as RoutingSheet;

    // Generate downloadable content
    const content = generateRoutingSheetContent(routingSheet);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `routing-sheet-${routingSheet.partName || 'document'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Routing sheet downloaded successfully');
  };

  const generateRoutingSheetContent = (sheet: RoutingSheet): string => {
    return `
LOT-BASED SHOP TRAVELER (ROUTING SHEET)
=======================================

JOB INFORMATION
--------------
Part Name: ${sheet.partName || 'N/A'}
Part Number: ${sheet.partNumber || 'N/A'}
Revision: ${sheet.revision || 'A'}
Quantity: ${sheet.quantity || 1}
Customer: ${sheet.customerName || 'N/A'}
Order Number: ${sheet.orderNumber || 'N/A'}
Due Date: ${sheet.dueDate || 'N/A'}
Priority: ${sheet.priority || 'Normal'}
Status: ${sheet.status || 'Draft'}

RAW MATERIAL LOT INFORMATION
---------------------------
Lot Number: ${rawMaterialLot.lotNumber || 'N/A'}
Material Type: ${rawMaterialLot.materialType || 'N/A'}
Dimension: ${rawMaterialLot.dimension || 'N/A'}
Supplier: ${rawMaterialLot.supplier || 'N/A'}
Received Date: ${rawMaterialLot.receivedDate || 'N/A'}
Certification Number: ${rawMaterialLot.certificationNumber || 'N/A'}
Notes: ${rawMaterialLot.notes || 'N/A'}

MANUFACTURING OPERATIONS
------------------------
${operations.map(op => `
Operation ${op.operationNumber}: ${op.processName || 'N/A'}
Machine: ${op.machineNumber || 'N/A'}
Setup Time: ${op.setupTime || 0} min
Cycle Time: ${op.cycleTime || 0} min
Operator: ${op.operator || '_____________'}
Date Completed: ${op.dateCompleted || '_____________'}
Time Started: ${op.timeStarted || '_____________'}
Time Completed: ${op.timeCompleted || '_____________'}
Actual Setup: ${op.actualSetupTime || '_____________'} min
Actual Cycle: ${op.actualCycleTime || '_____________'} min
Quality Check: ${op.qualityCheck ? 'PASS' : 'PENDING'}
Signature: ${op.signature || '_____________'}
Notes: ${op.notes || 'N/A'}
`).join('\n')}

SUMMARY
-------
Total Setup Time: ${sheet.totalSetupTime || 0} minutes
Total Cycle Time: ${sheet.totalCycleTime || 0} minutes

Generated: ${new Date().toLocaleString()}
Document ID: ${sheet.id || 'Draft'}
`;
  };

  const { totalSetupTime, totalCycleTime } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lot-Based Shop Traveler (Routing Sheet)
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
          {/* Job Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="partName">Part Name</Label>
              <Input
                id="partName"
                value={formData.partName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, partName: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="partNumber">Part Number</Label>
              <Input
                id="partNumber"
                value={formData.partNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, partNumber: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="revision">Revision</Label>
              <Input
                id="revision"
                value={formData.revision || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, revision: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity || 1}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="customerName">Customer</Label>
              <Input
                id="customerName"
                value={formData.customerName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="orderNumber">Order Number</Label>
              <Input
                id="orderNumber"
                value={formData.orderNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority || 'normal'} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
                disabled={!isEditing}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Badge variant={formData.status === 'completed' ? 'default' : 'secondary'}>
                {formData.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Raw Material Lot Information */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Material Lot Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="lotNumber">Lot Number</Label>
              <div className="flex gap-2">
                <Input
                  id="lotNumber"
                  value={rawMaterialLot.lotNumber}
                  onChange={(e) => setRawMaterialLot(prev => ({ ...prev, lotNumber: e.target.value }))}
                  disabled={!isEditing}
                  className="font-mono"
                />
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateNewLotNumber}
                  >
                    Generate
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="materialType">Material Type</Label>
              <Input
                id="materialType"
                value={rawMaterialLot.materialType}
                onChange={(e) => setRawMaterialLot(prev => ({ ...prev, materialType: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="dimension">Dimension</Label>
              <Input
                id="dimension"
                value={rawMaterialLot.dimension}
                onChange={(e) => setRawMaterialLot(prev => ({ ...prev, dimension: e.target.value }))}
                disabled={!isEditing}
                placeholder="e.g., 2.5 x 4.0 x 12.0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={rawMaterialLot.supplier}
                onChange={(e) => setRawMaterialLot(prev => ({ ...prev, supplier: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="receivedDate">Received Date</Label>
              <Input
                id="receivedDate"
                type="date"
                value={rawMaterialLot.receivedDate}
                onChange={(e) => setRawMaterialLot(prev => ({ ...prev, receivedDate: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="certificationNumber">Certification Number</Label>
              <Input
                id="certificationNumber"
                value={rawMaterialLot.certificationNumber || ''}
                onChange={(e) => setRawMaterialLot(prev => ({ ...prev, certificationNumber: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="materialNotes">Notes</Label>
            <Textarea
              id="materialNotes"
              value={rawMaterialLot.notes || ''}
              onChange={(e) => setRawMaterialLot(prev => ({ ...prev, notes: e.target.value }))}
              disabled={!isEditing}
              rows={2}
            />
          </div>

          {/* Material Certificate Upload */}
          <div>
            <Label>Material Certificates</Label>
            <div className="flex items-center gap-4 mt-2">
              {isEditing && (
                <div>
                  <input
                    type="file"
                    id="materialCert"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files) {
                        setMaterialCertificates(prev => [...prev, ...Array.from(e.target.files!)]);
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('materialCert')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Certificate
                  </Button>
                </div>
              )}
              
              {materialCertificates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {materialCertificates.map((file, index) => (
                    <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-sm">
                      <Paperclip className="h-3 w-3" />
                      <span>{file.name}</span>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={() => setMaterialCertificates(prev => prev.filter((_, i) => i !== index))}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manufacturing Operations</CardTitle>
          {isEditing && (
            <div className="flex gap-2">
              {assignedProcesses.length > 0 && (
                <Button onClick={autoPopulateFromProcesses} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Auto-Populate ({assignedProcesses.length})
                </Button>
              )}
              <Button onClick={addOperation} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Operation
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No operations added yet. Click "Add Operation" to start.
            </div>
          ) : (
            <div className="space-y-4">
              {operations.map((operation, index) => (
                <Card key={operation.id} className="relative">
                  <CardContent className="pt-4">
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeOperation(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div>
                        <Label>Op #</Label>
                        <Input
                          value={operation.operationNumber}
                          disabled
                          className="font-mono text-center"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Process Name</Label>
                        <Input
                          value={operation.processName}
                          onChange={(e) => updateOperation(index, 'processName', e.target.value)}
                          disabled={!isEditing}
                          placeholder="e.g., Face Mill"
                        />
                      </div>
                      <div>
                        <Label>Machine #</Label>
                        <Input
                          value={operation.machineNumber || ''}
                          onChange={(e) => updateOperation(index, 'machineNumber', e.target.value)}
                          disabled={!isEditing}
                          placeholder="e.g., M001"
                        />
                      </div>
                      <div>
                        <Label>Setup (min)</Label>
                        <Input
                          type="number"
                          value={operation.setupTime || 0}
                          onChange={(e) => updateOperation(index, 'setupTime', parseFloat(e.target.value))}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>Cycle (min)</Label>
                        <Input
                          type="number"
                          value={operation.cycleTime || 0}
                          onChange={(e) => updateOperation(index, 'cycleTime', parseFloat(e.target.value))}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <Label>Operator</Label>
                        <Input
                          value={operation.operator || ''}
                          onChange={(e) => updateOperation(index, 'operator', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>Date Completed</Label>
                        <Input
                          type="date"
                          value={operation.dateCompleted || ''}
                          onChange={(e) => updateOperation(index, 'dateCompleted', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>Time Started</Label>
                        <Input
                          type="time"
                          value={operation.timeStarted || ''}
                          onChange={(e) => updateOperation(index, 'timeStarted', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>Time Completed</Label>
                        <Input
                          type="time"
                          value={operation.timeCompleted || ''}
                          onChange={(e) => updateOperation(index, 'timeCompleted', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <Label>Actual Setup (min)</Label>
                        <Input
                          type="number"
                          value={operation.actualSetupTime || ''}
                          onChange={(e) => updateOperation(index, 'actualSetupTime', parseFloat(e.target.value))}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>Actual Cycle (min)</Label>
                        <Input
                          type="number"
                          value={operation.actualCycleTime || ''}
                          onChange={(e) => updateOperation(index, 'actualCycleTime', parseFloat(e.target.value))}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="flex items-center space-x-2 mt-6">
                        <Checkbox
                          id={`quality-${operation.id}`}
                          checked={operation.qualityCheck}
                          onCheckedChange={(checked) => updateOperation(index, 'qualityCheck', checked)}
                          disabled={!isEditing}
                        />
                        <Label htmlFor={`quality-${operation.id}`}>Quality Check Pass</Label>
                      </div>
                      <div>
                        <Label>Signature</Label>
                        <Input
                          value={operation.signature || ''}
                          onChange={(e) => updateOperation(index, 'signature', e.target.value)}
                          disabled={!isEditing}
                          placeholder="Operator signature"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>Notes</Label>
                      <Textarea
                        value={operation.notes || ''}
                        onChange={(e) => updateOperation(index, 'notes', e.target.value)}
                        disabled={!isEditing}
                        rows={2}
                        placeholder="Any additional notes or observations..."
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Totals */}
          {operations.length > 0 && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <Label className="text-sm font-semibold">Total Setup Time</Label>
                  <div className="text-2xl font-bold">{totalSetupTime} min</div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Total Cycle Time</Label>
                  <div className="text-2xl font-bold">{totalCycleTime} min</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 