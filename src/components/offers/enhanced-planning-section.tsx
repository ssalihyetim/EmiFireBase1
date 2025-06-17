"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Trash2, 
  Plus, 
  Clock, 
  Zap, 
  Calculator, 
  AlertTriangle, 
  GripVertical, 
  ArrowUp, 
  ArrowDown, 
  Copy 
} from "lucide-react";
import type { MachineType, Machine } from "@/types/planning";
import { useToast } from "@/hooks/use-toast";

// Process templates with default times (in minutes)
const PROCESS_TEMPLATES: Record<string, {
  machineType: MachineType;
  setupTimeMinutes: number;
  cycleTimeMinutes: number;
  requiredMachineCapabilities: string[];
  description: string;
}> = {
  "Turning": {
    machineType: "turning",
    setupTimeMinutes: 30,
    cycleTimeMinutes: 5,
    requiredMachineCapabilities: ["turning"],
    description: "CNC turning operation"
  },
  "3-Axis Milling": {
    machineType: "milling", 
    setupTimeMinutes: 45,
    cycleTimeMinutes: 15,
    requiredMachineCapabilities: ["3-axis-milling"],
    description: "3-axis CNC milling"
  },
  "4-Axis Milling": {
    machineType: "milling",
    setupTimeMinutes: 60,
    cycleTimeMinutes: 20,
    requiredMachineCapabilities: ["3-axis-milling"],
    description: "4-axis CNC milling"
  },
  "5-Axis Milling": {
    machineType: "5-axis",
    setupTimeMinutes: 90,
    cycleTimeMinutes: 30,
    requiredMachineCapabilities: ["5-axis-milling", "complex-geometry"],
    description: "5-axis CNC milling for complex parts"
  },
  "Grinding": {
    machineType: "milling",
    setupTimeMinutes: 25,
    cycleTimeMinutes: 8,
    requiredMachineCapabilities: ["precision"],
    description: "Precision grinding operation"
  },
  "Deburring": {
    machineType: "milling",
    setupTimeMinutes: 15,
    cycleTimeMinutes: 3,
    requiredMachineCapabilities: [],
    description: "Manual/automated deburring"
  }
};

interface ProcessInstance {
  id: string;
  baseProcessName: string;
  instanceNumber: number;
  displayName: string;
  machineType: MachineType;
  setupTimeMinutes: number;
  cycleTimeMinutes: number;
  description: string;
  requiredMachineCapabilities: string[];
  orderIndex: number;
  estimatedCost: number;
  dependencies: string[];
}

interface EnhancedPlanningSectionProps {
  selectedProcesses: string[];
  quantity: number;
  onPlanningDataChange: (planningData: {
    processes: ProcessInstance[];
    estimatedTotalTimeMinutes: number;
    estimatedTotalCost: number;
  }) => void;
  machines?: Machine[];
}

export function EnhancedPlanningSection({ 
  selectedProcesses, 
  quantity, 
  onPlanningDataChange, 
  machines = [] 
}: EnhancedPlanningSectionProps) {
  const [processInstances, setProcessInstances] = useState<ProcessInstance[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [nextInstanceNumbers, setNextInstanceNumbers] = useState<Record<string, number>>({});
  const { toast } = useToast();

  // Create process instances from selected processes
  useEffect(() => {
    const currentProcessTypes = new Set(processInstances.map(p => p.baseProcessName));
    const selectedProcessTypes = new Set(selectedProcesses.filter(p => PROCESS_TEMPLATES[p]));
    
    // Remove instances for unselected processes
    const filteredInstances = processInstances.filter(instance => 
      selectedProcessTypes.has(instance.baseProcessName)
    );

    // Add new instances for newly selected processes
    const newInstances: ProcessInstance[] = [];
    selectedProcessTypes.forEach(processName => {
      if (!currentProcessTypes.has(processName)) {
        const template = PROCESS_TEMPLATES[processName];
        if (template) {
          const instanceNumber = (nextInstanceNumbers[processName] || 0) + 1;
          newInstances.push(createProcessInstance(processName, instanceNumber, template));
          
          setNextInstanceNumbers(prev => ({
            ...prev,
            [processName]: instanceNumber
          }));
        }
      }
    });

    if (filteredInstances.length !== processInstances.length || newInstances.length > 0) {
      const allInstances = [...filteredInstances, ...newInstances];
      // Reorder indices
      const reorderedInstances = allInstances.map((instance, index) => ({
        ...instance,
        orderIndex: index + 1
      }));
      setProcessInstances(reorderedInstances);
    }
  }, [selectedProcesses]);

  const createProcessInstance = (
    baseProcessName: string, 
    instanceNumber: number, 
    template: typeof PROCESS_TEMPLATES[string]
  ): ProcessInstance => {
    return {
      id: `${baseProcessName.toLowerCase().replace(/\s+/g, '-')}-${instanceNumber}-${Date.now()}`,
      baseProcessName,
      instanceNumber,
      displayName: `${baseProcessName} ${instanceNumber}`,
      machineType: template.machineType,
      setupTimeMinutes: template.setupTimeMinutes,
      cycleTimeMinutes: template.cycleTimeMinutes,
      description: `${template.description} (Setup ${instanceNumber})`,
      requiredMachineCapabilities: template.requiredMachineCapabilities,
      orderIndex: 0, // Will be set when added to array
      estimatedCost: 0,
      dependencies: []
    };
  };

  const addProcessInstance = (baseProcessName: string) => {
    const template = PROCESS_TEMPLATES[baseProcessName];
    if (!template) return;

    const instanceNumber = (nextInstanceNumbers[baseProcessName] || 0) + 1;
    const newInstance = createProcessInstance(baseProcessName, instanceNumber, template);
    newInstance.orderIndex = processInstances.length + 1;

    setProcessInstances(prev => [...prev, newInstance]);
    setNextInstanceNumbers(prev => ({
      ...prev,
      [baseProcessName]: instanceNumber
    }));
  };

  const removeProcessInstance = (instanceId: string) => {
    setProcessInstances(prev => {
      const filtered = prev.filter(p => p.id !== instanceId);
      return filtered.map((instance, index) => ({
        ...instance,
        orderIndex: index + 1
      }));
    });
  };

  const duplicateProcessInstance = (instanceId: string) => {
    const sourceInstance = processInstances.find(p => p.id === instanceId);
    if (!sourceInstance) return;

    const instanceNumber = (nextInstanceNumbers[sourceInstance.baseProcessName] || 0) + 1;
    const duplicatedInstance: ProcessInstance = {
      ...sourceInstance,
      id: `${sourceInstance.baseProcessName.toLowerCase().replace(/\s+/g, '-')}-${instanceNumber}-${Date.now()}`,
      instanceNumber,
      displayName: `${sourceInstance.baseProcessName} ${instanceNumber}`,
      description: `${sourceInstance.description.split(' (Setup')[0]} (Setup ${instanceNumber})`,
      orderIndex: processInstances.length + 1
    };

    setProcessInstances(prev => [...prev, duplicatedInstance]);
    setNextInstanceNumbers(prev => ({
      ...prev,
      [sourceInstance.baseProcessName]: instanceNumber
    }));
  };

  const moveProcessInstance = (instanceId: string, direction: 'up' | 'down') => {
    setProcessInstances(prev => {
      const currentIndex = prev.findIndex(p => p.id === instanceId);
      if (currentIndex === -1) return prev;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newOrder = [...prev];
      [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
      
      return newOrder.map((instance, index) => ({
        ...instance,
        orderIndex: index + 1
      }));
    });
  };

  const updateProcessInstance = (instanceId: string, field: keyof ProcessInstance, value: any) => {
    setProcessInstances(prev => prev.map(instance => 
      instance.id === instanceId ? { ...instance, [field]: value } : instance
    ));
  };

  // Immediate propagation of changes to ensure data persistence
  useEffect(() => {
    if (processInstances.length > 0) {
      const totalTimeMinutes = processInstances.reduce((sum, instance) => {
        return sum + instance.setupTimeMinutes + (instance.cycleTimeMinutes * quantity);
      }, 0);

      const totalCost = processInstances.reduce((sum, instance) => sum + (instance.estimatedCost || 0), 0);

      // Immediately notify parent of changes
      onPlanningDataChange({
        processes: processInstances,
        estimatedTotalTimeMinutes: totalTimeMinutes,
        estimatedTotalCost: totalCost
      });
    }
  }, [processInstances, quantity, onPlanningDataChange]);

  // Calculate costs and totals
  useEffect(() => {
    if (processInstances.length === 0) {
      onPlanningDataChange({
        processes: [],
        estimatedTotalTimeMinutes: 0,
        estimatedTotalCost: 0
      });
      return;
    }

    const processesWithCosts = processInstances.map(instance => {
      const machineType = instance.machineType;
      const availableMachines = machines.filter(m => m.type === machineType && m.isActive);
      const avgHourlyRate = availableMachines.length > 0 
        ? availableMachines.reduce((sum, m) => sum + (m.hourlyRate || 0), 0) / availableMachines.length
        : 50; // Default rate

      const totalTimeMinutes = instance.setupTimeMinutes + (instance.cycleTimeMinutes * quantity);
      const totalTimeHours = totalTimeMinutes / 60;
      const estimatedCost = totalTimeHours * avgHourlyRate;

      return {
        ...instance,
        estimatedCost
      };
    });

    const totalTimeMinutes = processesWithCosts.reduce((sum, instance) => {
      return sum + instance.setupTimeMinutes + (instance.cycleTimeMinutes * quantity);
    }, 0);

    const totalCost = processesWithCosts.reduce((sum, instance) => sum + (instance.estimatedCost || 0), 0);

    setProcessInstances(processesWithCosts);
    onPlanningDataChange({
      processes: processesWithCosts,
      estimatedTotalTimeMinutes: totalTimeMinutes,
      estimatedTotalCost: totalCost
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, machines.length, processInstances.length, 
      processInstances.map(p => p.setupTimeMinutes + p.cycleTimeMinutes).join(',')]);

  const getMachineTypeColor = (type: MachineType) => {
    switch (type) {
      case 'turning': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'milling': return 'bg-green-100 text-green-700 border-green-300';
      case '5-axis': return 'bg-purple-100 text-purple-700 border-purple-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const totalTime = processInstances.reduce((sum, instance) => 
    sum + instance.setupTimeMinutes + (instance.cycleTimeMinutes * quantity), 0);
  
  const totalCost = processInstances.reduce((sum, instance) => sum + (instance.estimatedCost || 0), 0);

  const availableProcessTypes = Object.keys(PROCESS_TEMPLATES).filter(processName => 
    selectedProcesses.includes(processName)
  );

  if (selectedProcesses.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select machining processes above to configure production planning</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-blue-600" />
            Enhanced Production Planning
            <Badge variant="outline" className="ml-2">
              {processInstances.length} operation{processInstances.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
        
        {/* Quick Summary */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Time</div>
            <div className="font-semibold text-blue-600">{formatTime(totalTime)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Est. Cost</div>
            <div className="font-semibold text-green-600">€{totalCost.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Quantity</div>
            <div className="font-semibold">{quantity} pcs</div>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            {/* Add Process Instance Controls */}
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm font-medium mb-2 w-full">Add Operation:</Label>
              {availableProcessTypes.map(processName => (
                <Button
                  key={processName}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addProcessInstance(processName)}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {processName}
                </Button>
              ))}
            </div>

            {/* Process Instances Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Machine Type</TableHead>
                  <TableHead>Setup Time</TableHead>
                  <TableHead>Cycle Time</TableHead>
                  <TableHead>Total Time</TableHead>
                  <TableHead>Est. Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processInstances.map((instance, index) => (
                  <TableRow key={instance.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-blue-600">{instance.orderIndex}</span>
                        <div className="flex flex-col">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => moveProcessInstance(instance.id, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => moveProcessInstance(instance.id, 'down')}
                            disabled={index === processInstances.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{instance.displayName}</div>
                        <div className="text-xs text-muted-foreground">{instance.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getMachineTypeColor(instance.machineType)}>
                        {instance.machineType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={instance.setupTimeMinutes}
                          onChange={(e) => updateProcessInstance(instance.id, 'setupTimeMinutes', parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={instance.cycleTimeMinutes}
                          onChange={(e) => updateProcessInstance(instance.id, 'cycleTimeMinutes', parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">min/pc</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatTime(instance.setupTimeMinutes + (instance.cycleTimeMinutes * quantity))}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      €{(instance.estimatedCost || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateProcessInstance(instance.id)}
                          className="h-6 w-6 p-0"
                          title="Duplicate"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProcessInstance(instance.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          title="Remove"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {processInstances.length > 1 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Operation Sequence</p>
                    <p className="text-blue-700">
                      Operations will be executed in the order shown. Use the up/down arrows to reorder operations as needed for your specific part requirements.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
} 