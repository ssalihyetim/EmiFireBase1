'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/page-header';
import CADFileViewer from '@/components/jobs/CADFileViewer';
import { 
  ArrowLeft, 
  Copy, 
  Trash2, 
  Settings, 
  Upload,
  FileText,
  Shield
} from 'lucide-react';

export default function RFQDemoPage() {
  const [specifications, setSpecifications] = useState({
    as9100d: false,
    materialCert: false,
    inspectionReport: false,
    firstArticle: false
  });

  const [additionalNotes, setAdditionalNotes] = useState('');

  // Simulate the uploaded file from the console logs
  const uploadedFile = {
    fileName: '270.721.stp',
    fileSize: '39.32 KB',
    uploadDate: '6/24/2025'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-semibold">TobroTech</span>
              </div>
              
              <div>
                <h1 className="text-lg font-semibold text-gray-900">RFQ Management Panel</h1>
                <p className="text-sm text-gray-600">Manage Quotes, Parts & Specifications</p>
              </div>
            </div>

            {/* User Info and File Indicator */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Current User:</span> Guest User
              </div>
              
              <div className="bg-gradient-to-r from-blue-600 to-red-600 text-white px-3 py-1 rounded text-sm font-medium">
                Viewing 270.721.stp
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900">PART-001 - New Part</h2>
              <p className="text-sm text-gray-600">• Qty: 1 • Lead Time: N/A</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CAD Models & Drawings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                CAD Models & Drawings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Zone */}
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
                <Upload className="h-8 w-8 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Drag & drop CAD files or drawings
                </h3>
                <p className="text-gray-600 mb-4">STEP, IGES, STL, PDF, DWG</p>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Browse Files
                </Button>
              </div>

              {/* Uploaded File with 3D Viewer */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Uploaded Files:</h4>
                <CADFileViewer
                  fileName={uploadedFile.fileName}
                  fileSize={uploadedFile.fileSize}
                  uploadDate={uploadedFile.uploadDate}
                  onDelete={() => console.log('Delete file')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Part Specifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Part Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quality & Certification */}
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Quality & Certification</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="as9100d"
                      checked={specifications.as9100d}
                      onCheckedChange={(checked) => 
                        setSpecifications(prev => ({ ...prev, as9100d: checked as boolean }))
                      }
                    />
                    <label htmlFor="as9100d" className="text-sm">AS9100D Documentation</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="materialCert"
                      checked={specifications.materialCert}
                      onCheckedChange={(checked) => 
                        setSpecifications(prev => ({ ...prev, materialCert: checked as boolean }))
                      }
                    />
                    <label htmlFor="materialCert" className="text-sm">Material Certifications</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="inspectionReport"
                      checked={specifications.inspectionReport}
                      onCheckedChange={(checked) => 
                        setSpecifications(prev => ({ ...prev, inspectionReport: checked as boolean }))
                      }
                    />
                    <label htmlFor="inspectionReport" className="text-sm">Inspection Report</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="firstArticle"
                      checked={specifications.firstArticle}
                      onCheckedChange={(checked) => 
                        setSpecifications(prev => ({ ...prev, firstArticle: checked as boolean }))
                      }
                    />
                    <label htmlFor="firstArticle" className="text-sm">First Article Inspection</label>
                  </div>
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Special Instructions</h3>
                <p className="text-sm text-gray-600 mb-3">Additional Notes</p>
                <Textarea
                  placeholder="Any special instructions, packaging requirements, or notes..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Console Output Simulation */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Console
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm space-y-1">
              <div>Initializing RFQ Panel System...</div>
              <div>rfq-panel-system.js:531 Setting up file upload for part details view...</div>
              <div>rfq-panel-system.js:541 Found file input and upload area elements</div>
              <div>rfq-panel-system.js:558 Using simple button approach for file upload instead of complex click handler</div>
              <div>rfq-panel-system.js:613 File upload setup completed for part details view</div>
              <div className="text-yellow-400">rfq-panel-system.js:918 [INFO] Viewing 270.721.stp</div>
              <div className="text-blue-400">[INFO] 3D CAD viewer now available! Click "View 3D" button above.</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 