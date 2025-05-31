"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, Settings, Play, RefreshCw, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ScheduleEntry {
  id: string;
  machineId: string;
  machineName: string;
  partName: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'delayed';
  quantity: number;
}

export default function SchedulePage() {
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [machineCount, setMachineCount] = useState(0);
  const { toast } = useToast();
  const router = useRouter();

  const fetchSchedule = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/scheduling/get-schedule');
      
      if (!response.ok) {
        throw new Error('Failed to fetch schedule');
      }

      const data = await response.json();
      setScheduleEntries(data.entries || []);
      setMachineCount(data.machineCount || 0);

    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast({
        title: "Error",
        description: "Failed to load schedule data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoSchedule = () => {
    router.push('/planning/auto-schedule');
  };

  const handleScheduleSettings = () => {
    toast({
      title: "Schedule Settings",
      description: "Schedule configuration will be available in the next update.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'delayed': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  return (
    <div>
      <PageHeader
        title="Production Schedule"
        description="View and manage your CNC machining schedule and job assignments"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleScheduleSettings}>
              <Settings className="mr-2 h-4 w-4" />
              Schedule Settings
            </Button>
            <Link href="/planning/auto-schedule">
              <Button onClick={handleAutoSchedule}>
                <Play className="mr-2 h-4 w-4" />
                Auto Schedule
              </Button>
            </Link>
          </div>
        }
      />

      {/* Schedule Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Machines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{machineCount}</div>
            <div className="text-sm text-muted-foreground">Available for scheduling</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduleEntries.length}</div>
            <div className="text-sm text-muted-foreground">Scheduled operations</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scheduleEntries.filter(entry => entry.status === 'in_progress').length}
            </div>
            <div className="text-sm text-muted-foreground">Currently running</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scheduleEntries.filter(entry => entry.status === 'scheduled').length}
            </div>
            <div className="text-sm text-muted-foreground">Awaiting execution</div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Production Schedule
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSchedule}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="text-muted-foreground">Loading schedule...</div>
            </div>
          ) : scheduleEntries.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Schedule Entries</h3>
              <p className="text-muted-foreground mb-6">
                Create your first schedule using the auto-scheduler.
              </p>
              <Link href="/planning/auto-schedule">
                <Button>
                  <Play className="mr-2 h-4 w-4" />
                  Run Auto Schedule
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleEntries.map((entry) => {
                  const startTime = formatDateTime(entry.scheduledStartTime);
                  const endTime = formatDateTime(entry.scheduledEndTime);
                  const start = new Date(entry.scheduledStartTime);
                  const end = new Date(entry.scheduledEndTime);
                  const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes

                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.machineName}</TableCell>
                      <TableCell>{entry.partName}</TableCell>
                      <TableCell>{entry.quantity}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{startTime.date}</div>
                          <div className="text-muted-foreground">{startTime.time}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{endTime.date}</div>
                          <div className="text-muted-foreground">{endTime.time}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {duration >= 60 
                            ? `${Math.floor(duration / 60)}h ${duration % 60}m`
                            : `${duration}m`
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(entry.status)}>
                          {entry.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 