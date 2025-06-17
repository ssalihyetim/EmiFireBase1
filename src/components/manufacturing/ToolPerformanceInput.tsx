'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, 
  TrendingUp, 
  AlertTriangle
} from 'lucide-react';
import type { 
  ToolPerformanceRecord,
  Tool as ToolsDbTool
} from '@/types/tools';
import type { ToolList, Tool } from '@/types/manufacturing-templates';
import { 
  recordToolPerformance,
  updateTool
} from '@/lib/firebase-tools';
import { getToolListsBySubtask } from '@/lib/firebase-manufacturing';

interface ToolPerformanceInputProps {
  subtaskId: string;
  jobId: string;
  taskId: string;
  onSave?: (performanceRecords: ToolPerformanceRecord[]) => void;
  onClose?: () => void;
}

export default function ToolPerformanceInput({
  subtaskId,
  jobId,
  taskId,
  onSave,
  onClose
}: ToolPerformanceInputProps) {
  const { toast } = useToast();
  
  const [toolLists, setToolLists] = useState<ToolList[]>([]);
  const [selectedToolList, setSelectedToolList] = useState<ToolList | null>(null);
  const [performanceData, setPerformanceData] = useState<{
    operationName: string;
    partsProduced: number;
    operatorNotes: string;
    qualityIssues: string[];
    toolPerformances: {
      toolId: string;
      toolNumber: string;
      actualLifeUsed: number;
      surfaceFinish?: number;
      dimensionalAccuracy?: number;
      wearMeasurement?: number;
      toolNotes: string;
    }[];
  }>({
    operationName: '',
    partsProduced: 0,
    operatorNotes: '',
    qualityIssues: [],
    toolPerformances: []
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadToolLists();
  }, [subtaskId]);

  const loadToolLists = async () => {
    try {
      // First try to get tool lists from the current subtask
      let lists = await getToolListsBySubtask(subtaskId);
      
      // If no tool lists found in current subtask, search across the entire task
      if (lists.length === 0) {
        console.log('No tool lists found in current subtask, searching task-wide...');
        try {
          // Import the function to get all tool lists by task
          const { getToolListsByTask } = await import('@/lib/firebase-manufacturing');
          lists = await getToolListsByTask(taskId);
        } catch (taskError) {
          console.log('getToolListsByTask not available, trying alternative approach');
          // Alternative: search common tool list subtask IDs
          const toolListSubtaskIds = [
            `${taskId}_turning_tool_list`,
            `${taskId}_milling_tool_list`, 
            `${taskId}_5_axis_tool_list`
          ];
          
          for (const subtaskId of toolListSubtaskIds) {
            try {
              const subtaskLists = await getToolListsBySubtask(subtaskId);
              lists = [...lists, ...subtaskLists];
            } catch (error) {
              // Continue searching other subtasks
            }
          }
        }
      }
      
      console.log(`Found ${lists.length} tool lists for performance input`);
      setToolLists(lists);
      
      if (lists.length === 1) {
        setSelectedToolList(lists[0]);
        initializeToolPerformances(lists[0]);
      }
    } catch (error) {
      console.error('Error loading tool lists:', error);
    }
  };

  const initializeToolPerformances = (toolList: ToolList) => {
    const toolPerformances = toolList.tools.map(toolEntry => ({
      toolId: toolEntry.tool.id,
      toolNumber: toolEntry.tool.toolNumber || `T${toolEntry.position}`,
      actualLifeUsed: 0,
      surfaceFinish: undefined,
      dimensionalAccuracy: undefined,
      wearMeasurement: undefined,
      toolNotes: ''
    }));

    setPerformanceData(prev => ({
      ...prev,
      operationName: toolList.processName || '',
      toolPerformances
    }));
  };

  const updateToolPerformance = (index: number, field: string, value: any) => {
    setPerformanceData(prev => ({
      ...prev,
      toolPerformances: prev.toolPerformances.map((tool, i) => 
        i === index ? { ...tool, [field]: value } : tool
      )
    }));
  };

  const addQualityIssue = () => {
    setPerformanceData(prev => ({
      ...prev,
      qualityIssues: [...prev.qualityIssues, '']
    }));
  };

  const updateQualityIssue = (index: number, value: string) => {
    setPerformanceData(prev => ({
      ...prev,
      qualityIssues: prev.qualityIssues.map((issue, i) => 
        i === index ? value : issue
      )
    }));
  };

  const removeQualityIssue = (index: number) => {
    setPerformanceData(prev => ({
      ...prev,
      qualityIssues: prev.qualityIssues.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!selectedToolList) {
      toast({
        title: "No Tool List Selected",
        description: "Please select a tool list first.",
        variant: "destructive",
      });
      return;
    }

    if (performanceData.partsProduced <= 0) {
      toast({
        title: "Invalid Parts Count",
        description: "Please enter the number of parts produced.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const performanceRecords: ToolPerformanceRecord[] = [];

      // Record performance for each tool
      for (const toolPerf of performanceData.toolPerformances) {
        if (toolPerf.actualLifeUsed > 0) {
          // Create performance record, filtering out undefined values
          const performanceRecord: Omit<ToolPerformanceRecord, 'id' | 'recordedAt'> = {
            jobId,
            taskId,
            operationName: performanceData.operationName,
            partsProduced: performanceData.partsProduced,
            actualLifeUsed: toolPerf.actualLifeUsed,
            operatorNotes: `${performanceData.operatorNotes}\nTool Notes: ${toolPerf.toolNotes}`.trim(),
            qualityIssues: performanceData.qualityIssues.filter(issue => issue.trim() !== ''),
            recordedBy: 'current-user' // TODO: Get from auth context
          };

          // Only add optional fields if they have values
          if (toolPerf.surfaceFinish !== undefined && toolPerf.surfaceFinish !== null && !isNaN(toolPerf.surfaceFinish)) {
            performanceRecord.surfaceFinish = toolPerf.surfaceFinish;
          }
          if (toolPerf.dimensionalAccuracy !== undefined && toolPerf.dimensionalAccuracy !== null && !isNaN(toolPerf.dimensionalAccuracy)) {
            performanceRecord.dimensionalAccuracy = toolPerf.dimensionalAccuracy;
          }
          if (toolPerf.wearMeasurement !== undefined && toolPerf.wearMeasurement !== null && !isNaN(toolPerf.wearMeasurement)) {
            performanceRecord.wearMeasurement = toolPerf.wearMeasurement;
          }

          const recordId = await recordToolPerformance(performanceRecord);
          
          performanceRecords.push({
            ...performanceRecord,
            id: recordId,
            recordedAt: new Date().toISOString()
          });

          // Update tool's current life and condition in the tools database
          // Note: We update the tools database (ToolsDbTool) not the manufacturing template tool
          try {
            await updateTool(toolPerf.toolId, {
              totalLifeUsed: toolPerf.actualLifeUsed, // Add to existing life
              lastInspectionDate: new Date().toISOString()
            });
          } catch (error) {
            console.warn('Could not update tool in database:', error);
          }
        }
      }

      toast({
        title: "Tool Performance Recorded",
        description: `Recorded performance data for ${performanceRecords.length} tools.`,
      });

      onSave?.(performanceRecords);
    } catch (error) {
      console.error('Error recording tool performance:', error);
      toast({
        title: "Save Failed",
        description: "Could not record tool performance data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLifeUsageColor = (actualLife: number, tool: any) => {
    if (!tool?.lifeLimit) return 'text-gray-600';
    const percentage = (actualLife / tool.lifeLimit) * 100;
    if (percentage > 20) return 'text-red-600';
    if (percentage > 10) return 'text-orange-600';
    return 'text-green-600';
  };

  if (toolLists.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Tool List Found</h3>
          <p className="text-gray-600 mb-4">
            A tool list must be created first before recording tool performance.
          </p>
          <p className="text-sm text-gray-500">
            Please create a tool list for this operation, then return to record performance data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tool Performance Data Input
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tool List</Label>
              <Select 
                value={selectedToolList?.id || ''} 
                onValueChange={(value) => {
                  const toolList = toolLists.find(tl => tl.id === value);
                  if (toolList) {
                    setSelectedToolList(toolList);
                    initializeToolPerformances(toolList);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tool list" />
                </SelectTrigger>
                <SelectContent>
                  {toolLists.map(toolList => (
                    <SelectItem key={toolList.id} value={toolList.id}>
                      {toolList.processName} - {toolList.machineNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parts Produced</Label>
              <Input
                type="number"
                min="1"
                value={performanceData.partsProduced}
                onChange={(e) => setPerformanceData(prev => ({ 
                  ...prev, 
                  partsProduced: parseInt(e.target.value) || 0 
                }))}
                placeholder="Number of parts completed"
              />
            </div>
          </div>

          <div>
            <Label>Operation Name</Label>
            <Input
              value={performanceData.operationName}
              onChange={(e) => setPerformanceData(prev => ({ 
                ...prev, 
                operationName: e.target.value 
              }))}
              placeholder="e.g., Rough turning, Finish milling"
            />
          </div>

          <div>
            <Label>Operator Notes</Label>
            <Textarea
              value={performanceData.operatorNotes}
              onChange={(e) => setPerformanceData(prev => ({ 
                ...prev, 
                operatorNotes: e.target.value 
              }))}
              placeholder="General observations about the operation..."
              className="min-h-[80px]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Quality Issues</Label>
              <Button size="sm" variant="outline" onClick={addQualityIssue}>
                Add Issue
              </Button>
            </div>
            {performanceData.qualityIssues.map((issue, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={issue}
                  onChange={(e) => updateQualityIssue(index, e.target.value)}
                  placeholder="Describe any quality issues encountered"
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => removeQualityIssue(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedToolList && (
        <Card>
          <CardHeader>
            <CardTitle>Individual Tool Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {performanceData.toolPerformances.map((toolPerf, index) => {
                const tool = selectedToolList.tools.find(t => t.tool.id === toolPerf.toolId)?.tool;
                return (
                  <div key={toolPerf.toolId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{toolPerf.toolNumber}</h4>
                        <Badge variant="outline">
                          {tool?.toolType?.replace('_', ' ') || 'Tool'}
                        </Badge>
                        {tool?.condition && (
                          <Badge variant={
                            tool.condition === 'good' ? 'default' :
                            tool.condition === 'worn' ? 'secondary' :
                            tool.condition === 'damaged' ? 'destructive' : 'outline'
                          }>
                            {tool.condition.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {tool?.description}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <Label>Life Used (minutes)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={toolPerf.actualLifeUsed}
                          onChange={(e) => updateToolPerformance(index, 'actualLifeUsed', parseFloat(e.target.value) || 0)}
                          className={getLifeUsageColor(toolPerf.actualLifeUsed, tool)}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Life used: {toolPerf.actualLifeUsed} minutes
                        </div>
                      </div>
                      <div>
                        <Label>Surface Finish (Ra)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={toolPerf.surfaceFinish || ''}
                          onChange={(e) => updateToolPerformance(index, 'surfaceFinish', parseFloat(e.target.value) || undefined)}
                          placeholder="μm"
                        />
                      </div>
                      <div>
                        <Label>Dimensional Accuracy</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={toolPerf.dimensionalAccuracy || ''}
                          onChange={(e) => updateToolPerformance(index, 'dimensionalAccuracy', parseFloat(e.target.value) || undefined)}
                          placeholder="±mm deviation"
                        />
                      </div>
                      <div>
                        <Label>Wear Measurement</Label>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={toolPerf.wearMeasurement || ''}
                          onChange={(e) => updateToolPerformance(index, 'wearMeasurement', parseFloat(e.target.value) || undefined)}
                          placeholder="mm"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Tool-Specific Notes</Label>
                      <Textarea
                        value={toolPerf.toolNotes}
                        onChange={(e) => updateToolPerformance(index, 'toolNotes', e.target.value)}
                        placeholder="Observations specific to this tool..."
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isLoading || !selectedToolList || performanceData.partsProduced <= 0}
        >
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Recording...' : 'Record Performance'}
        </Button>
      </div>
    </div>
  );
} 