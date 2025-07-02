'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Eye, 
  Download, 
  Maximize2, 
  FileText,
  Box,
  Settings
} from 'lucide-react';
import CADViewer from '@/components/cad/CADViewer';

interface CADFileViewerProps {
  fileName: string;
  fileSize?: string;
  uploadDate?: string;
  fileUrl?: string;
  fileData?: ArrayBuffer;
  onDelete?: () => void;
  className?: string;
}

export default function CADFileViewer({
  fileName,
  fileSize,
  uploadDate,
  fileUrl,
  fileData,
  onDelete,
  className = ""
}: CADFileViewerProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check if file is a CAD file that can be viewed
  const isCADFile = fileName.toLowerCase().match(/\.(stp|step|iges|igs|stl)$/);
  const is3DFile = fileName.toLowerCase().match(/\.(stp|step|stl)$/);

  const handleView = () => {
    console.log(`[INFO] Viewing ${fileName}`);
    setIsViewerOpen(true);
  };

  const handleDownload = () => {
    console.log(`[INFO] Downloading ${fileName}`);
    // In a real implementation, this would trigger the actual download
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <>
      {/* File Display Card */}
      <Card className={`${className} hover:shadow-md transition-shadow`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* File Icon and Info */}
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-blue-600 text-white rounded-lg p-2">
                {isCADFile ? <Box className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{fileName}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {fileSize && <span>{fileSize}</span>}
                  {uploadDate && <span>• {uploadDate}</span>}
                  {isCADFile && (
                    <Badge variant="secondary" className="text-xs">
                      CAD File
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {isCADFile && (
                <Button size="sm" variant="outline" onClick={handleView}>
                  <Eye className="h-4 w-4 mr-1" />
                  View 3D
                </Button>
              )}
              
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              
              {onDelete && (
                <Button size="sm" variant="outline" onClick={onDelete} className="text-red-600 hover:text-red-700">
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3D Viewer Dialog */}
      {isCADFile && (
        <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
          <DialogContent className={`max-w-6xl ${isFullscreen ? 'h-screen max-h-screen' : 'max-h-[90vh]'}`}>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  3D CAD Viewer - {fileName}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden">
              <CADViewer
                fileName={fileName}
                fileUrl={fileUrl}
                fileData={fileData}
                height={isFullscreen ? "calc(100vh - 120px)" : "500px"}
                showControls={true}
                showInfo={true}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 