"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Clock, 
  Settings, 
  Filter, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  BarChart3,
  Wrench,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { 
  CalendarEvent, 
  DayView, 
  WeekView, 
  CalendarFilter, 
  CalendarSettings, 
  defaultCalendarSettings 
} from "@/types/manufacturing-calendar";
import { 
  getDayView, 
  getWeekView, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent 
} from "@/lib/manufacturing-calendar";
import { CalendarStatsCard } from "@/components/manufacturing-calendar/StatsCard";

export default function ManufacturingCalendarPage() {
  const { toast } = useToast();
  
  // State management
  const [viewType, setViewType] = useState<'day' | 'week'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayView, setDayView] = useState<DayView | null>(null);
  const [weekView, setWeekView] = useState<WeekView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [filter, setFilter] = useState<CalendarFilter>({});
  const [settings, setSettings] = useState<CalendarSettings>(defaultCalendarSettings);
  const [lastSyncCheck, setLastSyncCheck] = useState<number>(0);
  
  // Dialog states
  const [showEventForm, setShowEventForm] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Load calendar data
  useEffect(() => {
    loadCalendarData();
  }, [currentDate, viewType, filter]);

  // Auto-refresh based on settings (but not during navigation)
  useEffect(() => {
    if (settings.refreshInterval > 0 && !isNavigating) {
      const interval = setInterval(() => {
        loadCalendarData(false); // Don't auto-sync on auto-refresh
      }, settings.refreshInterval * 1000);
      
      return () => clearInterval(interval);
    }
  }, [settings.refreshInterval, currentDate, viewType, filter, isNavigating]);

  const loadCalendarData = async (shouldCheckSync: boolean = true) => {
    if (!isNavigating) {
      setIsLoading(true);
    }
    
    try {
      if (viewType === 'day') {
        const dayData = await getDayView(currentDate, filter);
        setDayView(dayData);
        setWeekView(null);
      } else {
        // Calculate week start (Monday) with proper timezone handling
        const weekStart = getWeekStart(currentDate);
        console.log(`📅 Loading week data for: ${weekStart.toISOString()} to ${new Date(weekStart.getTime() + 6*24*60*60*1000).toISOString()}`);
        
        const weekData = await getWeekView(weekStart, filter);
        setWeekView(weekData);
        setDayView(null);
      }

      // Only auto-sync if needed and not done recently (prevent excessive syncing)
      if (shouldCheckSync) {
        const now = Date.now();
        if (now - lastSyncCheck > 30000) { // Only check sync every 30 seconds
          await checkAndAutoSync();
          setLastSyncCheck(now);
        }
      }
    } catch (error) {
      console.error('Failed to load calendar data:', error);
      toast({
        title: "Error Loading Calendar",
        description: "Could not load calendar data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsNavigating(false);
    }
  };

  const checkAndAutoSync = async () => {
    try {
      const syncStatusResponse = await fetch('/api/manufacturing-calendar/sync-schedule');
      const syncStatus = await syncStatusResponse.json();
      
      // Only auto-sync if there are operations but no calendar events
      if (syncStatus.success && syncStatus.lastSyncNeeded && syncStatus.scheduledOperationsCount > 0) {
        console.log('🔄 Auto-syncing scheduled operations to calendar...');
        await syncWithSchedule(false); // Silent sync
      }
    } catch (error) {
      console.log('Auto-sync check failed, continuing normally:', error);
    }
  };

  const syncWithSchedule = async (showToast: boolean = true) => {
    try {
      console.log('🔄 Syncing scheduled operations with calendar...');
      
      const syncResponse = await fetch('/api/manufacturing-calendar/sync-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const syncResult = await syncResponse.json();
      
      if (syncResult.success) {
        if (showToast) {
          toast({
            title: "Calendar Synced",
            description: `${syncResult.eventsCreated} manufacturing events synced successfully`,
          });
        }
        
        // Reload calendar data to show new events (without auto-sync check)
        await loadCalendarData(false);
      } else {
        throw new Error(syncResult.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Calendar sync failed:', error);
      if (showToast) {
        toast({
          title: "Sync Failed",
          description: error instanceof Error ? error.message : "Could not sync calendar",
          variant: "destructive",
        });
      }
    }
  };

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    // Ensure we're working with local time, not UTC
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setIsNavigating(true);
    const newDate = new Date(currentDate);
    
    if (viewType === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    } else {
      // Navigate by full weeks (7 days)
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    
    console.log(`🔄 Navigating ${direction} from ${currentDate.toISOString()} to ${newDate.toISOString()}`);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setIsNavigating(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentDate(today);
  };

  // Wrapper functions for button handlers
  const handleSyncClick = () => {
    syncWithSchedule(true);
  };

  const handleRefreshClick = () => {
    loadCalendarData(true);
  };

  const handleCreateEvent = async (eventData: any) => {
    try {
      await createCalendarEvent(eventData);
      await loadCalendarData();
      
      toast({
        title: "Event Created",
        description: `"${eventData.title}" has been scheduled successfully.`,
      });
      
      setShowEventForm(false);
    } catch (error) {
      console.error('Failed to create event:', error);
      toast({
        title: "Error Creating Event",
        description: "Could not create the calendar event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateEvent = async (eventId: string, updates: any) => {
    try {
      await updateCalendarEvent(eventId, updates);
      await loadCalendarData();
      
      toast({
        title: "Event Updated",
        description: "Event has been updated successfully.",
      });
      
      setEditingEvent(null);
    } catch (error) {
      console.error('Failed to update event:', error);
      toast({
        title: "Error Updating Event",
        description: "Could not update the event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteCalendarEvent(eventId);
      await loadCalendarData();
      
      toast({
        title: "Event Deleted",
        description: "Event has been removed from the calendar.",
      });
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast({
        title: "Error Deleting Event",
        description: "Could not delete the event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filter.machineIds?.length) count++;
    if (filter.eventTypes?.length) count++;
    if (filter.operators?.length) count++;
    if (filter.priorities?.length) count++;
    if (filter.statuses?.length) count++;
    if (filter.jobIds?.length) count++;
    return count;
  };

  const formatDateRange = () => {
    if (viewType === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else {
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      return `${weekStart.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })} - ${weekEnd.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`;
    }
  };

  const getStats = () => {
    if (viewType === 'day' && dayView) {
      return {
        totalEvents: dayView.events.length,
        manufacturingEvents: dayView.events.filter(e => e.type === 'manufacturing').length,
        maintenanceEvents: dayView.events.filter(e => e.type === 'maintenance').length,
        averageUtilization: Math.round(
          dayView.machines.reduce((sum, m) => sum + m.utilization, 0) / 
          Math.max(1, dayView.machines.length)
        ),
        completedEvents: dayView.events.filter(e => e.status === 'completed').length,
        delayedEvents: dayView.events.filter(e => e.status === 'delayed').length,
      };
    } else if (viewType === 'week' && weekView) {
      return weekView.weeklyStats;
    }
    
    return {
      totalEvents: 0,
      manufacturingEvents: 0,
      maintenanceEvents: 0,
      averageUtilization: 0,
      completedEvents: 0,
      delayedEvents: 0,
    };
  };

  const renderDayView = () => {
    if (!dayView) return null;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dayView.machines.map(machine => (
            <Card key={machine.machineId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{machine.machineName}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={machine.isActive ? "default" : "secondary"}>
                    {machine.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {machine.utilization}% utilization
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {machine.events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events scheduled</p>
                  ) : (
                    machine.events.map(event => (
                      <div key={event.id} className="p-2 bg-blue-50 rounded-md cursor-pointer hover:bg-blue-100"
                           onClick={() => setEditingEvent(event)}>
                        <div className="font-medium text-sm">{event.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(event.startTime).toLocaleTimeString()} - {new Date(event.endTime).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    if (!weekView) return null;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-sm bg-gray-50 rounded-t-md">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 min-h-[400px]">
          {weekView.days.map((day, index) => (
            <Card key={index} className="min-h-[400px]">
              <CardHeader className="pb-2">
                <div className="text-sm font-medium">
                  {day.date.getDate()}
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {day.events.map(event => (
                    <div 
                      key={event.id} 
                      className="p-1 bg-blue-100 rounded text-xs cursor-pointer hover:bg-blue-200"
                      onClick={() => setEditingEvent(event)}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(event.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container py-6 space-y-6">
      <PageHeader 
        title="Manufacturing Calendar"
        description="Schedule and track manufacturing operations, maintenance, and production activities"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilterDialog(true)}
              className="relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSyncClick}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sync Schedule
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowSettingsDialog(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            
            <Button
              variant="outline"
              onClick={handleRefreshClick}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button onClick={() => setShowEventForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <CalendarStatsCard
          title="Total Events"
          value={getStats().totalEvents}
          icon={Calendar}
          color="text-blue-600"
        />
        <CalendarStatsCard
          title="Manufacturing"
          value={getStats().manufacturingEvents}
          icon={Wrench}
          color="text-green-600"
        />
        <CalendarStatsCard
          title="Maintenance"
          value={getStats().maintenanceEvents}
          icon={AlertTriangle}
          color="text-amber-600"
        />
        <CalendarStatsCard
          title="Avg Utilization"
          value={`${getStats().averageUtilization}%`}
          icon={BarChart3}
          color="text-purple-600"
        />
        <CalendarStatsCard
          title="Completed"
          value={getStats().completedEvents}
          icon={CheckCircle}
          color="text-emerald-600"
        />
        <CalendarStatsCard
          title="Delayed"
          value={getStats().delayedEvents}
          icon={Clock}
          color="text-red-600"
        />
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('prev')}
                  disabled={isLoading || isNavigating}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold">{formatDateRange()}</h3>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('next')}
                  disabled={isLoading || isNavigating}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  disabled={isLoading || isNavigating}
                >
                  Today
                </Button>
              </div>
            </div>
            
            <Tabs value={viewType} onValueChange={(value) => setViewType(value as 'day' | 'week')}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">
                  {isNavigating ? "Navigating..." : "Loading calendar..."}
                </p>
              </div>
            </div>
          ) : isNavigating ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-pulse rounded-full h-6 w-6 bg-blue-200 mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading week...</p>
              </div>
            </div>
          ) : (
            <Tabs value={viewType} className="w-full">
              <TabsContent value="day">
                {renderDayView()}
              </TabsContent>
              
              <TabsContent value="week">
                {renderWeekView()}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Event editing display */}
      {editingEvent && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Event: {editingEvent.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Type:</strong> {editingEvent.type}</p>
              <p><strong>Time:</strong> {new Date(editingEvent.startTime).toLocaleString()} - {new Date(editingEvent.endTime).toLocaleString()}</p>
              <p><strong>Status:</strong> {editingEvent.status}</p>
              <p><strong>Priority:</strong> {editingEvent.priority}</p>
              {editingEvent.machineName && <p><strong>Machine:</strong> {editingEvent.machineName}</p>}
              {editingEvent.description && <p><strong>Description:</strong> {editingEvent.description}</p>}
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingEvent(null)}
                >
                  Close
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    handleDeleteEvent(editingEvent.id);
                    setEditingEvent(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Placeholder notifications */}
      {showEventForm && (
        <Card>
          <CardContent className="p-6">
            <p>Event creation form would go here.</p>
            <Button onClick={() => setShowEventForm(false)}>Close</Button>
          </CardContent>
        </Card>
      )}
      
      {showFilterDialog && (
        <Card>
          <CardContent className="p-6">
            <p>Filter dialog would go here.</p>
            <Button onClick={() => setShowFilterDialog(false)}>Close</Button>
          </CardContent>
        </Card>
      )}
      
      {showSettingsDialog && (
        <Card>
          <CardContent className="p-6">
            <p>Settings dialog would go here.</p>
            <Button onClick={() => setShowSettingsDialog(false)}>Close</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 