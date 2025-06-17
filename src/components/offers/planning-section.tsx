"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Clock, Zap, Calculator, AlertTriangle } from "lucide-react";
import type { MachiningProcess, MachineType, Machine } from "@/types/planning";
import { useToast } from "@/hooks/use-toast";

// Process templates with default times (in minutes)
const PROCESS_TEMPLATES: Record<string, Partial<MachiningProcess>> = {
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

// Define dependencies (what processes must come before others)
const PROCESS_DEPENDENCIES: Record<string, string[]> = {
  "5-Axis Milling": ["Turning", "3-Axis Milling"],
  "4-Axis Milling": ["Turning"],
  "Grinding": ["Turning", "3-Axis Milling"],
  "Deburring": ["Turning", "3-Axis Milling", "4-Axis Milling", "5-Axis Milling"],
  "Quality Check": ["Turning", "3-Axis Milling", "4-Axis Milling", "5-Axis Milling"]
};

interface PlanningProcess extends MachiningProcess {
  orderIndex: number;
}

interface ProcessInstance {
  id: string;
  baseProcessName: string; // e.g., "Turning"
  instanceNumber: number; // e.g., 1, 2, 3
  displayName: string; // e.g., "Turning 1", "Turning 2"
  machineType: MachineType;
  setupTimeMinutes: number;
  cycleTimeMinutes: number;
  description: string;
  requiredMachineCapabilities: string[];
  orderIndex: number; // Manual ordering
  dependencies: string[]; // IDs of other process instances
  estimatedCost: number;
}

interface ProcessManager {
  instances: ProcessInstance[];
  nextInstanceNumbers: Record<string, number>; // Track next number for each process type
}

interface PlanningSectionProps {
  selectedProcesses: string[];
  quantity: number;
  onPlanningDataChange: (planningData: {
    processes: PlanningProcess[];
    estimatedTotalTimeMinutes: number;
    estimatedTotalCost: number;
  }) => void;
  machines?: Machine[]; // Available machines for cost calculation
}

export function PlanningSection({ 
  selectedProcesses, 
  quantity, 
  onPlanningDataChange, 
  machines = [] 
}: PlanningSectionProps) {
  const [planningProcesses, setPlanningProcesses] = useState<PlanningProcess[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  // Initialize planning processes when selected processes change
  useEffect(() => {
    if (selectedProcesses.length === 0) {
      setPlanningProcesses([]);
      return;
    }

    const newProcesses: PlanningProcess[] = selectedProcesses
      .map((processName, index) => {
        const template = PROCESS_TEMPLATES[processName];
        if (!template) return null;

        // ✅ FIXED: Use sequential order-based dependencies instead of process-type dependencies
        const dependencies: string[] = [];
        if (index > 0) {
          // This process depends on the previous process in the sequence
          dependencies.push(selectedProcesses[index - 1]);
        }

        return {
          id: `${processName}-${Date.now()}-${index}`,
          name: processName,
          machineType: template.machineType || "milling",
          setupTimeMinutes: template.setupTimeMinutes || 30,
          cycleTimeMinutes: template.cycleTimeMinutes || 10,
          description: template.description || `${processName} operation`,
          dependencies: dependencies,
          requiredMachineCapabilities: template.requiredMachineCapabilities || [],
          orderIndex: index,
          estimatedCost: 0
        } as PlanningProcess;
      })
      .filter(Boolean) as PlanningProcess[];

    // Processes are already in correct sequential order
    setPlanningProcesses(newProcesses);
  }, [selectedProcesses]);

  // Calculate costs and totals when processes or quantity change
  useEffect(() => {
    if (planningProcesses.length === 0) {
      onPlanningDataChange({
        processes: [],
        estimatedTotalTimeMinutes: 0,
        estimatedTotalCost: 0
      });
      return;
    }

    const processesWithCosts = planningProcesses.map(process => {
      const machineType = process.machineType;
      const availableMachines = machines.filter(m => m.type === machineType && m.isActive);
      const avgHourlyRate = availableMachines.length > 0 
        ? availableMachines.reduce((sum, m) => sum + (m.hourlyRate || 0), 0) / availableMachines.length
        : 50; // Default rate

      const totalTimeMinutes = process.setupTimeMinutes + (process.cycleTimeMinutes * quantity);
      const totalTimeHours = totalTimeMinutes / 60;
      const estimatedCost = totalTimeHours * avgHourlyRate;

      return {
        ...process,
        estimatedCost
      };
    });

    const totalTimeMinutes = processesWithCosts.reduce((sum, process) => {
      return sum + process.setupTimeMinutes + (process.cycleTimeMinutes * quantity);
    }, 0);

    const totalCost = processesWithCosts.reduce((sum, process) => sum + (process.estimatedCost || 0), 0);

    onPlanningDataChange({
      processes: processesWithCosts,
      estimatedTotalTimeMinutes: totalTimeMinutes,
      estimatedTotalCost: totalCost
    });
  }, [planningProcesses, quantity, machines]);



  const updateProcess = (processId: string, field: keyof PlanningProcess, value: any) => {
    setPlanningProcesses(prev => prev.map(process => 
      process.id === processId ? { ...process, [field]: value } : process
    ));
  };

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

  const totalTime = planningProcesses.reduce((sum, process) => 
    sum + process.setupTimeMinutes + (process.cycleTimeMinutes * quantity), 0);
  
  const totalCost = planningProcesses.reduce((sum, process) => sum + (process.estimatedCost || 0), 0);

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
            Production Planning
            <Badge variant="outline" className="ml-2">
              {planningProcesses.length} process{planningProcesses.length !== 1 ? 'es' : ''}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Process</TableHead>
                  <TableHead>Machine Type</TableHead>
                  <TableHead>Setup Time</TableHead>
                  <TableHead>Cycle Time</TableHead>
                  <TableHead>Total Time</TableHead>
                  <TableHead>Est. Cost</TableHead>
                  <TableHead>Dependencies</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planningProcesses.map((process) => (
                  <TableRow key={process.id}>
                    <TableCell className="font-medium">{process.orderIndex}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{process.name}</div>
                        <div className="text-xs text-muted-foreground">{process.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getMachineTypeColor(process.machineType)}>
                        {process.machineType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={process.setupTimeMinutes}
                          onChange={(e) => updateProcess(process.id, 'setupTimeMinutes', parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={process.cycleTimeMinutes}
                          onChange={(e) => updateProcess(process.id, 'cycleTimeMinutes', parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">min/pc</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatTime(process.setupTimeMinutes + (process.cycleTimeMinutes * quantity))}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      €{(process.estimatedCost || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {process.dependencies?.map(dep => (
                          <Badge key={dep} variant="secondary" className="text-xs">
                            {dep}
                          </Badge>
                        ))}
                        {(!process.dependencies || process.dependencies.length === 0) && (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {planningProcesses.length > 1 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Process Dependencies</p>
                    <p className="text-blue-700">
                      The processes are automatically ordered based on their sequence. Each process depends on the completion of the previous process in the list.
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