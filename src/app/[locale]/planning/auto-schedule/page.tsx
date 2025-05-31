"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Settings, Play, BarChart3, CheckCircle, XCircle, AlertTriangle, Bug, Activity, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ProcessInstance, ScheduleResult } from "@/types/planning";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AutoSchedulePage() {
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);
  const [processInstances, setProcessInstances] = useState<ProcessInstance[]>([]);
  const [machineData, setMachineData] = useState<any>(null);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Load available process instances (would come from offers/orders in real implementation)
  useEffect(() => {
    // Mock data for demonstration
    const mockProcessInstances: ProcessInstance[] = [
      {
        id: "process_1",
        baseProcessName: "Turning",
        instanceNumber: 1,
        displayName: "Turning 1",
        machineType: "turning",
        setupTimeMinutes: 30,
        cycleTimeMinutes: 5,
        description: "Initial turning operation",
        requiredMachineCapabilities: ["high_precision"],
        orderIndex: 1,
        estimatedCost: 150,
        dependencies: [],
        quantity: 10,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        customerPriority: "high",
        offerId: "offer_123"
      },
      {
        id: "process_2",
        baseProcessName: "Milling",
        instanceNumber: 1,
        displayName: "Milling 1",
        machineType: "milling",
        setupTimeMinutes: 45,
        cycleTimeMinutes: 8,
        description: "CNC milling operation",
        requiredMachineCapabilities: ["3_axis"],
        orderIndex: 2,
        estimatedCost: 200,
        dependencies: ["process_1"],
        quantity: 10,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        customerPriority: "medium",
        offerId: "offer_123"
      },
      {
        id: "process_simple",
        baseProcessName: "Simple Turn",
        instanceNumber: 1,
        displayName: "Simple Turn",
        machineType: "turning",
        setupTimeMinutes: 15,
        cycleTimeMinutes: 2,
        description: "Simple test operation",
        requiredMachineCapabilities: [],
        orderIndex: 3,
        estimatedCost: 50,
        dependencies: [],
        quantity: 1,
        customerPriority: "medium",
        offerId: "test_123"
      }
    ];
    setProcessInstances(mockProcessInstances);
  }, []);

  const loadMachineData = async () => {
    setIsLoadingMachines(true);
    try {
      const response = await fetch('/api/test/machines');
      const data = await response.json();
      setMachineData(data);
      console.log('🔧 Machine data loaded:', data);
    } catch (error) {
      console.error('❌ Failed to load machine data:', error);
      toast({
        title: "Machine Data Error",
        description: "Failed to load machine data for debugging",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMachines(false);
    }
  };

  const handleRunAutoSchedule = async () => {
    if (processInstances.length === 0) {
      toast({
        title: "No Process Instances",
        description: "No process instances available for scheduling",
        variant: "destructive"
      });
      return;
    }

    setIsScheduling(true);
    console.log('🚀 Starting auto-schedule with process instances:', processInstances);
    
    try {
      const response = await fetch('/api/scheduling/auto-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ processInstances }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ScheduleResult = await response.json();
      console.log('📊 Scheduling result:', result);
      setScheduleResult(result);

      if (result.success) {
        setScheduleResult(result);
        toast({
          title: "Scheduling Complete",
          description: `Successfully scheduled ${result.entries.length} jobs`,
        });
      } else {
        toast({
          title: "Scheduling Failed",
          description: "Failed to run auto-schedule. Please check the console for details.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('💥 Auto-scheduling failed:', error);
      toast({
        title: "Scheduling Failed",
        description: "Failed to run auto-scheduling algorithm",
        variant: "destructive"
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const testSingleProcess = async () => {
    const simpleProcess = processInstances.find(p => p.id === "process_simple");
    if (!simpleProcess) return;

    console.log('🧪 Testing single simple process:', simpleProcess);
    setIsScheduling(true);
    
    try {
      const response = await fetch('/api/scheduling/auto-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ processInstances: [simpleProcess] }),
      });

      const result: ScheduleResult = await response.json();
      console.log('🧪 Single process result:', result);
      setScheduleResult(result);
    } catch (error) {
      console.error('❌ Single process test failed:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleScheduleSettings = () => {
    toast({
      title: "Schedule Settings",
      description: "Schedule configuration options will be available in the next update.",
    });
  };

  return (
    <div>
      <PageHeader
        title="Auto Schedule"
        description="Automatically optimize your production schedule based on machine capabilities and dependencies"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleScheduleSettings}>
              <Settings className="mr-2 h-4 w-4" />
              Schedule Settings
            </Button>
            <Button 
              onClick={handleRunAutoSchedule}
              disabled={isScheduling || processInstances.length === 0}
            >
              {isScheduling ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Auto Schedule
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Debug Section */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Bug className="h-5 w-5" />
            Debug & Testing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Button 
              onClick={loadMachineData}
              disabled={isLoadingMachines}
              variant="outline"
              size="sm"
            >
              {isLoadingMachines ? "Loading..." : "Load Machine Data"}
            </Button>
            <Button 
              onClick={testSingleProcess}
              disabled={isScheduling}
              variant="outline"
              size="sm"
            >
              Test Simple Process
            </Button>
          </div>
          
          {machineData && (
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium mb-2">Machine Database Status</h5>
              <p className="text-sm">
                ✅ <strong>{machineData.machineCount} machines</strong> found in database
              </p>
              <div className="mt-2 text-xs">
                <strong>Turning machines:</strong> {machineData.machines.filter((m: any) => m.type === 'turning').length} |{' '}
                <strong>Milling machines:</strong> {machineData.machines.filter((m: any) => m.type === 'milling').length} |{' '}
                <strong>5-axis machines:</strong> {machineData.machines.filter((m: any) => m.type === '5-axis').length}
              </div>
              <details className="mt-2">
                <summary className="text-xs cursor-pointer">View first 3 machines</summary>
                <pre className="text-xs mt-1 bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(machineData.machines.slice(0, 3), null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process Instances Ready for Scheduling */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Ready for Scheduling ({processInstances.length} processes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processInstances.length > 0 ? (
            <div className="space-y-3">
              {processInstances.map((process) => (
                <div key={process.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-medium">{process.displayName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {process.machineType} • {process.quantity} units • 
                      {process.setupTimeMinutes + (process.cycleTimeMinutes * process.quantity)} min total •
                      Capabilities: [{process.requiredMachineCapabilities.join(', ') || 'none'}]
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={process.customerPriority === 'high' ? 'destructive' : 'default'}>
                      {process.customerPriority}
                    </Badge>
                    <Badge variant="outline">
                      {process.machineType}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No process instances available for scheduling.
              <br />
              Create offers with planning data to enable auto-scheduling.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduling Progress */}
      {isScheduling && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Scheduling in Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={50} className="w-full" />
              <p className="text-sm text-muted-foreground">
                Analyzing process dependencies and machine availability...
                <br />
                <strong>Check browser console (F12) for detailed logs</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {scheduleResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {scheduleResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Scheduling Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 border rounded">
                <div className="text-2xl font-bold">{scheduleResult.entries.length}</div>
                <div className="text-sm text-muted-foreground">Jobs Scheduled</div>
              </div>
              <div className="p-4 border rounded">
                <div className="text-2xl font-bold">{scheduleResult.conflicts.length}</div>
                <div className="text-sm text-muted-foreground">Conflicts</div>
              </div>
              <div className="p-4 border rounded">
                <div className="text-2xl font-bold">{scheduleResult.metrics.averageUtilization}%</div>
                <div className="text-sm text-muted-foreground">Avg. Utilization</div>
              </div>
              <div className="p-4 border rounded">
                <div className="text-2xl font-bold">{scheduleResult.metrics.schedulingDurationMs}ms</div>
                <div className="text-sm text-muted-foreground">Processing Time</div>
              </div>
            </div>

            {scheduleResult.conflicts.length > 0 && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Conflicts detected:</strong>
                  <ul className="mt-2 list-disc list-inside">
                    {scheduleResult.conflicts.map((conflict, index) => (
                      <li key={index}>{conflict.description}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {scheduleResult.entries.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Scheduled Jobs</h4>
                  <Link href="/planning/schedule">
                    <Button variant="outline" size="sm">
                      <Calendar className="mr-2 h-4 w-4" />
                      View Full Schedule
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="space-y-2">
                  {scheduleResult.entries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h5 className="font-medium">{entry.partName}</h5>
                        <p className="text-sm text-muted-foreground">
                          Machine: {entry.machineName} • 
                          Start: {new Date(entry.scheduledStartTime).toLocaleString()} • 
                          End: {new Date(entry.scheduledEndTime).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={entry.status === 'scheduled' ? 'default' : 'secondary'}>
                        {entry.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Algorithm Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🤖 Algorithm Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Process dependency resolution</li>
              <li>• Machine capability matching</li>
              <li>• Load balancing across machines</li>
              <li>• Priority and deadline optimization</li>
              <li>• Setup time minimization</li>
              <li>• Bottleneck identification</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">📊 Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>✅ Phase 0: Foundation fixes complete</li>
              <li>🚀 Phase 1: Core infrastructure 80% complete</li>
              <li>🔧 Database: {machineData ? `${machineData.machineCount} machines seeded` : 'Not loaded'}</li>
              <li>🧪 Testing: Enhanced debugging active</li>
              <li>📊 Scheduling: Working with priority-based assignment</li>
              <li>🎯 Next: Complete availability calculation fixes</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 