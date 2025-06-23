'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Cog, 
  Wrench, 
  CheckCircle, 
  Shield, 
  Clock,
  User,
  Calendar,
  Settings,
  Target,
  AlertTriangle,
  Zap,
  Package,
  Ruler,
  ThermometerSun,
  Eye,
  Download,
  Edit3
} from 'lucide-react';
import type { JobArchive } from '@/types/archival';

interface ProductionDocumentViewerProps {
  archive: JobArchive;
  className?: string;
}

export default function ProductionDocumentViewer({ 
  archive, 
  className = "" 
}: ProductionDocumentViewerProps) {
  const [selectedForm, setSelectedForm] = useState<string>('overview');
  
  // Dialog states for viewing archived forms
  const [routingDialogOpen, setRoutingDialogOpen] = useState(false);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [toolListDialogOpen, setToolListDialogOpen] = useState(false);
  const [faiDialogOpen, setFaiDialogOpen] = useState(false);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  
  // Selected form states for viewing
  const [selectedRoutingSheet, setSelectedRoutingSheet] = useState<any>(null);
  const [selectedSetupSheet, setSelectedSetupSheet] = useState<any>(null);
  const [selectedToolList, setSelectedToolList] = useState<any>(null);
  const [selectedFaiReport, setSelectedFaiReport] = useState<any>(null);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);

  // Get completed forms from archive
  const getCompletedForms = () => {
    const forms = archive.completedForms || {};
    return {
      routingSheets: forms.routingSheet ? [forms.routingSheet] : [],
      setupSheets: forms.setupSheets || [],
      toolLists: forms.toolLists || [],
      faiReports: forms.faiReports || [],
      inspectionRecords: forms.inspectionRecords || []
    };
  };

  const forms = getCompletedForms();

  // Create archive form buttons that mimic the task view pattern
  const renderArchiveFormButtons = (): React.ReactNode[] => {
    const buttons: React.ReactNode[] = [];

    // Routing Sheets - Show exactly like task view
    if (forms.routingSheets.length > 0) {
      forms.routingSheets.forEach((routingSheet: any, index: number) => {
        buttons.push(
          <Dialog key={`routing-view-${index}`} open={routingDialogOpen && selectedRoutingSheet?.id === routingSheet.id} onOpenChange={(open) => {
            setRoutingDialogOpen(open);
            if (!open) setSelectedRoutingSheet(null);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => {
                setSelectedRoutingSheet(routingSheet);
                setRoutingDialogOpen(true);
              }}>
                <Eye className="h-3 w-3 mr-1" />
                View Routing Sheet #{index + 1}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Archived Lot-Based Shop Traveler #{index + 1}
                  <Badge variant="secondary">Read-Only</Badge>
                </DialogTitle>
                <DialogDescription>
                  Routing sheet for {archive.jobSnapshot.item.partName} - Completed {new Date(routingSheet.completedAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              {renderRoutingSheetView(routingSheet)}
            </DialogContent>
          </Dialog>
        );
      });
    }

    // Setup Sheets - Show exactly like task view
    if (forms.setupSheets.length > 0) {
      forms.setupSheets.forEach((setupSheet: any, index: number) => {
        buttons.push(
          <Dialog key={`setup-view-${index}`} open={setupDialogOpen && selectedSetupSheet?.id === setupSheet.id} onOpenChange={(open) => {
            setSetupDialogOpen(open);
            if (!open) setSelectedSetupSheet(null);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => {
                setSelectedSetupSheet(setupSheet);
                setSetupDialogOpen(true);
              }}>
                <Eye className="h-3 w-3 mr-1" />
                View Setup Sheet #{index + 1}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Archived Setup Sheet #{index + 1}
                  <Badge variant="secondary">Read-Only</Badge>
                </DialogTitle>
                <DialogDescription>
                  Setup sheet for {setupSheet.processName} - Completed {new Date(setupSheet.completedAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              {renderSetupSheetView(setupSheet)}
            </DialogContent>
          </Dialog>
        );
      });
    }

    // Tool Lists - Show exactly like task view
    if (forms.toolLists.length > 0) {
      forms.toolLists.forEach((toolList: any, index: number) => {
        buttons.push(
          <Dialog key={`toollist-view-${index}`} open={toolListDialogOpen && selectedToolList?.id === toolList.id} onOpenChange={(open) => {
            setToolListDialogOpen(open);
            if (!open) setSelectedToolList(null);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => {
                setSelectedToolList(toolList);
                setToolListDialogOpen(true);
              }}>
                <Eye className="h-3 w-3 mr-1" />
                View Tool List #{index + 1}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Archived Tool List #{index + 1}
                  <Badge variant="secondary">Read-Only</Badge>
                </DialogTitle>
                <DialogDescription>
                  Tool list for {toolList.processName} - Completed {new Date(toolList.completedAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              {renderToolListView(toolList)}
            </DialogContent>
          </Dialog>
        );
      });
    }

    // FAI Reports - Show exactly like task view
    if (forms.faiReports.length > 0) {
      forms.faiReports.forEach((faiReport: any, index: number) => {
        buttons.push(
          <Dialog key={`fai-view-${index}`} open={faiDialogOpen && selectedFaiReport?.id === faiReport.id} onOpenChange={(open) => {
            setFaiDialogOpen(open);
            if (!open) setSelectedFaiReport(null);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => {
                setSelectedFaiReport(faiReport);
                setFaiDialogOpen(true);
              }}>
                <Eye className="h-3 w-3 mr-1" />
                View FAI Report #{index + 1}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Archived FAI Report #{index + 1}
                  <Badge variant="secondary">Read-Only</Badge>
                </DialogTitle>
                <DialogDescription>
                  First Article Inspection Report - Completed {new Date(faiReport.completedAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              {renderFAIReportView(faiReport)}
            </DialogContent>
          </Dialog>
        );
      });
    }

    // Inspection Records
    if (forms.inspectionRecords.length > 0) {
      forms.inspectionRecords.forEach((inspection: any, index: number) => {
        buttons.push(
          <Dialog key={`inspection-view-${index}`} open={inspectionDialogOpen && selectedInspection?.id === inspection.id} onOpenChange={(open) => {
            setInspectionDialogOpen(open);
            if (!open) setSelectedInspection(null);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => {
                setSelectedInspection(inspection);
                setInspectionDialogOpen(true);
              }}>
                <Eye className="h-3 w-3 mr-1" />
                View Inspection #{index + 1}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Archived Inspection Record #{index + 1}
                  <Badge variant="secondary">Read-Only</Badge>
                </DialogTitle>
                <DialogDescription>
                  Quality inspection record - Completed {new Date(inspection.completedAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              {renderInspectionView(inspection)}
            </DialogContent>
          </Dialog>
        );
      });
    }

    return buttons;
  };

  // Render routing sheet view (enhanced from current version)
  const renderRoutingSheetView = (routingSheet: any) => {
    return (
      <div className="space-y-6">
        {/* Header - Enhanced with archive context */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-800">Lot-Based Shop Traveler</h3>
            <Badge variant="outline">Archived</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-700">Completed By:</span>
              <p className="text-blue-900">{routingSheet.completedBy}</p>
            </div>
            <div>
              <span className="font-medium text-blue-700">Date:</span>
              <p className="text-blue-900">{new Date(routingSheet.completedAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium text-blue-700">Job Priority:</span>
              <p className="text-blue-900">{routingSheet.jobPriority || 'Normal'}</p>
            </div>
            <div>
              <span className="font-medium text-blue-700">Archive Status:</span>
              <p className="text-blue-900">Manufacturing Complete</p>
            </div>
          </div>
        </div>

        {/* Job Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Job Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Part Name:</span>
                <p>{archive.jobSnapshot.item.partName}</p>
              </div>
              <div>
                <span className="font-medium">Client:</span>
                <p>{archive.jobSnapshot.clientName}</p>
              </div>
              <div>
                <span className="font-medium">Order Number:</span>
                <p>{archive.jobSnapshot.orderNumber}</p>
              </div>
              <div>
                <span className="font-medium">Quantity:</span>
                <p>{archive.jobSnapshot.item.quantity || 1}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Raw Material Information */}
        {routingSheet.formData?.rawMaterialLot && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Raw Material Traceability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Lot Number:</span>
                  <p className="font-mono">{routingSheet.formData.rawMaterialLot.lotNumber}</p>
                </div>
                <div>
                  <span className="font-medium">Material Type:</span>
                  <p>{routingSheet.formData.rawMaterialLot.materialType}</p>
                </div>
                <div>
                  <span className="font-medium">Supplier:</span>
                  <p>{routingSheet.formData.rawMaterialLot.supplier || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium">Received Date:</span>
                  <p>{routingSheet.formData.rawMaterialLot.receivedDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Operations Sequence */}
        {routingSheet.formData?.routingSequence && routingSheet.formData.routingSequence.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Manufacturing Operations Sequence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routingSheet.formData.routingSequence.map((operation: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <h4 className="font-semibold">{operation.operationName || operation.processName}</h4>
                      {operation.machineType && (
                        <Badge variant="outline">{operation.machineType}</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Setup Time:</span>
                        <p className="text-gray-700">{operation.estimatedSetupTime || 'N/A'} min</p>
                      </div>
                      <div>
                        <span className="font-medium">Cycle Time:</span>
                        <p className="text-gray-700">{operation.estimatedCycleTime || 'N/A'} min</p>
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span>
                        <p className="text-gray-700">{operation.estimatedDuration || 'N/A'} min</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Time Summary */}
        {routingSheet.formData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Setup Time:</span>
                  <p>{routingSheet.formData.totalEstimatedSetupTime || 0} minutes</p>
                </div>
                <div>
                  <span className="font-medium">Total Cycle Time:</span>
                  <p>{routingSheet.formData.totalEstimatedCycleTime || 0} minutes</p>
                </div>
                <div>
                  <span className="font-medium">Total Duration:</span>
                  <p>{routingSheet.formData.totalEstimatedDuration || 0} minutes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signatures */}
        {routingSheet.signatures && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Approval Signatures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Operator:</span>
                  <p>{routingSheet.signatures.operator || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium">Supervisor:</span>
                  <p>{routingSheet.signatures.supervisor || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium">Inspector:</span>
                  <p>{routingSheet.signatures.inspector || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Render setup sheet view (enhanced from current version)
  const renderSetupSheetView = (setupSheet: any) => {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-800">Setup Sheet</h3>
            <Badge variant="outline">Archived</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-purple-700">Process:</span>
              <p className="text-purple-900">{setupSheet.processName}</p>
            </div>
            <div>
              <span className="font-medium text-purple-700">Machine:</span>
              <p className="text-purple-900">{setupSheet.machineNumber || 'TBD'}</p>
            </div>
            <div>
              <span className="font-medium text-purple-700">Completed By:</span>
              <p className="text-purple-900">{setupSheet.completedBy}</p>
            </div>
            <div>
              <span className="font-medium text-purple-700">Date:</span>
              <p className="text-purple-900">{new Date(setupSheet.completedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Part Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Part Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Part Name:</span>
                <p>{setupSheet.partName || archive.jobSnapshot.item.partName}</p>
              </div>
              <div>
                <span className="font-medium">Material:</span>
                <p>{setupSheet.material || archive.jobSnapshot.item.rawMaterialType}</p>
              </div>
              <div>
                <span className="font-medium">Quantity:</span>
                <p>{setupSheet.quantity || archive.jobSnapshot.item.quantity}</p>
              </div>
              <div>
                <span className="font-medium">Drawing Rev:</span>
                <p>{setupSheet.drawingRevision || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Coordinates */}
        {setupSheet.formData?.workCoordinates && setupSheet.formData.workCoordinates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Work Coordinates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {setupSheet.formData.workCoordinates.map((coord: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium">{coord.name}</span>
                    <span className="font-mono">X: {coord.x}, Y: {coord.y}, Z: {coord.z}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tool Offsets */}
        {setupSheet.formData?.toolOffsets && setupSheet.formData.toolOffsets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Tool Offsets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {setupSheet.formData.toolOffsets.map((offset: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium">T{offset.toolNumber} - {offset.description}</span>
                    <span className="font-mono">Length: {offset.lengthOffset}, Radius: {offset.radiusOffset}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Notes */}
        {setupSheet.setupNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Setup Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{setupSheet.setupNotes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Render tool list view
  const renderToolListView = (toolList: any) => {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-orange-800">Tool List</h3>
            <Badge variant="outline">Archived</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-orange-700">Process:</span>
              <p className="text-orange-900">{toolList.processName}</p>
            </div>
            <div>
              <span className="font-medium text-orange-700">Machine:</span>
              <p className="text-orange-900">{toolList.machineNumber || 'TBD'}</p>
            </div>
            <div>
              <span className="font-medium text-orange-700">Completed By:</span>
              <p className="text-orange-900">{toolList.completedBy}</p>
            </div>
            <div>
              <span className="font-medium text-orange-700">Date:</span>
              <p className="text-orange-900">{new Date(toolList.completedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Tools Table */}
        {toolList.formData?.tools && toolList.formData.tools.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Tool Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-2 text-left">Tool #</th>
                      <th className="border border-gray-300 p-2 text-left">Description</th>
                      <th className="border border-gray-300 p-2 text-left">Type</th>
                      <th className="border border-gray-300 p-2 text-left">Diameter</th>
                      <th className="border border-gray-300 p-2 text-left">Length</th>
                      <th className="border border-gray-300 p-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toolList.formData.tools.map((tool: any, index: number) => (
                      <tr key={index}>
                        <td className="border border-gray-300 p-2">{tool.toolNumber}</td>
                        <td className="border border-gray-300 p-2">{tool.description}</td>
                        <td className="border border-gray-300 p-2">{tool.toolType}</td>
                        <td className="border border-gray-300 p-2">{tool.diameter}</td>
                        <td className="border border-gray-300 p-2">{tool.length}</td>
                        <td className="border border-gray-300 p-2">{tool.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tool Notes */}
        {toolList.toolNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Tool Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{toolList.toolNotes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Render FAI report view
  const renderFAIReportView = (faiReport: any) => {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-800">First Article Inspection Report</h3>
            <Badge variant="outline">Archived</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-green-700">Inspector:</span>
              <p className="text-green-900">{faiReport.completedBy}</p>
            </div>
            <div>
              <span className="font-medium text-green-700">Date:</span>
              <p className="text-green-900">{new Date(faiReport.completedAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium text-green-700">Result:</span>
              <Badge variant={faiReport.inspectionResult === 'pass' ? 'default' : 'destructive'}>
                {faiReport.inspectionResult?.toUpperCase() || 'N/A'}
              </Badge>
            </div>
            <div>
              <span className="font-medium text-green-700">Compliance:</span>
              <p className="text-green-900">AS9100D</p>
            </div>
          </div>
        </div>

        {/* Inspection Results */}
        {faiReport.formData?.inspectionResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Inspection Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(faiReport.formData.inspectionResults).map(([key, value]: [string, any]) => (
                  <div key={key} className="p-3 border rounded">
                    <div className="font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                    <div className="text-gray-700">{String(value)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inspector Notes */}
        {faiReport.inspectorNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Inspector Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{faiReport.inspectorNotes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Render inspection view
  const renderInspectionView = (inspection: any) => {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-800">Quality Inspection Record</h3>
            <Badge variant="outline">Archived</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-700">Inspector:</span>
              <p className="text-blue-900">{inspection.completedBy}</p>
            </div>
            <div>
              <span className="font-medium text-blue-700">Date:</span>
              <p className="text-blue-900">{new Date(inspection.completedAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium text-blue-700">Type:</span>
              <p className="text-blue-900">{inspection.inspectionType || 'Quality Check'}</p>
            </div>
            <div>
              <span className="font-medium text-blue-700">Result:</span>
              <Badge variant={inspection.inspectionResult === 'pass' ? 'default' : 'destructive'}>
                {inspection.inspectionResult?.toUpperCase() || 'N/A'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Measurements */}
        {inspection.measurements && inspection.measurements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Dimensional Measurements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-2 text-left">Feature</th>
                      <th className="border border-gray-300 p-2 text-left">Nominal</th>
                      <th className="border border-gray-300 p-2 text-left">Actual</th>
                      <th className="border border-gray-300 p-2 text-left">Tolerance</th>
                      <th className="border border-gray-300 p-2 text-left">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspection.measurements.map((measurement: any, index: number) => (
                      <tr key={index}>
                        <td className="border border-gray-300 p-2">{measurement.feature}</td>
                        <td className="border border-gray-300 p-2">{measurement.nominal}</td>
                        <td className="border border-gray-300 p-2">{measurement.actual}</td>
                        <td className="border border-gray-300 p-2">{measurement.tolerance}</td>
                        <td className="border border-gray-300 p-2">
                          <Badge variant={measurement.result === 'pass' ? 'default' : 'destructive'}>
                            {measurement.result}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quality Notes */}
        {inspection.qualityNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Quality Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{inspection.qualityNotes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderArchiveFormsSection = () => {
    const formButtons = renderArchiveFormButtons();
    const totalForms = forms.routingSheets.length + forms.setupSheets.length + forms.toolLists.length + forms.faiReports.length + forms.inspectionRecords.length;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Manufacturing Forms & Documents
            <Badge variant="outline">{totalForms} Total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalForms === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No manufacturing forms found in this archive.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Form Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{forms.routingSheets.length}</div>
                  <div className="text-muted-foreground">Routing Sheets</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{forms.setupSheets.length}</div>
                  <div className="text-muted-foreground">Setup Sheets</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{forms.toolLists.length}</div>
                  <div className="text-muted-foreground">Tool Lists</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{forms.faiReports.length}</div>
                  <div className="text-muted-foreground">FAI Reports</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-600">{forms.inspectionRecords.length}</div>
                  <div className="text-muted-foreground">Inspections</div>
                </div>
              </div>

              <Separator />

              {/* Form Access Buttons - Exactly like task view */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">View Manufacturing Documents (Archived)</h4>
                <div className="flex flex-wrap gap-2">
                  {formButtons.length > 0 ? formButtons : (
                    <p className="text-sm text-muted-foreground">No forms available</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render old routing sheet method for backward compatibility
  const renderRoutingSheet = (routingSheet: any) => {
    // This is for the old format in the tabs
    return renderRoutingSheetView(routingSheet);
  };

  // Continue with existing methods for backward compatibility
  const renderSetupSheet = (setupSheet: any, index: number) => {
    return renderSetupSheetView(setupSheet);
  };

  const renderToolList = (toolList: any, index: number) => {
    return renderToolListView(toolList);
  };

  const renderFAIReport = (faiReport: any, index: number) => {
    return renderFAIReportView(faiReport);
  };

  const renderInspectionRecord = (inspection: any, index: number) => {
    return renderInspectionView(inspection);
  };

  const renderOverview = () => {
    const forms = archive.completedForms;
    const formCount = (forms.routingSheet ? 1 : 0) +
                     (forms.setupSheets?.length || 0) +
                     (forms.toolLists?.length || 0) +
                     (forms.faiReports?.length || 0) +
                     (forms.inspectionRecords?.length || 0);

    return (
      <div className="space-y-6">
        {/* Archive Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Production Archive Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{formCount}</div>
                <div className="text-sm text-blue-700">Total Forms</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{archive.performanceData.qualityScore?.toFixed(1) || 'N/A'}</div>
                <div className="text-sm text-green-700">Quality Score</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">{archive.performanceData.totalDuration?.toFixed(1) || 'N/A'}h</div>
                <div className="text-sm text-purple-700">Total Duration</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">{new Date(archive.archiveDate).toLocaleDateString()}</div>
                <div className="text-sm text-yellow-700">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Archive Forms Section - Task View Style */}
        {renderArchiveFormsSection()}

        {/* Performance Data */}
        {archive.performanceData && (
          <Card>
            <CardHeader>
              <CardTitle>Production Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {archive.performanceData.issuesEncountered && archive.performanceData.issuesEncountered.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Issues Encountered:</h4>
                    <div className="space-y-1">
                      {archive.performanceData.issuesEncountered.map((issue: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span>{typeof issue === 'string' ? issue : issue.description || issue.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {archive.performanceData.lessonsLearned && archive.performanceData.lessonsLearned.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Lessons Learned:</h4>
                    <div className="space-y-1">
                      {archive.performanceData.lessonsLearned.map((lesson: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{lesson}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Tabs value={selectedForm} onValueChange={setSelectedForm}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="routing" disabled={!archive.completedForms.routingSheet}>
            Routing
          </TabsTrigger>
          <TabsTrigger value="setup" disabled={!archive.completedForms.setupSheets?.length}>
            Setup
          </TabsTrigger>
          <TabsTrigger value="tools" disabled={!archive.completedForms.toolLists?.length}>
            Tools
          </TabsTrigger>
          <TabsTrigger value="fai" disabled={!archive.completedForms.faiReports?.length}>
            FAI
          </TabsTrigger>
          <TabsTrigger value="inspection" disabled={!archive.completedForms.inspectionRecords?.length}>
            Inspection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="routing" className="space-y-4">
          {archive.completedForms.routingSheet && renderRoutingSheet(archive.completedForms.routingSheet)}
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          {archive.completedForms.setupSheets?.map((setupSheet, index) => (
            <div key={index}>
              {renderSetupSheet(setupSheet, index)}
              {index < (archive.completedForms.setupSheets?.length || 0) - 1 && <Separator className="my-6" />}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          {archive.completedForms.toolLists?.map((toolList, index) => (
            <div key={index}>
              {renderToolList(toolList, index)}
              {index < (archive.completedForms.toolLists?.length || 0) - 1 && <Separator className="my-6" />}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="fai" className="space-y-6">
          {archive.completedForms.faiReports?.map((faiReport, index) => (
            <div key={index}>
              {renderFAIReport(faiReport, index)}
              {index < (archive.completedForms.faiReports?.length || 0) - 1 && <Separator className="my-6" />}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="inspection" className="space-y-6">
          {archive.completedForms.inspectionRecords?.map((inspection, index) => (
            <div key={index}>
              {renderInspectionRecord(inspection, index)}
              {index < (archive.completedForms.inspectionRecords?.length || 0) - 1 && <Separator className="my-6" />}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
} 