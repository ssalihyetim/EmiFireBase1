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
  CheckCircle,
  Grid3X3,
  Square
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
  sortEventsByDependencies,
  validateOperationDependencies
} from "@/lib/manufacturing-calendar";
import { CalendarStatsCard } from "@/components/manufacturing-calendar/StatsCard";
import { EventEditDialog } from "@/components/manufacturing-calendar/EventEditDialog";

export default function ManufacturingCalendarPage() {
  const { toast } = useToast();
  
  // State management
  const [viewType, setViewType] = useState<'day' | 'week' | 'month' | 'machine-grid'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayView, setDayView] = useState<DayView | null>(null);
  const [weekView, setWeekView] = useState<WeekView | null>(null);
  const [monthView, setMonthView] = useState<WeekView | null>(null);
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
  
  // Machines state
  const [machines, setMachines] = useState<any[]>([]);

  // New state for active parts and completed parts toggle
  const [activeParts, setActiveParts] = useState<any[]>([]);
  const [showCompletedParts, setShowCompletedParts] = useState(false);
  const [completedPartsCount, setCompletedPartsCount] = useState(0);
  const [activePartsLoading, setActivePartsLoading] = useState(false);

  // Machine type filter state for Machine Grid View
  const [selectedMachineTypes, setSelectedMachineTypes] = useState<Set<string>>(new Set(['Turning', 'Milling', '5-Axis']));

  // Load calendar data and machines
  useEffect(() => {
    loadCalendarData();
    loadMachines();
  }, [currentDate, viewType, filter]);

  // Load active parts separately (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadActiveParts();
    }
  }, [currentDate, viewType, filter, showCompletedParts]);

  // Load machines data
  const loadMachines = async () => {
    try {
      const { db } = await import('@/lib/firebase');
      const { collection, getDocs } = await import('firebase/firestore');
      
      const machinesRef = collection(db, 'machines');
      const machinesSnapshot = await getDocs(machinesRef);
      const machinesData = machinesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMachines(machinesData as any);
    } catch (error) {
      console.error('Failed to load machines:', error);
    }
  };

  // Auto-refresh based on settings (but not during navigation)
  useEffect(() => {
    if (settings.refreshInterval > 0 && !isNavigating) {
      const interval = setInterval(() => {
        loadCalendarData(false); // Don't auto-sync on auto-refresh
      }, settings.refreshInterval * 1000);
      
      return () => clearInterval(interval);
    }
  }, [settings.refreshInterval, isNavigating]); // Remove dependencies that cause excessive re-rendering

  const loadCalendarData = async (shouldCheckSync: boolean = true) => {
    setIsLoading(true);
    try {
      if (viewType === 'day') {
        const dayData = await getDayView(currentDate, filter);
        
        // Sort events by dependencies for logical display order
        const sortedEvents = sortEventsByDependencies(dayData.events);
        
        setDayView({
          ...dayData,
          events: sortedEvents
        });
        setWeekView(null);
        setMonthView(null);
      } else if (viewType === 'month') {
        // For month view, load 6 weeks of data to create a proper month calendar
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const weekStart = getWeekStart(monthStart);
        
        console.log(`📅 Loading month data for ${viewType} view: ${weekStart.toISOString()}`);
        
        // Calculate the end date for 6 weeks of calendar grid (42 days)
        const calendarEnd = new Date(weekStart);
        calendarEnd.setDate(weekStart.getDate() + 41); // 6 weeks = 42 days
        
        console.log(`📅 Month data loading from ${weekStart.toDateString()} to ${calendarEnd.toDateString()}`);
        
        // Load 6 weeks of data by calling getWeekView multiple times
        const monthDays = [];
        let currentWeekStart = new Date(weekStart);
        
        for (let week = 0; week < 6; week++) {
          const weekData = await getWeekView(currentWeekStart, filter);
          monthDays.push(...weekData.days);
          
          // Move to next week
          currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        }
        
        console.log(`📅 Month data loaded: ${monthDays.length} days`);
        
        // Use regular events without splitting multi-day operations
        const enhancedDays = monthDays.map((day) => ({
          ...day,
          events: sortEventsByDependencies(day.events)
        }));
        
        // Validate dependencies across the entire month
        const allMonthEvents = enhancedDays.flatMap(day => day.events);
        const monthValidation = validateOperationDependencies(allMonthEvents);
        
        if (!monthValidation.isValid && monthValidation.violations.length > 0) {
          console.log('📝 Operation dependency info:', monthValidation.violations.length, 'items noted');
        }
        
        // Create month view with proper structure
        setMonthView({
          days: enhancedDays,
          weekStart: weekStart,
          weekEnd: calendarEnd,
          weeklyStats: {
            totalEvents: allMonthEvents.length,
            manufacturingEvents: allMonthEvents.filter(e => e.type === 'manufacturing').length,
            maintenanceEvents: allMonthEvents.filter(e => e.type === 'maintenance').length,
            averageUtilization: 0, // Will be calculated if needed
            completedEvents: allMonthEvents.filter(e => e.status === 'completed').length,
            delayedEvents: allMonthEvents.filter(e => e.status === 'delayed').length,
            machineUtilization: {}
          }
        });
        setDayView(null);
        setWeekView(null);
      } else {
        // For week and machine-grid views, load week data
        // Calculate week start (Monday) with proper timezone handling
        const weekStart = getWeekStart(currentDate);
        const weekEnd = new Date(weekStart.getTime() + 6*24*60*60*1000);
        console.log(`📅 Loading week data for ${viewType} view: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
        
        const weekData = await getWeekView(weekStart, filter);
        
        // Use regular events without splitting multi-day operations
        const enhancedDays = weekData.days.map((day) => ({
          ...day,
          events: sortEventsByDependencies(day.events)
        }));
        
        // Validate dependencies across the entire week
        const allWeekEvents = enhancedDays.flatMap(day => day.events);
        const weekValidation = validateOperationDependencies(allWeekEvents);
        
        // Temporarily disable dependency violation warnings (keep sorting for logical display)
        if (!weekValidation.isValid && weekValidation.violations.length > 0) {
          console.log('📝 Operation dependency info:', weekValidation.violations.length, 'items noted');
          // Toast notifications disabled to reduce UI noise
        }
        
        setWeekView({
          ...weekData,
          days: enhancedDays
        });
        setDayView(null);
        setMonthView(null);
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
        // Note: loadActiveParts() will be automatically called by useEffect dependency on currentDate/viewType
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
    } else if (viewType === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      // Navigate by full weeks (7 days) for week and machine-grid views
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
    } else if (viewType === 'month') {
      return currentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
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
    } else if ((viewType === 'week' || viewType === 'month') && weekView) {
      return weekView.weeklyStats;
    } else if (viewType === 'month' && monthView) {
      const allMonthEvents = monthView.days.flatMap(day => day.events);
      return {
        totalEvents: allMonthEvents.length,
        manufacturingEvents: allMonthEvents.filter(e => e.type === 'manufacturing').length,
        maintenanceEvents: allMonthEvents.filter(e => e.type === 'maintenance').length,
        averageUtilization: 0, // Calculate if needed
        completedEvents: allMonthEvents.filter(e => e.status === 'completed').length,
        delayedEvents: allMonthEvents.filter(e => e.status === 'delayed').length,
      };
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
                                {(() => {
                                  const startDate = new Date(event.startTime);
                                  const endDate = new Date(event.endTime);
                                  const isMultiDay = startDate.toDateString() !== endDate.toDateString();
                                  
                                  if (isMultiDay) {
                                    return `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                                  } else {
                                    return `${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                                  }
                                })()}
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
                          
                          {/* Multi-day operation indicator */}
                          {(() => {
                            const startDate = new Date(event.startTime);
                            const endDate = new Date(event.endTime);
                            const isMultiDay = startDate.toDateString() !== endDate.toDateString();
                            
                            if (isMultiDay) {
                              const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                              return (
                                <div className="mt-3">
                                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                    <span>🔄 Continuous multi-day operation</span>
                                    <span>{totalDays} day{totalDays > 1 ? 's' : ''} total</span>
                                  </div>
                                  <div className="w-full bg-gradient-to-r from-blue-100 to-green-100 rounded-full h-2 border border-blue-200">
                                    <div className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full w-full"></div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
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
                        {(() => {
                          const startDate = new Date(event.startTime);
                          const endDate = new Date(event.endTime);
                          const isMultiDay = startDate.toDateString() !== endDate.toDateString();
                          
                          if (isMultiDay) {
                            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                            return `🔄 ${totalDays}d continuous`;
                          } else {
                            return startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                          }
                        })()}
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

  const renderMonthView = () => {
    if (!monthView && !weekView) return null;
    
    // For now, use weekView data if monthView is not available to test the logic
    const viewData = monthView || weekView;
    
    if (!viewData) {
      return <div>No data available for month view</div>;
    }
    
    // Debug: Check what data we have
    console.log('📅 Month View Debug:', {
      viewData,
      usingWeekView: !monthView,
      daysCount: viewData.days.length,
      totalEvents: viewData.days.flatMap(day => day.events).length,
      daysWithEvents: viewData.days.filter(day => day.events.length > 0).length,
      allDates: viewData.days.map(day => new Date(day.date).toDateString()),
      daysWithEventsDetails: viewData.days.filter(day => day.events.length > 0).map(day => ({
        date: new Date(day.date).toDateString(),
        eventsCount: day.events.length,
        sampleEvent: day.events[0]
      }))
    });
    
    // Generate calendar grid for the month using Monday-based weeks to match data loading
    const getMonthDates = (date: Date) => {
      // Use the same logic as data loading: start from Monday of the week containing 1st of month
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const weekStart = getWeekStart(firstDay);
      
      // Generate 6 weeks (42 days) to create a complete month calendar grid
      const dates = [];
      const currentDateIter = new Date(weekStart);
      
      for (let i = 0; i < 42; i++) {
        dates.push(new Date(currentDateIter));
        currentDateIter.setDate(currentDateIter.getDate() + 1);
      }
      
      return dates;
    };

    const monthDates = getMonthDates(currentDate);
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; // Monday-based week

    // Debug: Check date alignment
    console.log('🗓️ Month Calendar Grid Debug:', {
      currentMonth: currentDate.toDateString(),
      firstCalendarDate: monthDates[0].toDateString(),
      lastCalendarDate: monthDates[monthDates.length - 1].toDateString(),
      calendarDatesCount: monthDates.length,
      loadedDatesCount: viewData.days.length,
      firstLoadedDate: viewData.days[0]?.date ? new Date(viewData.days[0].date).toDateString() : 'None',
      lastLoadedDate: viewData.days[viewData.days.length - 1]?.date ? new Date(viewData.days[viewData.days.length - 1].date).toDateString() : 'None'
    });

    // Get events for a specific date using the same approach as week view
    const getEventsForDate = (date: Date) => {
      // Debug: Log date matching details
      const matchingDay = viewData.days.find(day => {
        const dayDate = new Date(day.date);
        const matches = dayDate.toDateString() === date.toDateString();
        if (date.getDate() === 18) { // Debug for June 18th
          console.log('🔍 Date Matching Debug for', date.toDateString(), {
            dayDate: dayDate.toDateString(),
            matches,
            dayEvents: day.events.length,
            sampleEvent: day.events[0]
          });
        }
        return matches;
      });
      
      const events = matchingDay ? matchingDay.events : [];
      
      // Additional debug for specific dates
      if (date.getDate() === 18 || date.getDate() === 19 || date.getDate() === 20) {
        console.log(`📅 Events for ${date.toDateString()}:`, {
          matchingDay: !!matchingDay,
          eventsCount: events.length,
          events: events.slice(0, 2).map(e => ({
            id: e.id,
            partName: e.partName,
            startTime: e.startTime
          }))
        });
      }
      
      return events;
    };

    const isCurrentMonth = (date: Date) => {
      return date.getMonth() === currentDate.getMonth();
    };

    const isToday = (date: Date) => {
      return date.toDateString() === new Date().toDateString();
    };

    // Group dates into weeks
    const weeks = [];
    for (let i = 0; i < monthDates.length; i += 7) {
      weeks.push(monthDates.slice(i, i + 7));
    }

    return (
      <div className="space-y-4">
        <div className="border rounded-lg overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {daysOfWeek.map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-rows-6">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
                {week.map((date, dayIndex) => {
                  const dayEvents = getEventsForDate(date);
                  
                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`min-h-[120px] p-2 border-l border-gray-200 ${
                        !isCurrentMonth(date) ? 'bg-gray-50 text-muted-foreground' : ''
                      } ${isToday(date) ? 'bg-blue-50' : ''} hover:bg-gray-100`}
                    >
                      {/* Date number */}
                      <div className={`text-sm font-medium mb-2 ${
                        isToday(date) ? 'text-blue-600 font-bold' : ''
                      }`}>
                        {date.getDate()}
                      </div>
                      
                      {/* Events - Using the same style as week view */}
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className="p-1 bg-blue-100 rounded text-xs cursor-pointer hover:bg-blue-200 space-y-1"
                            onClick={() => setEditingEvent(event)}
                          >
                            <div className="font-medium truncate text-blue-900">
                              {event.partName || 'Unknown Part'}
                            </div>
                            <div className="text-xs text-green-700 font-medium truncate">
                              {event.operationName || event.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {(() => {
                                const startDate = new Date(event.startTime);
                                const endDate = new Date(event.endTime);
                                const isMultiDay = startDate.toDateString() !== endDate.toDateString();
                                
                                if (isMultiDay) {
                                  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                                  return `🔄 ${totalDays}d continuous`;
                                } else {
                                  return startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                }
                              })()}
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
                        
                        {/* Show more indicator */}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        
        {/* Month summary - same as week view but for all month data */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {viewData.days.reduce((sum, day) => sum + day.events.length, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {viewData.days.reduce((sum, day) => 
                  sum + day.events.filter(e => e.status === 'completed').length, 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {viewData.days.reduce((sum, day) => 
                  sum + day.events.filter(e => e.status === 'in_progress').length, 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {viewData.days.reduce((sum, day) => 
                  sum + day.events.filter(e => e.status === 'scheduled').length, 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Load active parts (exclude completed jobs where all tasks are done)
  const loadActiveParts = async () => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') {
      return;
    }

    try {
      setActivePartsLoading(true);

      const { db } = await import('@/lib/firebase');
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      
      // Get all jobs to check completion status
      const jobsRef = collection(db, 'jobs');
      const jobsSnapshot = await getDocs(jobsRef);
      const allJobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      // Get all tasks to check completion status
      const tasksRef = collection(db, 'jobTasks');
      const tasksSnapshot = await getDocs(tasksRef);
      const allTasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      // Create map of completed jobs (all tasks completed)
      const completedJobIds = new Set();
      allJobs.forEach((job: any) => {
        const jobTasks = allTasks.filter((task: any) => task.jobId === job.id);
        if (jobTasks.length > 0) {
          const allTasksCompleted = jobTasks.every((task: any) => {
            // Check if main task is completed
            if (task.status !== 'completed') return false;
            
            // Check if all subtasks are completed (if any)
            if (task.subtasks && task.subtasks.length > 0) {
              return task.subtasks.every((subtask: any) => subtask.status === 'completed');
            }
            
            return true;
          });
          
          if (allTasksCompleted) {
            completedJobIds.add(job.id);
          }
        }
      });
      
      // Get calendar events
      const calendarEventsRef = collection(db, 'calendarEvents');
      const calendarQuery = query(calendarEventsRef, where('type', '==', 'manufacturing'));
      const calendarSnapshot = await getDocs(calendarQuery);
      
      // Group events by part name and collect operations
      const allPartsMap = new Map();
      const activePartsMap = new Map();
      
      calendarSnapshot.docs.forEach(doc => {
        const event = { id: doc.id, ...doc.data() } as any;
        const partName = event.partName || 'Unknown Part';
        const isCompleted = completedJobIds.has(event.jobId);
        
        // Add to all parts map
        if (!allPartsMap.has(partName)) {
          allPartsMap.set(partName, {
            partName,
            operations: [],
            totalDuration: 0,
            jobIds: new Set(),
            machines: new Set(),
            isCompleted
          });
        }
        
        const allPart = allPartsMap.get(partName);
        allPart.operations.push({
          operationName: event.operationName || event.title,
          machineId: event.machineId,
          machineName: event.machineName,
          estimatedDuration: event.estimatedDuration || 0,
          quantity: event.quantity || 0,
          status: event.status || 'scheduled',
          startTime: event.startTime,
          endTime: event.endTime,
          priority: event.priority || 'medium'
        });
        allPart.totalDuration += event.estimatedDuration || 0;
        allPart.jobIds.add(event.jobId);
        allPart.machines.add(event.machineName);
        
        // Add to active parts map only if not completed
        if (!isCompleted) {
          if (!activePartsMap.has(partName)) {
            activePartsMap.set(partName, {
              partName,
              operations: [],
              totalDuration: 0,
              jobIds: new Set(),
              machines: new Set()
            });
          }
          
          const activePart = activePartsMap.get(partName);
          activePart.operations.push({
            operationName: event.operationName || event.title,
            machineId: event.machineId,
            machineName: event.machineName,
            estimatedDuration: event.estimatedDuration || 0,
            quantity: event.quantity || 0,
            status: event.status || 'scheduled',
            startTime: event.startTime,
            endTime: event.endTime,
            priority: event.priority || 'medium'
          });
          activePart.totalDuration += event.estimatedDuration || 0;
          activePart.jobIds.add(event.jobId);
          activePart.machines.add(event.machineName);
        }
      });
      
      // Choose which parts to display based on toggle
      const partsMap = showCompletedParts ? allPartsMap : activePartsMap;
      
      // Convert to array and sort by total duration (descending)
      const activePartsList = Array.from(partsMap.values())
        .map(part => ({
          ...part,
          jobIds: Array.from(part.jobIds),
          machines: Array.from(part.machines),
          operationCount: part.operations.length
        }))
        .sort((a, b) => b.totalDuration - a.totalDuration);
      
      setActiveParts(activePartsList);
      setCompletedPartsCount(allPartsMap.size - activePartsMap.size);
      
      // Log completion summary for visibility
      if (completedJobIds.size > 0) {
        console.log(`📋 Found ${completedJobIds.size} completed jobs that were filtered out from active parts`);
      }
    } catch (error) {
      console.error('Failed to load active parts:', error);
      // Set empty state on error to prevent crashes
      setActiveParts([]);
      setCompletedPartsCount(0);
      
      // Optionally show toast notification for user feedback
      if (typeof window !== 'undefined' && toast) {
        toast({
          title: "Active Parts Load Error",
          description: "Could not load active parts data. Please refresh the page.",
          variant: "destructive",
        });
      }
    } finally {
      setActivePartsLoading(false);
    }
  };

  // Helper function to toggle machine type filters
  const toggleMachineType = (machineType: string) => {
    const newSelectedTypes = new Set(selectedMachineTypes);
    if (newSelectedTypes.has(machineType)) {
      newSelectedTypes.delete(machineType);
    } else {
      newSelectedTypes.add(machineType);
    }
    setSelectedMachineTypes(newSelectedTypes);
  };

  // Helper function to get machine type from machine data
  const getMachineType = (machine: any): string => {
    const type = machine.type || machine.machineType || '';
    // Normalize machine types to match our filter categories
    if (type.toLowerCase().includes('turn')) return 'Turning';
    if (type.toLowerCase().includes('mill')) return 'Milling';
    if (type.toLowerCase().includes('5-axis') || type.toLowerCase().includes('5axis')) return '5-Axis';
    // Default fallback
    return 'Turning'; // or could be 'Other' if you want to add that category
  };

  // Render Machine Grid View
  const renderMachineGridView = () => {
    if (!machines || machines.length === 0) {
      return (
        <div className="text-center py-12">
          <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No machines available</p>
        </div>
      );
    }

    // Get current date range for the view
    const today = new Date();
    const weekStart = getWeekStart(currentDate); // Use currentDate instead of today for navigation
    const weekEnd = new Date(weekStart.getTime() + 7*24*60*60*1000 - 1); // End of 7th day (23:59:59.999)
    
    // Debug the week range being used
    console.log(`🗓️ Machine Grid Week Range:`, {
      currentDate: currentDate.toLocaleDateString(),
      weekStart: weekStart.toLocaleString(),
      weekEnd: weekEnd.toLocaleString(),
      weekDuration: `${Math.round((weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60))} hours`
    });

    // Get all events for the current week to determine machine status
    const allEvents = weekView?.days.flatMap(day => day.events) || [];
    
    // Helper function to determine machine status
    const getMachineStatus = (machineId: string) => {
      const machineEvents = allEvents.filter(event => event.machineId === machineId);
      const now = new Date();
      
      // Check if any event is currently running
      const runningEvent = machineEvents.find(event => {
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        return now >= start && now <= end;
      });
      
      if (runningEvent) {
        return { status: 'running', event: runningEvent };
      }
      
      // Check for upcoming events (next 2 hours)
      const upcomingEvents = machineEvents
        .filter(event => {
          const start = new Date(event.startTime);
          const timeDiff = start.getTime() - now.getTime();
          return timeDiff > 0 && timeDiff <= 2 * 60 * 60 * 1000; // Next 2 hours
        })
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      if (upcomingEvents.length > 0) {
        return { status: 'scheduled', event: upcomingEvents[0] };
      }
      
      return { status: 'idle', event: null };
    };
    
    // Helper function to get utilization percentage
    const getMachineUtilization = (machineId: string) => {
      const rawMachineEvents = allEvents.filter(event => event.machineId === machineId);
      
      // Remove duplicate events (same ID) and warn about unrealistic durations
      const uniqueEventsMap = new Map();
      const machineEvents: any[] = [];
      
      rawMachineEvents.forEach(event => {
        const duration = (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60 * 60);
        
        // Warn about unrealistic durations
        if (duration > 24) {
          console.warn(`⚠️ Unrealistic operation duration found:`, {
            id: event.id,
            partName: event.partName,
            operationName: event.operationName,
            duration: `${Math.round(duration)} hours`,
            start: new Date(event.startTime).toLocaleString(),
            end: new Date(event.endTime).toLocaleString()
          });
        }
        
        // Add unique events only (deduplicate by ID)
        if (!uniqueEventsMap.has(event.id)) {
          uniqueEventsMap.set(event.id, event);
          machineEvents.push(event);
        } else {
          console.warn(`🔄 Duplicate event filtered out:`, {
            id: event.id,
            partName: event.partName,
            operationName: event.operationName
          });
        }
      });
      
      // Calculate working hours consumed by operations within the week (8 AM - 5 PM, Mon-Fri)
      const calculateWorkingHoursForWeek = (): number => {
        const workingHoursByDay = new Map<string, number>(); // dayKey -> maxHoursUsed
        
        machineEvents.forEach(event => {
          const operationStart = new Date(event.startTime);
          const operationEnd = new Date(event.endTime);
          const weekStartTime = weekStart.getTime();
          const weekEndTime = weekEnd.getTime();
          
          // Clip operation to current week
          const clippedStart = Math.max(operationStart.getTime(), weekStartTime);
          const clippedEnd = Math.min(operationEnd.getTime(), weekEndTime);
          
          if (clippedStart >= clippedEnd) return; // No overlap
          
          let currentDay = new Date(clippedStart);
          currentDay.setHours(0, 0, 0, 0);
          
          while (currentDay.getTime() <= clippedEnd) {
            const dayOfWeek = currentDay.getDay();
            
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Weekdays only
              const dayKey = currentDay.toISOString().split('T')[0]; // YYYY-MM-DD
              
              // Define working hours for this day (8 AM to 5 PM = 8 hours)
              const dayStart = new Date(currentDay);
              dayStart.setHours(8, 0, 0, 0);
              const dayEnd = new Date(currentDay);
              dayEnd.setHours(17, 0, 0, 0);
              
              const overlapStart = Math.max(clippedStart, dayStart.getTime());
              const overlapEnd = Math.min(clippedEnd, dayEnd.getTime());
              
              if (overlapStart < overlapEnd) {
                // This operation uses working hours on this day
                const dailyHours = Math.min((overlapEnd - overlapStart) / (1000 * 60 * 60), 8);
                // Take maximum hours for this day (handles overlapping operations)
                workingHoursByDay.set(dayKey, Math.max(workingHoursByDay.get(dayKey) || 0, dailyHours));
              }
            }
            
            currentDay.setDate(currentDay.getDate() + 1);
          }
        });
        
        // Sum up working hours across all working days
        return Array.from(workingHoursByDay.values()).reduce((sum, hours) => sum + hours, 0);
      };
      
      // Standard working hours: 8 hours/day × 5 days = 40 hours/week
      const standardWorkingHoursMs = 40 * 60 * 60 * 1000; // 40 hours in milliseconds
      
      const totalWorkingHours = calculateWorkingHoursForWeek();
      const totalBusyTime = totalWorkingHours * (1000 * 60 * 60); // Convert to milliseconds for compatibility
      
      const utilization = Math.round((totalBusyTime / standardWorkingHoursMs) * 100);
      
      // Debug logging for high utilization machines
      if (utilization > 80) {
        console.log(`📊 Machine ${machineId} utilization:`, {
          utilization: `${utilization}%`,
          totalWorkingHours: `${totalWorkingHours} hours`,
          standardWorkingHours: `40 hours`,
          rawEventsCount: rawMachineEvents.length,
          uniqueEventsCount: machineEvents.length,
          duplicatesRemoved: rawMachineEvents.length - machineEvents.length,
          weekRange: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
          originalEvents: machineEvents.map(e => ({
            id: e.id,
            partName: e.partName,
            operationName: e.operationName,
            start: new Date(e.startTime).toLocaleString(),
            end: new Date(e.endTime).toLocaleString(),
            originalDuration: `${Math.round((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / (1000 * 60 * 60))} hours`,
            workingDaysInWeek: `Calculated as working hours only (8 AM - 5 PM, Mon-Fri)`
          }))
        });
      }
      
      return utilization;
    };

    // Helper function to check if machine is over-scheduled
    const isOverScheduled = (utilization: number) => utilization > 100;

    // Filter machines based on selected types
    const filteredMachines = machines.filter(machine => {
      const machineType = getMachineType(machine);
      return selectedMachineTypes.has(machineType);
    });

    return (
      <div className="space-y-6">
        {/* Machine type filters */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={selectedMachineTypes.has('Turning') ? 'default' : 'outline'} 
            size="sm" 
            className={selectedMachineTypes.has('Turning') ? 
              'bg-orange-500 border-orange-600 text-white hover:bg-orange-600' : 
              'bg-orange-50 border-orange-200 hover:bg-orange-100'
            }
            onClick={() => toggleMachineType('Turning')}
          >
            <Square className="h-3 w-3 mr-2 fill-orange-400" />
            🔄 Turning ({machines.filter(m => getMachineType(m) === 'Turning').length})
          </Button>
          <Button 
            variant={selectedMachineTypes.has('Milling') ? 'default' : 'outline'} 
            size="sm" 
            className={selectedMachineTypes.has('Milling') ? 
              'bg-blue-500 border-blue-600 text-white hover:bg-blue-600' : 
              'bg-blue-50 border-blue-200 hover:bg-blue-100'
            }
            onClick={() => toggleMachineType('Milling')}
          >
            <Square className="h-3 w-3 mr-2 fill-blue-400" />
            ⚙️ Milling ({machines.filter(m => getMachineType(m) === 'Milling').length})
          </Button>
          <Button 
            variant={selectedMachineTypes.has('5-Axis') ? 'default' : 'outline'} 
            size="sm" 
            className={selectedMachineTypes.has('5-Axis') ? 
              'bg-purple-500 border-purple-600 text-white hover:bg-purple-600' : 
              'bg-purple-50 border-purple-200 hover:bg-purple-100'
            }
            onClick={() => toggleMachineType('5-Axis')}
          >
            <Square className="h-3 w-3 mr-2 fill-purple-400" />
            🎯 5-Axis ({machines.filter(m => getMachineType(m) === '5-Axis').length})
          </Button>
        </div>

        {/* Results summary */}
        {filteredMachines.length !== machines.length && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredMachines.length} of {machines.length} machines
            {filteredMachines.length === 0 && (
              <span className="text-orange-600 ml-2">
                • No machines match the selected filters
              </span>
            )}
          </div>
        )}

        {/* Machine Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMachines.map((machine) => {
            const machineStatus = getMachineStatus(machine.id);
            const utilization = getMachineUtilization(machine.id);
            const machineEvents = allEvents.filter(event => event.machineId === machine.id);
            
            // Get next few operations
            const upcomingOperations = machineEvents
              .filter(event => new Date(event.startTime) > new Date())
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .slice(0, 3);

            return (
              <Card key={machine.id} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {machine.name}
                      {machineStatus.status === 'running' && (
                        <Badge variant="default" className="bg-green-500">
                          Running
                        </Badge>
                      )}
                      {machineStatus.status === 'scheduled' && (
                        <Badge variant="secondary">
                          Scheduled
                        </Badge>
                      )}
                      {machineStatus.status === 'idle' && (
                        <Badge variant="outline">
                          Idle
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                  
                  {/* Machine type and utilization */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{machine.type || 'Machine'}</span>
                    <span className={`flex items-center gap-1 ${isOverScheduled(utilization) ? 'text-red-600 font-medium' : ''}`}>
                      {utilization}% utilized
                      {isOverScheduled(utilization) && (
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      )}
                    </span>
                  </div>
                  
                  {/* Utilization bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        utilization > 100 ? 'bg-red-600' :
                        utilization > 80 ? 'bg-red-500' : 
                        utilization > 60 ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                    {/* Overflow indicator for over 100% */}
                    {isOverScheduled(utilization) && (
                      <div className="w-full bg-red-200 rounded-full h-1 mt-1 relative">
                        <div 
                          className="h-1 rounded-full bg-red-600 animate-pulse"
                          style={{ width: `${Math.min((utilization - 100), 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Over-scheduling warning */}
                  {isOverScheduled(utilization) && (
                    <div className="mt-2 p-2 bg-red-50 border-l-4 border-red-400 rounded">
                      <div className="text-xs text-red-800 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Over-scheduled Machine
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        This machine has {utilization}% utilization (conflicts likely)
                      </div>
                    </div>
                  )}
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Current Operation */}
                  {machineStatus.event && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <div className="text-sm font-medium text-blue-900">
                        {machineStatus.status === 'running' ? '🔄 Current Operation' : '⏰ Next Operation'}
                      </div>
                      <div className="text-sm text-blue-800 mt-1">
                        {machineStatus.event.partName} - {machineStatus.event.operationName}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {machineStatus.status === 'running' ? 'In Progress' : 
                         `Starts in ${Math.round((new Date(machineStatus.event.startTime).getTime() - new Date().getTime()) / (1000 * 60))} min`}
                      </div>
                    </div>
                  )}
                  
                  {/* Upcoming Operations Queue */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      Operation Queue ({upcomingOperations.length})
                    </div>
                    {upcomingOperations.length === 0 ? (
                      <div className="text-sm text-muted-foreground italic">
                        No upcoming operations
                      </div>
                    ) : (
                      upcomingOperations.map((operation, index) => (
                        <div key={`${machine.id}-${operation.id}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {operation.partName}
                            </div>
                            <div className="text-muted-foreground truncate">
                              {operation.operationName}
                            </div>
                          </div>
                          <div className="text-right text-muted-foreground ml-2">
                            <div>{new Date(operation.startTime).toLocaleDateString()}</div>
                            <div>{new Date(operation.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Machine Stats */}
                  <div className="mt-4 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-medium">{machineEvents.length}</div>
                        <div className="text-muted-foreground">Total Ops</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">
                          {Math.round(machineEvents.reduce((sum, e) => sum + (e.estimatedDuration || 0), 0) / 60)}h
                        </div>
                        <div className="text-muted-foreground">Total Time</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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

      {/* Active Parts Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Active Parts in Manufacturing</CardTitle>
              {completedPartsCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {completedPartsCount} completed hidden
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompletedParts(!showCompletedParts)}
              >
                {showCompletedParts ? 'Hide Completed' : 'Show Completed'}
                {completedPartsCount > 0 && !showCompletedParts && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                    {completedPartsCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline" 
                size="sm"
                onClick={loadActiveParts}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!activeParts || activeParts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active parts in manufacturing</p>
              {completedPartsCount > 0 && !showCompletedParts && (
                <p className="text-sm mt-2">
                  {completedPartsCount} completed parts are hidden. 
                  <Button 
                    variant="link" 
                    className="p-0 h-auto ml-1" 
                    onClick={() => setShowCompletedParts(true)}
                  >
                    Show them
                  </Button>
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(activeParts || []).map((part, index) => (
                <Card key={index} className={`border ${part.isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {part.partName}
                        {part.isCompleted && (
                          <Badge variant="default" className="text-xs">
                            Completed
                          </Badge>
                        )}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {part.operationCount || 0} ops
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>⏱️ {Math.round(part.totalDuration || 0)} min total</span>
                      <span>🏭 {(part.machines || []).length} machines</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {(part.operations || []).slice(0, 3).map((operation: any, opIndex: number) => (
                        <div key={opIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                          <div className="flex-1">
                            <div className="font-medium text-sm truncate">
                              {operation.operationName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {operation.machineName} • {operation.estimatedDuration} min
                            </div>
                          </div>
                          <Badge 
                            variant={operation.status === 'completed' ? 'default' : 
                                    operation.status === 'in_progress' ? 'secondary' : 'outline'} 
                            className="text-xs"
                          >
                            {operation.status === 'completed' ? 'Done' :
                             operation.status === 'in_progress' ? 'Active' :
                             operation.status === 'scheduled' ? 'Scheduled' : 'Pending'}
                          </Badge>
                        </div>
                      ))}
                      {(part.operations || []).length > 3 && (
                        <div className="text-center">
                                                      <Badge variant="secondary" className="text-xs">
                              +{(part.operations || []).length - 3} more operations
                            </Badge>
                        </div>
                      )}
                    </div>
                    
                    {(part.jobIds || []).length > 0 && (
                                              <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-muted-foreground">
                            Job IDs: {(part.jobIds || []).slice(0, 2).join(', ')}
                            {(part.jobIds || []).length > 2 && ` +${(part.jobIds || []).length - 2} more`}
                          </div>
                        </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
            
            <Tabs value={viewType} onValueChange={(value) => setViewType(value as 'day' | 'week' | 'month' | 'machine-grid')}>
              <TabsList>
                <TabsTrigger value="day">
                  <Calendar className="h-4 w-4 mr-2" />
                  Day
                </TabsTrigger>
                <TabsTrigger value="week">
                  <Calendar className="h-4 w-4 mr-2" />
                  Week
                </TabsTrigger>
                <TabsTrigger value="month">
                  <Calendar className="h-4 w-4 mr-2" />
                  Month
                </TabsTrigger>
                <TabsTrigger value="machine-grid">
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Machine Grid
                </TabsTrigger>
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
              
              <TabsContent value="month">
                {renderMonthView()}
              </TabsContent>
              
              <TabsContent value="machine-grid">
                {renderMachineGridView()}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Event Edit Dialog */}
      <EventEditDialog
        event={editingEvent}
        machines={machines}
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        onSave={handleUpdateEvent}
        onDelete={handleDeleteEvent}
      />
      
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