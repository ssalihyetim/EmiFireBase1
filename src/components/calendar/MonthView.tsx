'use client';

import { CalendarEvent, ResourceAllocation, ScheduleConflict } from '@/types/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, Wrench, AlertTriangle, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  resourceAllocations: ResourceAllocation[];
  conflicts: ScheduleConflict[];
  onEventUpdate: (eventId: string, updates: Partial<CalendarEvent>) => void;
  onEventSelect: (event: CalendarEvent | null) => void;
  onResourceReallocation: (allocationId: string, newResourceId: string) => void;
  onEventDragStart?: (event: CalendarEvent) => void;
  onEventDragEnd?: () => void;
  onEventDrop?: (eventId: string, newStartTime: Date, newEndTime: Date) => void;
  draggedEvent?: CalendarEvent | null;
}

export function MonthView({
  currentDate,
  events,
  resourceAllocations,
  conflicts,
  onEventUpdate,
  onEventSelect,
  onResourceReallocation,
  onEventDragStart,
  onEventDragEnd,
  onEventDrop,
  draggedEvent
}: MonthViewProps) {
  const t = useTranslations('ManufacturingCalendar');

  // Generate calendar grid for the month
  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the Sunday before the first day
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    // End on the Saturday after the last day
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const dates = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  const monthDates = getMonthDates(currentDate);
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get events for a specific date (including multi-day events that span through this date)
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = event.startTime.toDate();
      const eventEnd = event.endTime.toDate();
      
      // Set the date boundaries for comparison (start of day to end of day)
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      // Event spans through this date if:
      // 1. Event starts on this date, OR
      // 2. Event ends on this date, OR  
      // 3. Event starts before this date and ends after this date (spans through)
      return (
        (eventStart >= dayStart && eventStart <= dayEnd) ||           // Starts on this date
        (eventEnd >= dayStart && eventEnd <= dayEnd) ||               // Ends on this date
        (eventStart <= dayStart && eventEnd >= dayEnd)                // Spans through this date
      );
    });
  };

  // Get conflicts for a specific date
  const getConflictsForDate = (date: Date) => {
    return conflicts.filter(conflict => {
      return conflict.affectedEvents.some(eventId => {
        const event = events.find(e => e.id === eventId);
        if (!event) return false;
        
        const eventStart = event.startTime.toDate();
        return eventStart.toDateString() === date.toDateString();
      });
    });
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'job':
        return <Wrench className="h-2 w-2" />;
      case 'maintenance':
        return <AlertTriangle className="h-2 w-2" />;
      case 'meeting':
        return <Calendar className="h-2 w-2" />;
      case 'deadline':
        return <Clock className="h-2 w-2" />;
      default:
        return <Calendar className="h-2 w-2" />;
    }
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.color) return event.color;
    
    switch (event.type) {
      case 'job':
        return event.status === 'in_progress' ? 'bg-green-500' : 'bg-blue-500';
      case 'maintenance':
        return 'bg-yellow-500';
      case 'meeting':
        return 'bg-purple-500';
      case 'deadline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    onEventSelect(event);
  };

  const handleDragStart = (event: CalendarEvent, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', event.id);
    onEventDragStart?.(event);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (date: Date, e: React.DragEvent) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('text/plain');
    
    if (eventId && onEventDrop) {
      const newStartTime = new Date(date);
      newStartTime.setHours(9, 0, 0, 0); // Default to 9 AM
      
      const newEndTime = new Date(newStartTime);
      newEndTime.setHours(10, 0, 0, 0); // 1-hour duration
      
      onEventDrop(eventId, newStartTime, newEndTime);
    }
    
    onEventDragEnd?.();
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
    <div className="flex flex-col h-full">
      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b">
        {daysOfWeek.map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-rows-6">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b">
            {week.map((date, dayIndex) => {
              const dayEvents = getEventsForDate(date);
              const dayConflicts = getConflictsForDate(date);
              
              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={cn(
                    "min-h-[120px] p-1 border-l relative",
                    !isCurrentMonth(date) && "bg-gray-50 text-muted-foreground",
                    isToday(date) && "bg-blue-50",
                    dayConflicts.length > 0 && "bg-red-50",
                    "hover:bg-gray-100"
                  )}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(date, e)}
                >
                  {/* Date number */}
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    isToday(date) && "text-blue-600 font-bold"
                  )}>
                    {date.getDate()}
                  </div>
                  
                  {/* Events */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "text-xs p-1 rounded cursor-pointer text-white truncate",
                          getEventColor(event),
                          draggedEvent?.id === event.id && "opacity-50"
                        )}
                        draggable
                        onDragStart={(e) => handleDragStart(event, e)}
                        onDragEnd={onEventDragEnd}
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="flex items-center space-x-1">
                          {getEventIcon(event.type)}
                          <span className="truncate">{event.title}</span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Show more indicator */}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                  
                  {/* Conflict indicators */}
                  {dayConflicts.length > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute top-1 right-1 text-xs h-4 w-4 p-0 flex items-center justify-center"
                    >
                      !
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
} 