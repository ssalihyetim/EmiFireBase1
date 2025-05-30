"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Wrench, TrendingUp, AlertTriangle, BarChart3, Users, Zap } from "lucide-react";
import { Link } from "@/navigation";
import type { WorkloadSummary, Machine, ScheduleEntry, RealTimeMachineStatus } from "@/types/planning";
import { Badge } from "@/components/ui/badge";

export default function PlanningDashboard() {
  const [workloadSummary, setWorkloadSummary] = useState<WorkloadSummary[]>([]);
  const [upcomingSchedule, setUpcomingSchedule] = useState<ScheduleEntry[]>([]);
  const [machineStatuses, setMachineStatuses] = useState<RealTimeMachineStatus[]>([]);

  // Mock data for demonstration - this would be fetched from Firebase in real implementation
  useEffect(() => {
    const mockWorkload: WorkloadSummary[] = [
      {
        machineId: "nex110",
        machineName: "NEX110",
        machineType: "turning",
        weeklySchedule: [
          { week: "2024-W01", scheduledHours: 32, availableHours: 40, utilizationPercentage: 80, scheduledJobs: 12 },
          { week: "2024-W02", scheduledHours: 28, availableHours: 40, utilizationPercentage: 70, scheduledJobs: 8 },
        ]
      },
      {
        machineId: "fanuc",
        machineName: "Fanuc Robodrill",
        machineType: "5-axis",
        weeklySchedule: [
          { week: "2024-W01", scheduledHours: 38, availableHours: 40, utilizationPercentage: 95, scheduledJobs: 6 },
          { week: "2024-W02", scheduledHours: 40, availableHours: 40, utilizationPercentage: 100, scheduledJobs: 8 },
        ]
      },
      {
        machineId: "awea",
        machineName: "AWEA VP-1000",
        machineType: "milling",
        weeklySchedule: [
          { week: "2024-W01", scheduledHours: 35, availableHours: 40, utilizationPercentage: 87, scheduledJobs: 10 },
          { week: "2024-W02", scheduledHours: 30, availableHours: 40, utilizationPercentage: 75, scheduledJobs: 7 },
        ]
      }
    ];

    const mockMachineStatuses: RealTimeMachineStatus[] = [
      { machineId: "nex110", status: "running", currentJobId: "job-001", currentJobName: "Flange XF-100", progress: 65, estimatedCompletion: "2024-01-15T14:30:00Z", lastUpdate: new Date().toISOString() },
      { machineId: "fanuc", status: "setup", currentJobId: "job-002", currentJobName: "Complex Part", progress: 0, lastUpdate: new Date().toISOString() },
      { machineId: "awea", status: "idle", lastUpdate: new Date().toISOString() },
      { machineId: "tnc2000", status: "running", currentJobId: "job-003", currentJobName: "Shaft Assembly", progress: 40, estimatedCompletion: "2024-01-15T16:00:00Z", lastUpdate: new Date().toISOString() },
    ];
    
    setWorkloadSummary(mockWorkload);
    setMachineStatuses(mockMachineStatuses);
  }, []);

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600 bg-red-50 border-red-200";
    if (percentage >= 75) return "text-orange-600 bg-orange-50 border-orange-200";
    if (percentage >= 50) return "text-green-600 bg-green-50 border-green-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return "bg-green-100 text-green-700 border-green-300";
      case 'setup': return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case 'idle': return "bg-gray-100 text-gray-700 border-gray-300";
      case 'maintenance': return "bg-orange-100 text-orange-700 border-orange-300";
      case 'issue': return "bg-red-100 text-red-700 border-red-300";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const averageUtilization = workloadSummary.length > 0 
    ? Math.round(workloadSummary.reduce((acc, machine) => 
        acc + machine.weeklySchedule[0]?.utilizationPercentage || 0, 0) / workloadSummary.length)
    : 0;

  const overloadedMachines = workloadSummary.filter(machine => 
    machine.weeklySchedule[0]?.utilizationPercentage >= 90).length;

  const totalScheduledHours = workloadSummary.reduce((acc, machine) => 
    acc + (machine.weeklySchedule[0]?.scheduledHours || 0), 0);

  const runningMachines = machineStatuses.filter(machine => machine.status === 'running').length;

  return (
    <div>
      <PageHeader
        title="Production Planning Dashboard"
        description="Monitor and manage your CNC machining workload in real-time"
        actions={
          <div className="flex gap-2">
            <Link href="/planning/machines">
              <Button variant="outline">
                <Wrench className="mr-2 h-4 w-4" />
                Manage Machines
              </Button>
            </Link>
            <Link href="/planning/schedule">
              <Button>
                <Calendar className="mr-2 h-4 w-4" />
                View Schedule
              </Button>
            </Link>
          </div>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningMachines}</div>
            <p className="text-xs text-muted-foreground">Machines currently running</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageUtilization}%</div>
            <p className="text-xs text-muted-foreground">Across all machines</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overloaded Machines</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overloadedMachines}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScheduledHours}h</div>
            <p className="text-xs text-muted-foreground">Total scheduled time</p>
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Machine Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Real-Time Machine Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {machineStatuses.map((machine) => (
              <Card key={machine.machineId} className="border">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">{machine.machineId.toUpperCase()}</div>
                    <Badge className={getStatusColor(machine.status)}>
                      {machine.status}
                    </Badge>
                  </div>
                  {machine.currentJobName && (
                    <div className="text-xs text-muted-foreground mb-2">
                      {machine.currentJobName}
                    </div>
                  )}
                  {machine.progress !== undefined && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span>{machine.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${machine.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {machine.estimatedCompletion && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Est. completion: {new Date(machine.estimatedCompletion).toLocaleTimeString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workload Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Machine Workload Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workloadSummary.map((machine) => (
              <div key={machine.machineId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{machine.machineName}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{machine.machineType} machine</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {machine.weeklySchedule.map((week) => (
                    <div key={week.week} className={`p-3 rounded border ${getUtilizationColor(week.utilizationPercentage)}`}>
                      <div className="font-medium">{week.week}</div>
                      <div className="text-sm">
                        {week.scheduledHours}h / {week.availableHours}h ({week.utilizationPercentage}%)
                      </div>
                      <div className="text-xs">{week.scheduledJobs} jobs scheduled</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/planning/auto-schedule">
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <h3 className="font-medium">Auto Schedule</h3>
                    <p className="text-sm text-muted-foreground">Automatically plan upcoming jobs</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/offers">
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <h3 className="font-medium">Review Offers</h3>
                    <p className="text-sm text-muted-foreground">Add planning data to offers</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/planning/reports">
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <h3 className="font-medium">View Reports</h3>
                    <p className="text-sm text-muted-foreground">Analyze performance metrics</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 