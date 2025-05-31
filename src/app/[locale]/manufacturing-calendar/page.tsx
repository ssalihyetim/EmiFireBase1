'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarView } from '@/components/calendar/CalendarView';
import { ResourcePanel } from '@/components/calendar/ResourcePanel';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { ConflictResolver } from '@/components/calendar/ConflictResolver';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, Wrench, AlertTriangle, TrendingUp } from 'lucide-react';
import { CalendarEvent, ResourceAllocation, ScheduleConflict, ConflictResolution } from '@/types/calendar';
import { loadCalendarEvents, loadResourceAllocations, detectScheduleConflicts } from '@/lib/calendar-integration';
import { toast } from 'sonner';

type CalendarViewType = 'week' | 'month' | 'day';

export default function ManufacturingCalendarPage() {
  const t = useTranslations('ManufacturingCalendar');
  
  // State management
  const [currentView, setCurrentView] = useState<CalendarViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [resourceAllocations, setResourceAllocations] = useState<ResourceAllocation[]>([]);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Load calendar data
  useEffect(() => {
    loadCalendarData();
  }, [currentDate, currentView]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on current view
      const dateRange = getDateRangeForView(currentDate, currentView);
      
      // Load data in parallel
      const [eventsData, allocationsData] = await Promise.all([
        loadCalendarEvents(dateRange.start, dateRange.end),
        loadResourceAllocations(dateRange.start, dateRange.end)
      ]);
      
      setEvents(eventsData);
      setResourceAllocations(allocationsData);
      
      // Detect conflicts
      const conflictsData = await detectScheduleConflicts(eventsData, allocationsData);
      setConflicts(conflictsData);
      
    } catch (error) {
      console.error('Error loading calendar data:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeForView = (date: Date, view: CalendarViewType) => {
    const start = new Date(date);
    const end = new Date(date);
    
    switch (view) {
      case 'day':
        end.setDate(start.getDate() + 1);
        break;
      case 'week':
        start.setDate(date.getDate() - date.getDay()); // Start of week
        end.setDate(start.getDate() + 7);
        break;
      case 'month':
        start.setDate(1); // Start of month
        end.setMonth(start.getMonth() + 1);
        end.setDate(0); // End of month
        break;
    }
    
    return { start, end };
  };

  const handleEventUpdate = async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      // Update event in database
      // await updateCalendarEvent(eventId, updates);
      
      // Update local state
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, ...updates } : event
      ));
      
      toast.success('Event updated successfully');
      
      // Reload to check for new conflicts
      loadCalendarData();
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  };

  const handleResourceReallocation = async (allocationId: string, newResourceId: string) => {
    try {
      // Update resource allocation
      // await updateResourceAllocation(allocationId, { resourceId: newResourceId });
      
      // Update local state
      setResourceAllocations(prev => prev.map(allocation =>
        allocation.id === allocationId ? { ...allocation, resourceId: newResourceId } : allocation
      ));
      
      toast.success('Resource reallocated successfully');
      loadCalendarData();
    } catch (error) {
      console.error('Error reallocating resource:', error);
      toast.error('Failed to reallocate resource');
    }
  };

  // Calculate summary statistics
  const summaryStats = {
    totalEvents: events.length,
    activeJobs: events.filter(e => e.type === 'job' && e.status === 'in_progress').length,
    scheduledJobs: events.filter(e => e.type === 'job' && e.status === 'scheduled').length,
    conflicts: conflicts.length,
    machineUtilization: calculateMachineUtilization(resourceAllocations),
    upcomingDeadlines: events.filter(e => e.type === 'deadline' && new Date(e.startTime.toDate()) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length
  };

  function calculateMachineUtilization(allocations: ResourceAllocation[]): number {
    if (allocations.length === 0) return 0;
    
    const machineAllocations = allocations.filter(a => a.resourceType === 'machine');
    const totalHours = machineAllocations.reduce((sum, allocation) => {
      const duration = allocation.endTime.toDate().getTime() - allocation.startTime.toDate().getTime();
      return sum + (duration / (1000 * 60 * 60)); // Convert to hours
    }, 0);
    
    // Assuming 8 hours per day, 5 days per week for each machine
    const availableHours = 8 * 5 * 21; // 21 machines
    return Math.min(100, (totalHours / availableHours) * 100);
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title', { defaultMessage: 'Manufacturing Calendar' })}</h1>
          <p className="text-muted-foreground">
            {t('subtitle', { defaultMessage: 'Visual scheduling and resource management' })}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => loadCalendarData()}>
            <Clock className="h-4 w-4 mr-2" />
            {t('refresh', { defaultMessage: 'Refresh' })}
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalEvents', { defaultMessage: 'Total Events' })}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeJobs', { defaultMessage: 'Active Jobs' })}</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.activeJobs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('scheduledJobs', { defaultMessage: 'Scheduled Jobs' })}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.scheduledJobs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('conflicts', { defaultMessage: 'Conflicts' })}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.conflicts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('machineUtilization', { defaultMessage: 'Machine Utilization' })}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{summaryStats.machineUtilization.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('upcomingDeadlines', { defaultMessage: 'Upcoming Deadlines' })}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summaryStats.upcomingDeadlines}</div>
          </CardContent>
        </Card>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {t('conflictsDetected', { defaultMessage: 'Schedule Conflicts Detected' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conflicts.slice(0, 3).map((conflict, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-red-700">{conflict.description}</span>
                  <Badge variant="destructive">{conflict.severity}</Badge>
                </div>
              ))}
              {conflicts.length > 3 && (
                <p className="text-sm text-red-600">
                  {t('moreConflicts', { count: conflicts.length - 3, defaultMessage: 'And {count} more conflicts...' })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Calendar Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CalendarHeader
                currentDate={currentDate}
                currentView={currentView}
                onDateChange={setCurrentDate}
                onViewChange={setCurrentView}
                onRefresh={loadCalendarData}
              />
            </CardHeader>
            <CardContent>
              <CalendarView
                view={currentView}
                currentDate={currentDate}
                events={events}
                resourceAllocations={resourceAllocations}
                conflicts={conflicts}
                loading={loading}
                onEventUpdate={handleEventUpdate}
                onEventSelect={setSelectedEvent}
                onResourceReallocation={handleResourceReallocation}
              />
            </CardContent>
          </Card>
        </div>

        {/* Resource Panel */}
        <div className="lg:col-span-1">
          <ResourcePanel
            resourceAllocations={resourceAllocations}
            conflicts={conflicts}
            onResourceReallocation={handleResourceReallocation}
          />
        </div>
      </div>

      {/* Conflict Resolver Modal */}
      {conflicts.length > 0 && (
        <ConflictResolver
          conflicts={conflicts}
          events={events}
          resourceAllocations={resourceAllocations}
          onResolveConflict={(conflictId: string, resolution: ConflictResolution) => {
            // Handle conflict resolution
            console.log('Resolving conflict:', conflictId, resolution);
            loadCalendarData();
          }}
        />
      )}

      {/* Tabs for Additional Views */}
      <Tabs defaultValue="schedule" className="w-full">
        <TabsList>
          <TabsTrigger value="schedule">{t('scheduleView', { defaultMessage: 'Schedule View' })}</TabsTrigger>
          <TabsTrigger value="resources">{t('resourceView', { defaultMessage: 'Resource View' })}</TabsTrigger>
          <TabsTrigger value="analytics">{t('analyticsView', { defaultMessage: 'Analytics View' })}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('scheduleOverview', { defaultMessage: 'Schedule Overview' })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {event.startTime.toDate().toLocaleDateString()} - {event.endTime.toDate().toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={event.status === 'completed' ? 'default' : event.status === 'in_progress' ? 'secondary' : 'outline'}>
                      {event.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('resourceUtilization', { defaultMessage: 'Resource Utilization' })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Resource utilization charts and data would go here */}
                <p className="text-muted-foreground">
                  {t('resourceUtilizationDescription', { defaultMessage: 'Detailed resource utilization analytics and charts will be displayed here.' })}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('performanceAnalytics', { defaultMessage: 'Performance Analytics' })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Performance analytics charts would go here */}
                <p className="text-muted-foreground">
                  {t('performanceAnalyticsDescription', { defaultMessage: 'Performance metrics, trends, and analytics will be displayed here.' })}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 