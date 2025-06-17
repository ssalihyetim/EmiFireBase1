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
  sortEventsByDependencies,
  validateOperationDependencies
} from "@/lib/manufacturing-calendar";
import { CalendarStatsCard } from "@/components/manufacturing-calendar/StatsCard";
import { EventEditDialog } from "@/components/manufacturing-calendar/EventEditDialog";

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
  
  // Machines state
  const [machines, setMachines] = useState<any[]>([]);

  // New state for active parts and completed parts toggle
  const [activeParts, setActiveParts] = useState<any[]>([]);
  const [showCompletedParts, setShowCompletedParts] = useState(false);
  const [completedPartsCount, setCompletedPartsCount] = useState(0);
  const [activePartsLoading, setActivePartsLoading] = useState(false);

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
    if (!isNavigating) {
      setIsLoading(true);
    }
    
    try {
      if (viewType === 'day') {
        const dayData = await getDayView(currentDate, filter);
        
        // Use regular events without splitting multi-day operations
        const sortedEvents = sortEventsByDependencies(dayData.events);
        const validation = validateOperationDependencies(sortedEvents);
        
        // Log dependency info (warnings disabled to reduce UI noise)
        if (!validation.isValid && validation.violations.length > 0) {
          console.log('📝 Operation dependency info:', validation.violations.length, 'items noted');
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