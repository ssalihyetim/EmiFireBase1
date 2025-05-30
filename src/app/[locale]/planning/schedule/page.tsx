"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Settings, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SchedulePage() {
  return (
    <div>
      <PageHeader
        title="Production Schedule"
        description="View and manage your CNC machining schedule and job assignments"
        actions={
          <div className="flex gap-2">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Schedule Settings
            </Button>
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Auto Schedule
            </Button>
          </div>
        }
      />

      {/* Coming Soon Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Schedule Management Coming Soon</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              The production schedule interface will be available in the next phase. 
              This will include Gantt charts, dependency management, and real-time schedule optimization.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="outline">Gantt Chart View</Badge>
              <Badge variant="outline">Dependency Tracking</Badge>
              <Badge variant="outline">Auto-Scheduling</Badge>
              <Badge variant="outline">Real-time Updates</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🎯 Planned Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Visual timeline of all machine schedules</li>
              <li>• Drag-and-drop job reordering</li>
              <li>• Dependency chain visualization</li>
              <li>• Capacity and bottleneck analysis</li>
              <li>• Real-time progress updates</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">⚡ Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Clock className="mr-2 h-4 w-4" />
                View Today's Schedule
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                Week View
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Configure Working Hours
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 