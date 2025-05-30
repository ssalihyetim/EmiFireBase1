'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ToolLifeVerificationTemplateProps {
  jobId: string;
  taskName: string;
  partName: string;
  date?: string;
}

export default function ToolLifeVerificationTemplate({
  jobId,
  taskName,
  partName,
  date = new Date().toLocaleDateString()
}: ToolLifeVerificationTemplateProps) {
  const documentId = `TLL-${jobId}-${date.replace(/\//g, '')}`;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white print:shadow-none">
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
        <h1 className="text-2xl font-bold">TOOL LIFE TRACKING LOG</h1>
        <p className="text-sm text-gray-600 mt-2">EMI CNC Machining - AS9100D Quality System</p>
      </div>

      {/* Document Information */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p><strong>Document:</strong> {documentId}</p>
          <p><strong>Rev:</strong> ____</p>
          <p><strong>Job:</strong> {jobId}</p>
        </div>
        <div>
          <p><strong>Part:</strong> {partName}</p>
          <p><strong>Process:</strong> {taskName}</p>
          <p><strong>Date:</strong> {date}</p>
        </div>
      </div>

      {/* Tool Tracking Table */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Tool Tracking Table:</h3>
        <table className="w-full border-collapse border border-gray-400 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-2">Date</th>
              <th className="border border-gray-400 p-2">Time</th>
              <th className="border border-gray-400 p-2">T#</th>
              <th className="border border-gray-400 p-2">Operation</th>
              <th className="border border-gray-400 p-2">Parts Count</th>
              <th className="border border-gray-400 p-2">Cumulative Life</th>
              <th className="border border-gray-400 p-2">Condition</th>
              <th className="border border-gray-400 p-2">Operator</th>
              <th className="border border-gray-400 p-2">Action Taken</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 15 }, (_, i) => (
              <tr key={i}>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tool Change Record */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Tool Change Record:</h3>
        <table className="w-full border-collapse border border-gray-400 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-2">Date</th>
              <th className="border border-gray-400 p-2">Time</th>
              <th className="border border-gray-400 p-2">T#</th>
              <th className="border border-gray-400 p-2">Reason</th>
              <th className="border border-gray-400 p-2">Old Tool ID</th>
              <th className="border border-gray-400 p-2">New Tool ID</th>
              <th className="border border-gray-400 p-2">Parts on Old Tool</th>
              <th className="border border-gray-400 p-2">Operator</th>
              <th className="border border-gray-400 p-2">Inspector</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }, (_, i) => (
              <tr key={i}>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
                <td className="border border-gray-400 p-2 h-8"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Condition Codes and Alerts */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Condition Codes:</h3>
          <div className="text-sm space-y-1">
            <p><strong>G</strong> = Good</p>
            <p><strong>W</strong> = Wear Visible</p>
            <p><strong>R</strong> = Replace Soon</p>
            <p><strong>X</strong> = Replaced</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-3">Tool Life Alerts:</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>All tools within life limits at setup</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Tool life monitoring system active</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Replacement tools staged and ready</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Life limits updated in system</span>
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-sm">
        <p className="text-center text-gray-600">
          AS9100D Tool Life Tracking Requirements - Document TLL-{jobId}-{date.replace(/\//g, '')}
        </p>
      </div>
    </div>
  );
} 