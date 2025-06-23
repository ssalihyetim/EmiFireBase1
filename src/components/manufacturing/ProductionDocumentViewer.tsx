'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Download
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

  const renderRoutingSheet = (routingSheet: any) => {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-800">Routing Sheet</h3>
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
              <span className="font-medium text-blue-700">Expected Duration:</span>
              <p className="text-blue-900">{routingSheet.expectedDuration || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Operations Sequence */}
        {routingSheet.operations && routingSheet.operations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Manufacturing Operations Sequence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routingSheet.operations.map((operation: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <h4 className="font-semibold">{operation.name || operation.operationName || `Operation ${index + 1}`}</h4>
                      {operation.machineType && (
                        <Badge variant="outline">{operation.machineType}</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Description:</span>
                        <p className="text-gray-700">{operation.description || 'No description provided'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Setup Time:</span>
                        <p className="text-gray-700">{operation.setupTime || 'N/A'} min</p>
                      </div>
                      <div>
                        <span className="font-medium">Cycle Time:</span>
                        <p className="text-gray-700">{operation.cycleTime || 'N/A'} min</p>
                      </div>
                    </div>

                    {operation.parameters && Object.keys(operation.parameters).length > 0 && (
                      <div className="mt-3 p-3 bg-white rounded border">
                        <span className="font-medium block mb-2">Operation Parameters:</span>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          {Object.entries(operation.parameters).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600">{key}:</span>
                              <span className="font-medium">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Material Information */}
        {routingSheet.materialInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Material Specifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Material Type:</span>
                  <p>{routingSheet.materialInfo.type || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium">Dimensions:</span>
                  <p>{routingSheet.materialInfo.dimensions || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium">Heat Treatment:</span>
                  <p>{routingSheet.materialInfo.heatTreatment || 'None'}</p>
                </div>
                <div>
                  <span className="font-medium">Surface Finish:</span>
                  <p>{routingSheet.materialInfo.surfaceFinish || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quality Requirements */}
        {routingSheet.qualityRequirements && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Quality Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.isArray(routingSheet.qualityRequirements) 
                  ? routingSheet.qualityRequirements.map((req: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>{req}</span>
                      </div>
                    ))
                  : (
                    <p>{routingSheet.qualityRequirements}</p>
                  )
                }
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {routingSheet.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Production Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{routingSheet.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderSetupSheet = (setupSheet: any, index: number) => {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <Cog className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-800">Setup Sheet #{index + 1}</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-green-700">Setup By:</span>
              <p className="text-green-900">{setupSheet.completedBy}</p>
            </div>
            <div>
              <span className="font-medium text-green-700">Date:</span>
              <p className="text-green-900">{new Date(setupSheet.completedAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium text-green-700">Setup Time:</span>
              <p className="text-green-900">{setupSheet.setupTime || 'N/A'} min</p>
            </div>
            <div>
              <span className="font-medium text-green-700">Machine:</span>
              <p className="text-green-900">{setupSheet.machineId || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Machine Settings */}
        {setupSheet.machineSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Machine Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {Object.entries(setupSheet.machineSettings).map(([setting, value]: [string, any]) => (
                  <div key={setting} className="p-3 bg-gray-50 rounded border">
                    <div className="font-medium text-gray-700">{setting.replace(/([A-Z])/g, ' $1').trim()}:</div>
                    <div className="text-lg font-bold text-gray-900">{value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tool Setup */}
        {setupSheet.toolPositions && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Tool Positions & Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {setupSheet.toolPositions.map((tool: any, toolIndex: number) => (
                  <div key={toolIndex} className="flex items-center justify-between p-3 bg-purple-50 rounded border border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                        {tool.position || toolIndex + 1}
                      </div>
                      <div>
                        <div className="font-medium">{tool.toolName || tool.name || `Tool ${toolIndex + 1}`}</div>
                        <div className="text-sm text-gray-600">{tool.description || tool.type}</div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {tool.offset && <div>Offset: {tool.offset}</div>}
                      {tool.speed && <div>Speed: {tool.speed} RPM</div>}
                      {tool.feed && <div>Feed: {tool.feed}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fixture Setup */}
        {setupSheet.fixtureSetup && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Fixture Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div><strong>Fixture Type:</strong> {setupSheet.fixtureSetup.type || 'N/A'}</div>
                <div><strong>Setup Instructions:</strong> {setupSheet.fixtureSetup.instructions || 'N/A'}</div>
                {setupSheet.fixtureSetup.coordinates && (
                  <div>
                    <strong>Work Coordinates:</strong>
                    <div className="ml-4 text-sm grid grid-cols-3 gap-2 mt-1">
                      <div>X: {setupSheet.fixtureSetup.coordinates.x || 0}</div>
                      <div>Y: {setupSheet.fixtureSetup.coordinates.y || 0}</div>
                      <div>Z: {setupSheet.fixtureSetup.coordinates.z || 0}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Notes */}
        {setupSheet.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Setup Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{setupSheet.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderToolList = (toolList: any, index: number) => {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-800">Tool List #{index + 1}</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-purple-700">Prepared By:</span>
              <p className="text-purple-900">{toolList.completedBy}</p>
            </div>
            <div>
              <span className="font-medium text-purple-700">Date:</span>
              <p className="text-purple-900">{new Date(toolList.completedAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium text-purple-700">Total Tools:</span>
              <p className="text-purple-900">{toolList.tools?.length || 0}</p>
            </div>
            <div>
              <span className="font-medium text-purple-700">Operation:</span>
              <p className="text-purple-900">{toolList.operationName || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Tools */}
        {toolList.tools && toolList.tools.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Required Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {toolList.tools.map((tool: any, toolIndex: number) => (
                  <div key={toolIndex} className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                          {toolIndex + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{tool.toolName || tool.name || 'Unnamed Tool'}</div>
                          <div className="text-sm text-gray-600">{tool.toolType || tool.type || 'N/A'}</div>
                        </div>
                      </div>
                      {tool.toolNumber && (
                        <Badge variant="outline" className="bg-white">
                          #{tool.toolNumber}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Diameter:</span>
                        <p>{tool.diameter || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Length:</span>
                        <p>{tool.length || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Material:</span>
                        <p>{tool.material || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Coating:</span>
                        <p>{tool.coating || 'None'}</p>
                      </div>
                    </div>

                    {tool.cuttingParameters && (
                      <div className="mt-3 p-3 bg-white rounded border">
                        <span className="font-medium block mb-2">Cutting Parameters:</span>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Speed:</span>
                            <span className="font-medium ml-2">{tool.cuttingParameters.speed || 'N/A'} RPM</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Feed:</span>
                            <span className="font-medium ml-2">{tool.cuttingParameters.feed || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Depth:</span>
                            <span className="font-medium ml-2">{tool.cuttingParameters.depthOfCut || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Coolant:</span>
                            <span className="font-medium ml-2">{tool.cuttingParameters.coolant || 'None'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {tool.notes && (
                      <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                        <span className="font-medium text-yellow-800">Notes:</span>
                        <p className="text-yellow-700 text-sm mt-1">{tool.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tool Notes */}
        {toolList.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Tool Setup Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{toolList.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderFAIReport = (faiReport: any, index: number) => {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-yellow-800">First Article Inspection Report #{index + 1}</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-yellow-700">Inspector:</span>
              <p className="text-yellow-900">{faiReport.completedBy}</p>
            </div>
            <div>
              <span className="font-medium text-yellow-700">Date:</span>
              <p className="text-yellow-900">{new Date(faiReport.completedAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium text-yellow-700">Result:</span>
              <Badge variant={faiReport.result === 'PASS' ? 'default' : 'destructive'}>
                {faiReport.result || 'N/A'}
              </Badge>
            </div>
            <div>
              <span className="font-medium text-yellow-700">Serial Number:</span>
              <p className="text-yellow-900">{faiReport.serialNumber || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Dimensional Measurements */}
        {faiReport.measurements && faiReport.measurements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Dimensional Measurements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {faiReport.measurements.map((measurement: any, measureIndex: number) => (
                  <div key={measureIndex} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{measurement.dimension || `Measurement ${measureIndex + 1}`}</div>
                      <Badge variant={measurement.result === 'PASS' ? 'default' : 'destructive'}>
                        {measurement.result || 'N/A'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Nominal:</span>
                        <p className="font-medium">{measurement.nominal || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Actual:</span>
                        <p className="font-medium">{measurement.actual || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Tolerance:</span>
                        <p className="font-medium">{measurement.tolerance || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Material Verification */}
        {faiReport.materialVerification && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Material Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div><strong>Material Grade:</strong> {faiReport.materialVerification.grade || 'N/A'}</div>
                <div><strong>Heat Lot:</strong> {faiReport.materialVerification.heatLot || 'N/A'}</div>
                <div><strong>Certificate:</strong> {faiReport.materialVerification.certificate || 'N/A'}</div>
                <div><strong>Verification Result:</strong> 
                  <Badge variant={faiReport.materialVerification.result === 'PASS' ? 'default' : 'destructive'} className="ml-2">
                    {faiReport.materialVerification.result || 'N/A'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inspector Notes */}
        {faiReport.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Inspector Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{faiReport.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderInspectionRecord = (inspection: any, index: number) => {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-800">Quality Inspection #{index + 1}</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-red-700">Inspector:</span>
              <p className="text-red-900">{inspection.completedBy}</p>
            </div>
            <div>
              <span className="font-medium text-red-700">Date:</span>
              <p className="text-red-900">{new Date(inspection.completedAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium text-red-700">Type:</span>
              <p className="text-red-900">{inspection.inspectionType || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium text-red-700">Result:</span>
              <Badge variant={inspection.result === 'PASS' ? 'default' : 'destructive'}>
                {inspection.result || 'N/A'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Quality Checks */}
        {inspection.qualityChecks && inspection.qualityChecks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Quality Checks Performed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inspection.qualityChecks.map((check: any, checkIndex: number) => (
                  <div key={checkIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <span>{check.description || check.name || `Check ${checkIndex + 1}`}</span>
                    <Badge variant={check.result === 'PASS' ? 'default' : 'destructive'}>
                      {check.result || 'N/A'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Defects Found */}
        {inspection.defectsFound && inspection.defectsFound.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Defects Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inspection.defectsFound.map((defect: any, defectIndex: number) => (
                  <div key={defectIndex} className="border rounded-lg p-3 bg-red-50 border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800">{defect.type || 'Defect'}</span>
                      <Badge variant="destructive">
                        {defect.severity || 'Unknown'}
                      </Badge>
                    </div>
                    <p className="text-red-700 text-sm">{defect.description}</p>
                    {defect.location && (
                      <p className="text-red-600 text-sm mt-1"><strong>Location:</strong> {defect.location}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inspection Notes */}
        {inspection.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Inspection Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{inspection.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
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

        {/* Available Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Available Production Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {forms.routingSheet && (
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setSelectedForm('routing')}
                >
                  <FileText className="h-6 w-6 text-blue-600" />
                  <span>Routing Sheet</span>
                  <Badge variant="secondary">1 document</Badge>
                </Button>
              )}
              
              {forms.setupSheets && forms.setupSheets.length > 0 && (
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setSelectedForm('setup')}
                >
                  <Cog className="h-6 w-6 text-green-600" />
                  <span>Setup Sheets</span>
                  <Badge variant="secondary">{forms.setupSheets.length} documents</Badge>
                </Button>
              )}
              
              {forms.toolLists && forms.toolLists.length > 0 && (
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setSelectedForm('tools')}
                >
                  <Wrench className="h-6 w-6 text-purple-600" />
                  <span>Tool Lists</span>
                  <Badge variant="secondary">{forms.toolLists.length} documents</Badge>
                </Button>
              )}
              
              {forms.faiReports && forms.faiReports.length > 0 && (
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setSelectedForm('fai')}
                >
                  <CheckCircle className="h-6 w-6 text-yellow-600" />
                  <span>FAI Reports</span>
                  <Badge variant="secondary">{forms.faiReports.length} documents</Badge>
                </Button>
              )}
              
              {forms.inspectionRecords && forms.inspectionRecords.length > 0 && (
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setSelectedForm('inspection')}
                >
                  <Shield className="h-6 w-6 text-red-600" />
                  <span>Inspections</span>
                  <Badge variant="secondary">{forms.inspectionRecords.length} documents</Badge>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

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