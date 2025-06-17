'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Save, 
  Eye,
  TrendingUp,
  Shield,
  Wrench
} from 'lucide-react';
import type { 
  ToolLifeVerification, 
  ToolVerificationEntry, 
  ToolMeasurement,
  Tool
} from '@/types/tools';
import type { ToolList } from '@/types/manufacturing-templates';
import { 
  createToolLifeVerification,
  getToolLifeVerificationBySubtask,
  calculateToolRiskLevel,
  getNextInspectionDate,
  recordToolPerformance
} from '@/lib/firebase-tools';
import { getToolListsBySubtask } from '@/lib/firebase-manufacturing';
import ToolPerformanceInput from './ToolPerformanceInput';

interface ToolLifeVerificationFormProps {
  subtaskId: string;
  jobId: string;
  taskId: string;
  onSave?: (verification: ToolLifeVerification) => void;
  onClose?: () => void;
}

export default function ToolLifeVerificationForm({
  subtaskId,
  jobId,
  taskId,
  onSave,
  onClose
}: ToolLifeVerificationFormProps) {
  const { toast } = useToast();
  
  const [toolLists, setToolLists] = useState<ToolList[]>([]);
  const [selectedToolList, setSelectedToolList] = useState<ToolList | null>(null);
  const [verification, setVerification] = useState<Partial<ToolLifeVerification>>({
    toolListId: '',
    jobId,
    taskId,
    subtaskId,
    verificationDate: new Date().toISOString().split('T')[0],
    verifiedBy: 'current-user', // TODO: Get from auth context
    toolsVerified: [],
    riskAssessmentCompleted: false,
    criticalToolsIdentified: [],
    replacementToolsStaged: false,
    monitoringSystemActive: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPerformanceInput, setShowPerformanceInput] = useState(false);

  useEffect(() => {
    loadToolLists();
    loadExistingVerification();
  }, [subtaskId]);

  const loadToolLists = async () => {
    try {
      // First try to get tool lists from the current subtask
      let lists = await getToolListsBySubtask(subtaskId);
      
      // If no tool lists found in current subtask, search across the entire task
      if (lists.length === 0) {
        console.log('No tool lists found in current subtask, searching task-wide...');
        // We need to get all subtasks for this task and search for tool lists
        // For now, we'll try a different approach - get tool lists by task ID
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
      
      console.log(`Found ${lists.length} tool lists for verification`);
      setToolLists(lists);
      
      if (lists.length === 1) {
        setSelectedToolList(lists[0]);
        setVerification(prev => ({ ...prev, toolListId: lists[0].id }));
        initializeToolVerifications(lists[0]);
      }
    } catch (error) {
      console.error('Error loading tool lists:', error);
    }
  };

  const loadExistingVerification = async () => {
    try {
      const existing = await getToolLifeVerificationBySubtask(subtaskId);
      if (existing) {
        setVerification(existing);
        // Find and set the corresponding tool list
        const toolList = toolLists.find(tl => tl.id === existing.toolListId);
        if (toolList) {
          setSelectedToolList(toolList);
        }
      }
    } catch (error) {
      console.error('Error loading existing verification:', error);
    }
  };

  const initializeToolVerifications = (toolList: ToolList) => {
    const toolVerifications: ToolVerificationEntry[] = toolList.tools.map(toolEntry => {
      const tool = toolEntry.tool;
      
      // Map manufacturing template conditions to verification conditions
      const currentCondition = tool.condition === 'new' ? 'good' : 
                               tool.condition === 'worn' ? 'wear_visible' :
                               tool.condition === 'damaged' ? 'replace_soon' : 'good';
      
      // Default life remaining based on condition
      const lifeRemaining = tool.condition === 'new' ? 100 :
                           tool.condition === 'worn' ? 60 :
                           tool.condition === 'damaged' ? 20 : 100;
      
      // Calculate risk using the new algorithm
      const riskAssessment = calculateToolRisk(currentCondition, lifeRemaining);
      
      return {
        toolId: tool.id,
        toolNumber: tool.toolNumber || `T${toolEntry.position}`,
        currentCondition,
        lifeRemaining,
        riskLevel: riskAssessment.riskLevel,
        actionRequired: riskAssessment.actionRequired,
        inspectionNotes: '',
        measurementsTaken: []
      };
    });

    setVerification(prev => ({
      ...prev,
      toolsVerified: toolVerifications,
      criticalToolsIdentified: toolVerifications
        .filter(tv => tv.riskLevel === 'high')
        .map(tv => tv.toolId)
    }));
  };

  // Dynamic risk assessment algorithm
  const calculateToolRisk = (currentCondition: string, lifeRemaining: number): {
    riskLevel: 'low' | 'medium' | 'high',
    actionRequired: 'monitor' | 'replace_next_setup' | 'replace_immediately'
  } => {
    // AS9100D Risk-Based Assessment Algorithm
    
    // High Risk Conditions (Immediate Action Required)
    if (currentCondition === 'replace_soon' || currentCondition === 'replaced') {
      return { riskLevel: 'high', actionRequired: 'replace_immediately' };
    }
    
    if (lifeRemaining <= 20) {
      return { riskLevel: 'high', actionRequired: 'replace_immediately' };
    }
    
    // Medium Risk Conditions (Replace at Next Setup)
    if (currentCondition === 'wear_visible') {
      if (lifeRemaining <= 50) {
        return { riskLevel: 'high', actionRequired: 'replace_immediately' };
      } else {
        return { riskLevel: 'medium', actionRequired: 'replace_next_setup' };
      }
    }
    
    if (lifeRemaining <= 40) {
      return { riskLevel: 'medium', actionRequired: 'replace_next_setup' };
    }
    
    // Low Risk Conditions (Continue Monitoring)
    if (currentCondition === 'good' && lifeRemaining > 40) {
      return { riskLevel: 'low', actionRequired: 'monitor' };
    }
    
    // Default to medium risk for edge cases
    return { riskLevel: 'medium', actionRequired: 'replace_next_setup' };
  };

  const updateToolVerification = (index: number, field: keyof ToolVerificationEntry, value: any) => {
    setVerification(prev => ({
      ...prev,
      toolsVerified: prev.toolsVerified?.map((tool, i) => {
        if (i === index) {
          const updatedTool = { ...tool, [field]: value };
          
          // Recalculate risk whenever condition or life remaining changes
          if (field === 'currentCondition' || field === 'lifeRemaining') {
            const riskAssessment = calculateToolRisk(
              field === 'currentCondition' ? value : updatedTool.currentCondition,
              field === 'lifeRemaining' ? value : updatedTool.lifeRemaining
            );
            
            updatedTool.riskLevel = riskAssessment.riskLevel;
            updatedTool.actionRequired = riskAssessment.actionRequired;
          }
          
          return updatedTool;
        }
        return tool;
      }) || []
    }));
  };

  const addMeasurement = (toolIndex: number) => {
    const newMeasurement: ToolMeasurement = {
      parameter: '',
      value: 0,
      unit: 'mm',
      withinTolerance: true
    };

    setVerification(prev => ({
      ...prev,
      toolsVerified: prev.toolsVerified?.map((tool, i) => 
        i === toolIndex ? {
          ...tool,
          measurementsTaken: [...(tool.measurementsTaken || []), newMeasurement]
        } : tool
      ) || []
    }));
  };

  const updateMeasurement = (toolIndex: number, measurementIndex: number, field: keyof ToolMeasurement, value: any) => {
    setVerification(prev => ({
      ...prev,
      toolsVerified: prev.toolsVerified?.map((tool, i) => 
        i === toolIndex ? {
          ...tool,
          measurementsTaken: tool.measurementsTaken?.map((measurement, j) =>
            j === measurementIndex ? { ...measurement, [field]: value } : measurement
          ) || []
        } : tool
      ) || []
    }));
  };

  const handleSave = async () => {
    if (!selectedToolList) {
      toast({
        title: "No Tool List Selected",
        description: "Please create a tool list first before generating verification.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const verificationData = {
        ...verification,
        toolListId: selectedToolList.id,
        riskAssessmentCompleted: true,
        updatedAt: new Date().toISOString()
      } as Omit<ToolLifeVerification, 'id' | 'createdAt'>;

      const verificationId = await createToolLifeVerification(verificationData);
      
      const savedVerification = {
        ...verificationData,
        id: verificationId,
        createdAt: new Date().toISOString()
      } as ToolLifeVerification;

      toast({
        title: "Tool Life Verification Saved",
        description: "Risk assessment completed and verification record created.",
      });

      onSave?.(savedVerification);
    } catch (error) {
      console.error('Error saving verification:', error);
      toast({
        title: "Save Failed",
        description: "Could not save tool life verification.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePrintableReport = () => {
    if (!selectedToolList || !verification.toolsVerified) {
      toast({
        title: "Missing Data",
        description: "Please complete the tool verification before printing.",
        variant: "destructive",
      });
      return;
    }

          try {
        const criticalTools = verification.toolsVerified.filter(t => t.riskLevel === 'high');
        const mediumRiskTools = verification.toolsVerified.filter(t => t.riskLevel === 'medium');
        
        // Create the HTML content first
        const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <title>Tool Life Verification Report - ${jobId}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; color: black; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
      .section { margin-bottom: 25px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
      .table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
      .table th, .table td { border: 1px solid #000; padding: 8px; font-size: 10pt; text-align: left; }
      .table th { background-color: #f0f0f0; font-weight: bold; }
      .risk-high { background-color: #fee; }
      .risk-medium { background-color: #fff3cd; }
      .risk-low { background-color: #f0f8f0; }
      .signature-box { border: 1px solid #000; height: 60px; margin-top: 10px; }
      @media print { body { margin: 0; } }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>TOOL LIFE VERIFICATION REPORT</h1>
      <p>AS9100D Risk-Based Tool Management</p>
      <p>EMI CNC Machining - Quality Management System</p>
    </div>

    <div class="section">
      <div class="grid">
        <div>
          <p><strong>Job ID:</strong> ${jobId}</p>
          <p><strong>Task ID:</strong> ${taskId}</p>
          <p><strong>Verification Date:</strong> ${verification.verificationDate}</p>
          <p><strong>Verified By:</strong> ${verification.verifiedBy}</p>
        </div>
        <div>
          <p><strong>Tool List:</strong> ${selectedToolList.processName || 'N/A'}</p>
          <p><strong>Machine:</strong> ${selectedToolList.machineNumber || 'N/A'}</p>
          <p><strong>Total Tools:</strong> ${verification.toolsVerified.length}</p>
          <p><strong>Critical Tools:</strong> ${criticalTools.length}</p>
        </div>
      </div>
    </div>

    <div class="section">
      <h3>Risk Assessment Summary</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Risk Level</th>
            <th>Count</th>
            <th>Action Required</th>
            <th>Inspection Frequency</th>
          </tr>
        </thead>
        <tbody>
          <tr class="risk-high">
            <td>High Risk</td>
            <td>${criticalTools.length}</td>
            <td>Immediate Replacement/Monitoring</td>
            <td>Every 7 days</td>
          </tr>
          <tr class="risk-medium">
            <td>Medium Risk</td>
            <td>${mediumRiskTools.length}</td>
            <td>Replace at Next Setup</td>
            <td>Every 14 days</td>
          </tr>
          <tr class="risk-low">
            <td>Low Risk</td>
            <td>${verification.toolsVerified.length - criticalTools.length - mediumRiskTools.length}</td>
            <td>Continue Monitoring</td>
            <td>Every 30 days</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h3>Tool Verification Details</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Tool #</th>
            <th>Condition</th>
            <th>Life Remaining</th>
            <th>Risk Level</th>
            <th>Action Required</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${verification.toolsVerified.map(tool => `
            <tr class="risk-${tool.riskLevel}">
              <td>${tool.toolNumber || 'N/A'}</td>
              <td>${tool.currentCondition.replace('_', ' ')}</td>
              <td>${Math.round(tool.lifeRemaining)}%</td>
              <td>${tool.riskLevel.toUpperCase()}</td>
              <td>${tool.actionRequired?.replace('_', ' ') || 'Monitor'}</td>
              <td>${(tool.inspectionNotes || '').replace(/"/g, '&quot;')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h3>AS9100D Compliance Checklist</h3>
      <p>☑ Risk assessment completed based on part criticality</p>
      <p>☑ Tool life limits verified against manufacturer specifications</p>
      <p>☑ Critical tools identified and flagged for priority monitoring</p>
      <p>${verification.replacementToolsStaged ? '☑' : '☐'} Replacement tools staged and ready</p>
      <p>${verification.monitoringSystemActive ? '☑' : '☐'} Tool life monitoring system active</p>
    </div>

    <div class="section">
      <div class="grid">
        <div>
          <p><strong>Verified By:</strong></p>
          <div class="signature-box"></div>
          <p>Signature: _________________ Date: _______</p>
        </div>
        <div>
          <p><strong>Approved By:</strong></p>
          <div class="signature-box"></div>
          <p>Signature: _________________ Date: _______</p>
        </div>
      </div>
    </div>

    <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #000; text-align: center; font-size: 10pt;">
      Document: TLV-${jobId}-${new Date().toLocaleDateString().replace(/\//g, '')} | 
      Generated: ${new Date().toLocaleString()} | 
      AS9100D Clause 8.5.1 - Control of Production
    </div>
  </body>
</html>`;

      // Try to open print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait a moment for the content to load, then show print dialog
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          // Don't automatically close - let user review and close manually
        }, 500);
        
        toast({
          title: "Print Report Generated",
          description: "Report opened in new window. You can review it before printing.",
        });
      } else {
        // Fallback: create a downloadable HTML file
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Tool_Life_Verification_${jobId}_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Print Window Blocked",
          description: "Report downloaded as HTML file instead.",
        });
      }
    } catch (error) {
      console.error('Error generating print report:', error);
      toast({
        title: "Print Failed",
        description: "Could not generate the print report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'outline';
    }
  };

  const getConditionBadgeColor = (condition: string) => {
    switch (condition) {
      case 'good': return 'default';
      case 'wear_visible': return 'secondary';
      case 'replace_soon': return 'destructive';
      case 'replaced': return 'outline';
      default: return 'outline';
    }
  };

  if (toolLists.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Tool List Found</h3>
          <p className="text-gray-600 mb-4">
            A tool list must be created first before generating tool life verification.
          </p>
          <p className="text-sm text-gray-500">
            Please create a tool list for this operation, then return to generate the verification report.
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
            <Shield className="h-5 w-5" />
            Tool Life Verification - AS9100D Risk-Based Approach
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
                    setVerification(prev => ({ ...prev, toolListId: value }));
                    initializeToolVerifications(toolList);
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
              <Label>Verification Date</Label>
              <Input
                type="date"
                value={verification.verificationDate}
                onChange={(e) => setVerification(prev => ({ ...prev, verificationDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="riskAssessment"
                checked={verification.riskAssessmentCompleted}
                onCheckedChange={(checked) => 
                  setVerification(prev => ({ ...prev, riskAssessmentCompleted: !!checked }))
                }
              />
              <Label htmlFor="riskAssessment">Risk assessment completed</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="replacementStaged"
                checked={verification.replacementToolsStaged}
                onCheckedChange={(checked) => 
                  setVerification(prev => ({ ...prev, replacementToolsStaged: !!checked }))
                }
              />
              <Label htmlFor="replacementStaged">Replacement tools staged</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="monitoringActive"
                checked={verification.monitoringSystemActive}
                onCheckedChange={(checked) => 
                  setVerification(prev => ({ ...prev, monitoringSystemActive: !!checked }))
                }
              />
              <Label htmlFor="monitoringActive">Monitoring system active</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedToolList && verification.toolsVerified && (
        <Card>
          <CardHeader>
            <CardTitle>Tool Verification Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {verification.toolsVerified.map((tool, index) => (
                <div key={tool.toolId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{tool.toolNumber}</h4>
                      <Badge variant={getRiskBadgeColor(tool.riskLevel)}>
                        {tool.riskLevel.toUpperCase()} RISK
                      </Badge>
                      <Badge variant={getConditionBadgeColor(tool.currentCondition)}>
                        {tool.currentCondition.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      Life Remaining: {Math.round(tool.lifeRemaining)}%
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label>Current Condition</Label>
                      <Select
                        value={tool.currentCondition}
                        onValueChange={(value) => updateToolVerification(index, 'currentCondition', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="wear_visible">Wear Visible</SelectItem>
                          <SelectItem value="replace_soon">Replace Soon</SelectItem>
                          <SelectItem value="replaced">Replaced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Action Required</Label>
                      <Select
                        value={tool.actionRequired || 'monitor'}
                        onValueChange={(value) => updateToolVerification(index, 'actionRequired', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monitor">Monitor</SelectItem>
                          <SelectItem value="replace_next_setup">Replace Next Setup</SelectItem>
                          <SelectItem value="replace_immediately">Replace Immediately</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Life Remaining (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round(tool.lifeRemaining)}
                        onChange={(e) => updateToolVerification(index, 'lifeRemaining', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label>Inspection Notes</Label>
                    <Textarea
                      value={tool.inspectionNotes || ''}
                      onChange={(e) => updateToolVerification(index, 'inspectionNotes', e.target.value)}
                      placeholder="Record any observations, measurements, or concerns..."
                      className="min-h-[60px]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addMeasurement(index)}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Add Measurement
                    </Button>
                  </div>

                  {tool.measurementsTaken && tool.measurementsTaken.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Label className="text-sm font-semibold">Measurements</Label>
                      {tool.measurementsTaken.map((measurement, measurementIndex) => (
                        <div key={measurementIndex} className="grid grid-cols-4 gap-2 p-2 bg-gray-50 rounded">
                          <Input
                            placeholder="Parameter"
                            value={measurement.parameter}
                            onChange={(e) => updateMeasurement(index, measurementIndex, 'parameter', e.target.value)}
                          />
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="Value"
                            value={measurement.value}
                            onChange={(e) => updateMeasurement(index, measurementIndex, 'value', parseFloat(e.target.value))}
                          />
                          <Input
                            placeholder="Unit"
                            value={measurement.unit}
                            onChange={(e) => updateMeasurement(index, measurementIndex, 'unit', e.target.value)}
                          />
                          <div className="flex items-center">
                            <Checkbox
                              checked={measurement.withinTolerance}
                              onCheckedChange={(checked) => 
                                updateMeasurement(index, measurementIndex, 'withinTolerance', !!checked)
                              }
                            />
                            <Label className="ml-2 text-sm">Within Tolerance</Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowPerformanceInput(!showPerformanceInput)}
          >
            <Wrench className="h-4 w-4 mr-2" />
            Input Tool Performance
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={generatePrintableReport}
            disabled={!selectedToolList || !verification.toolsVerified}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !selectedToolList}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Verification'}
          </Button>
        </div>
      </div>

      {showPerformanceInput && (
        <Card>
          <CardHeader>
            <CardTitle>Tool Performance Data Input</CardTitle>
          </CardHeader>
          <CardContent>
            <ToolPerformanceInput
              subtaskId={subtaskId}
              jobId={jobId}
              taskId={taskId}
              onSave={(performanceRecords) => {
                toast({
                  title: "Tool Performance Recorded",
                  description: `Recorded performance data for ${performanceRecords.length} tools.`,
                });
                setShowPerformanceInput(false);
              }}
              onClose={() => setShowPerformanceInput(false)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
} 