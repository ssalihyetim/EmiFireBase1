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
  deleteCalendarEvent,
  getCalendarEventsWithMultiDay,
  sortEventsByDependencies,
  validateOperationDependencies
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
        
        // Enhance with multi-day support and dependency validation
        const enhancedEvents = await getCalendarEventsWithMultiDay(
          dayData.date, 
          new Date(dayData.date.getTime() + 24*60*60*1000), 
          filter
        );
        const sortedEvents = sortEventsByDependencies(enhancedEvents);
        const validation = validateOperationDependencies(sortedEvents);
        
        // Show dependency warnings if any
        if (!validation.isValid && validation.violations.length > 0) {
          console.warn('⚠️ Operation dependency violations found:', validation.violations);
          toast({
            title: "Scheduling Issues Detected",
            description: `${validation.violations.length} dependency violations found. Check operation order.`,
            variant: "destructive",
          });
        }
        
        setDayView({
          ...dayData,
          events: sortedEvents
        });
        setWeekView(null);
      } else {
        // Calculate week start (Monday) with proper timezone handling
        const weekStart = getWeekStart(currentDate);
        const weekEnd = new Date(weekStart.getTime() + 6*24*60*60*1000);
        console.log(`📅 Loading week data for: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
        
        const weekData = await getWeekView(weekStart, filter);
        
        // Enhance each day with multi-day support and dependency validation
        const enhancedDays = await Promise.all(
          weekData.days.map(async (day) => {
            const dayStart = new Date(day.date);
            const dayEnd = new Date(dayStart.getTime() + 24*60*60*1000);
            
            const enhancedEvents = await getCalendarEventsWithMultiDay(dayStart, dayEnd, filter);
            const sortedEvents = sortEventsByDependencies(enhancedEvents);
            
            return {
              ...day,
              events: sortedEvents
            };
          })
        );
        
        // Validate dependencies across the entire week
        const allWeekEvents = enhancedDays.flatMap(day => day.events);
        const weekValidation = validateOperationDependencies(allWeekEvents);
        
        if (!weekValidation.isValid && weekValidation.violations.length > 0) {
          console.warn('⚠️ Weekly operation dependency violations found:', weekValidation.violations);
          toast({
            title: "Weekly Scheduling Issues",
            description: `${weekValidation.violations.length} dependency violations found this week.`,
            variant: "destructive",
          });
        }
        
        setWeekView({
          ...weekData,
          days: enhancedDays
        });
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
    
    // DEBUG: Log the data we're working with
    console.log('🔍 DEBUG: Day view data:', {
      date: dayView.date,
      eventsCount: dayView.events.length,
      machinesCount: dayView.machines.length,
      sampleEvents: dayView.events.slice(0, 2).map(e => ({
        id: e.id,
        title: e.title,
        partName: e.partName,
        type: e.type,
        hasPartName: !!e.partName
      }))
    });
    
    return (
      <div className="space-y-4">
        {/* DEBUG INFO CARD */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
          <h4 className="font-medium text-yellow-800 mb-2">🔍 Debug Info</h4>
          <div className="text-yellow-700 space-y-1">
            <p><strong>Current Date:</strong> {dayView.date.toLocaleDateString()}</p>
            <p><strong>Query Range:</strong> {dayView.date.toISOString().split('T')[0]} to {new Date(dayView.date.getTime() + 24*60*60*1000).toISOString().split('T')[0]}</p>
            <p><strong>Total Events:</strong> {dayView.events.length}</p>
            <p><strong>Total Machines:</strong> {dayView.machines.length}</p>
            <p><strong>Events with partName:</strong> {dayView.events.filter(e => e.partName).length}</p>
            <p><strong>Events with title only:</strong> {dayView.events.filter(e => !e.partName && e.title).length}</p>
            {dayView.events.length > 0 && (
              <div className="mt-2">
                <p><strong>All Events Today:</strong></p>
                {dayView.events.map((e, i) => (
                  <p key={i} className="ml-2 text-xs">
                    {i+1}. {new Date(e.startTime).toLocaleDateString()} {new Date(e.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                    <span className={e.partName ? 'text-green-600 font-medium' : 'text-orange-600'}>
                      {e.partName || e.title}
                    </span>
                    <span className="text-gray-500"> ({e.machineName})</span>
                  </p>
                ))}
              </div>
            )}
            
            {/* Machine breakdown */}
            <div className="mt-2">
              <p><strong>Machine Breakdown:</strong></p>
              {dayView.machines.map((machine, i) => (
                <p key={i} className="ml-2 text-xs">
                  {machine.machineName}: {machine.events.length} events
                </p>
              ))}
            </div>
          </div>
        </div>
        
        {/* Machine Row Layout */}
        <div className="space-y-4">
          {dayView.machines.map(machine => (
            <Card key={machine.machineId} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{machine.machineName}</CardTitle>
                    <Badge variant={machine.isActive ? "default" : "secondary"}>
                      {machine.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {machine.utilization}% utilization
                    </span>
                    <span className="text-sm text-blue-600 font-medium">
                      {machine.events.length} operation{machine.events.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {machine.machineType.charAt(0).toUpperCase() + machine.machineType.slice(1)} Machine
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {machine.events.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">No operations scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {machine.events.map(event => {
                      return (
                        <div key={event.id} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg cursor-pointer hover:from-blue-100 hover:to-indigo-100 border border-blue-200 transition-all duration-200"
                             onClick={() => setEditingEvent(event)}>
                          
                          {/* Main title with part name and operation */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-blue-100 px-3 py-1 rounded-full text-blue-800 font-medium text-sm">
                                  📦 {event.partName || 'Unknown Part'}
                                </span>
                                <span className="bg-green-100 px-3 py-1 rounded-full text-green-800 font-medium text-sm">
                                  🔧 {event.operationName || event.title}
                                </span>
                              </div>
                              
                              {/* Description */}
                              <div className="text-sm text-gray-700 mb-2">
                                {event.description || `${event.operationName || 'Operation'} on ${event.partName || 'part'}`}
                              </div>
                            </div>
                            
                            {/* Status badge */}
                            <Badge variant={
                              event.status === 'completed' ? 'default' : 
                              event.status === 'in_progress' ? 'destructive' : 
                              event.status === 'delayed' ? 'destructive' : 'secondary'
                            }>
                              {event.status === 'scheduled' ? 'Scheduled' :
                               event.status === 'in_progress' ? 'In Progress' :
                               event.status === 'completed' ? 'Completed' :
                               event.status === 'delayed' ? 'Delayed' : event.status}
                            </Badge>
                          </div>
                          
                          {/* Operation details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="text-gray-500">⏰ Time:</span>
                              <div className="font-medium">
                                {new Date(event.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                                {new Date(event.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            </div>
                            
                            {event.quantity && (
                              <div>
                                <span className="text-gray-500">📊 Quantity:</span>
                                <div className="font-medium text-green-600">{event.quantity}</div>
                              </div>
                            )}
                            
                            {event.estimatedDuration && (
                              <div>
                                <span className="text-gray-500">⏱️ Duration:</span>
                                <div className="font-medium">{Math.round(event.estimatedDuration / 60)}h {event.estimatedDuration % 60}m</div>
                              </div>
                            )}
                            
                            {event.operationIndex !== undefined && (
                              <div>
                                <span className="text-gray-500">🔢 Order:</span>
                                <div className="font-medium">#{event.operationIndex + 1}</div>
                              </div>
                            )}
                          </div>
                          
                          {/* Progress bar for multi-day operations */}
                          {event.isMultiDay && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>Multi-day operation</span>
                                <span>Day {(event.dayIndex || 0) + 1} of {event.totalDays || 1}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{width: `${((event.dayIndex || 0) + 1) / (event.totalDays || 1) * 100}%`}}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
                      className="p-2 bg-blue-100 rounded text-xs cursor-pointer hover:bg-blue-200 space-y-1"
                      onClick={() => setEditingEvent(event)}
                    >
                      <div className="font-medium truncate text-blue-900">
                        {event.partName || 'Unknown Part'}
                      </div>
                      <div className="text-xs text-green-700 font-medium truncate">
                        {event.operationName || event.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(event.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      {event.quantity && (
                        <div className="text-xs text-green-600 font-medium">
                          Qty: {event.quantity}
                        </div>
                      )}
                      {event.machineName && (
                        <div className="text-xs text-gray-600 truncate">
                          {event.machineName}
                        </div>
                      )}
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
            
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch('/api/test/debug-calendar-events');
                  const result = await response.json();
                  
                  if (result.success) {
                    console.log('🔍 Calendar Debug Info:', result);
                    toast({
                      title: "Debug Info",
                      description: `${result.stats.totalEvents} total events, ${result.stats.eventsWithPartName} with part names. Check console for details.`,
                    });
                  } else {
                    throw new Error(result.error);
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to get debug info",
                    variant: "destructive",
                  });
                }
              }}
              disabled={isLoading}
            >
              <Settings className="h-4 w-4 mr-2" />
              Debug DB
            </Button>
            
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirm('⚠️ This will delete ALL manufacturing data (jobs, schedules, calendar events). Are you sure?')) {
                  return;
                }
                
                try {
                  setIsLoading(true);
                  const response = await fetch('/api/cleanup-all-manufacturing-data', {
                    method: 'POST'
                  });
                  const result = await response.json();
                  
                  if (result.success) {
                    toast({
                      title: "Cleanup Complete",
                      description: `Deleted ${result.deletedCounts.total} documents across all collections`,
                    });
                    await loadCalendarData(false);
                  } else {
                    throw new Error(result.error);
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to cleanup data",
                    variant: "destructive",
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
            >
              <Settings className="h-4 w-4 mr-2" />
              Clean All Data
            </Button>
            
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  setIsLoading(true);
                  const response = await fetch('/api/test/create-calendar-data', {
                    method: 'POST'
                  });
                  const result = await response.json();
                  
                  if (result.success) {
                    toast({
                      title: "Test Data Created",
                      description: `Created ${result.eventsCreated} test calendar events with part names`,
                    });
                    await loadCalendarData(false);
                  } else {
                    throw new Error(result.error);
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to create test data",
                    variant: "destructive",
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Test Data
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