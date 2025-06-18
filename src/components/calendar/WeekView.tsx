'use client';

import { CalendarEvent, ResourceAllocation, ScheduleConflict } from '@/types/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, Wrench, AlertTriangle, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  resourceAllocations: ResourceAllocation[];
  conflicts: ScheduleConflict[];
  onEventUpdate: (eventId: string, updates: Partial<CalendarEvent>) => void;
  onEventSelect: (event: CalendarEvent | null) => void;
  onResourceReallocation: (allocationId: string, newResourceId: string) => void;
}

export function WeekView({
  currentDate,
  events,
  resourceAllocations,
  conflicts,
  onEventUpdate,
  onEventSelect,
  onResourceReallocation
}: WeekViewProps) {
  const t = useTranslations('ManufacturingCalendar');

  // Generate week dates
  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start from Sunday
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDates.push(day);
    }
    return weekDates;
  };

  // Generate time slots (8 AM to 6 PM)
  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      slots.push({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        time: hour
      });
    }
    return slots;
  };

  const weekDates = getWeekDates(currentDate);
  const timeSlots = getTimeSlots();

  // Get events for a specific day and hour (including multi-day events)
  const getEventsForSlot = (date: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = event.startTime.toDate();
      const eventEnd = event.endTime.toDate();
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      // Check if event spans through this date
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const eventSpansThisDay = (
        (eventStart >= dayStart && eventStart <= dayEnd) ||           // Starts on this date
        (eventEnd >= dayStart && eventEnd <= dayEnd) ||               // Ends on this date
        (eventStart <= dayStart && eventEnd >= dayEnd)                // Spans through this date
      );

      // Then check if it overlaps with this specific hour slot
      const overlapsTimeSlot = (
        (eventStart >= slotStart && eventStart < slotEnd) ||
        (eventEnd > slotStart && eventEnd <= slotEnd) ||
        (eventStart <= slotStart && eventEnd >= slotEnd)
      );

      return eventSpansThisDay && overlapsTimeSlot;
    });
  };

  // Get conflicts for a specific slot
  const getConflictsForSlot = (date: Date, hour: number) => {
    return conflicts.filter(conflict => {
      return conflict.affectedEvents.some(eventId => {
        const event = events.find(e => e.id === eventId);
        if (!event) return false;
        
        const eventStart = event.startTime.toDate();
        return (
          eventStart.toDateString() === date.toDateString() &&
          eventStart.getHours() === hour
        );
      });
    });
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'job':
        return <Wrench className="h-3 w-3" />;
      case 'maintenance':
        return <AlertTriangle className="h-3 w-3" />;
      case 'meeting':
        return <Calendar className="h-3 w-3" />;
      case 'deadline':
        return <Clock className="h-3 w-3" />;
      default:
        return <Calendar className="h-3 w-3" />;
    }
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.color) return event.color;
    
    switch (event.type) {
      case 'job':
        return event.status === 'in_progress' ? '#10b981' : '#3b82f6';
      case 'maintenance':
        return '#f59e0b';
      case 'meeting':
        return '#8b5cf6';
      case 'deadline':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    onEventSelect(event);
  };



  return (
    <div className="flex flex-col h-full">
      {/* Week header */}
      <div className="grid grid-cols-8 border-b">
        <div className="p-2 text-sm font-medium text-muted-foreground">
          {t('time', { defaultMessage: 'Time' })}
        </div>
        {weekDates.map((date, index) => (
          <div key={index} className="p-2 text-center border-l">
            <div className="text-sm font-medium">
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className={cn(
              "text-lg font-semibold",
              date.toDateString() === new Date().toDateString() && "text-blue-600"
            )}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time slots and events */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-8">
          {timeSlots.map((slot) => (
            <div key={slot.hour} className="contents">
              {/* Time label */}
              <div className="p-2 text-sm text-muted-foreground border-b border-r bg-gray-50">
                {slot.label}
              </div>
              
              {/* Day columns */}
              {weekDates.map((date, dayIndex) => {
                const slotEvents = getEventsForSlot(date, slot.hour);
                const slotConflicts = getConflictsForSlot(date, slot.hour);
                
                return (
                  <div
                    key={`${slot.hour}-${dayIndex}`}
                    className={cn(
                      "min-h-[60px] p-1 border-b border-l relative",
                      slotConflicts.length > 0 && "bg-red-50",
                      "hover:bg-gray-50"
                    )}
                  >
                    {/* Events */}
                    {slotEvents.map((event) => (
                      <div
                        key={event.id}
                        className="mb-1 p-1 rounded text-xs cursor-pointer transition-all hover:shadow-md"
                        style={{
                          backgroundColor: getEventColor(event),
                          color: 'white'
                        }}
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="flex items-center space-x-1">
                          {getEventIcon(event.type)}
                          <span className="truncate flex-1">{event.title}</span>
                        </div>
                        {event.machineId && (
                          <div className="text-xs opacity-75 truncate">
                            {event.machineId}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Conflict indicators */}
                    {slotConflicts.map((conflict) => (
                      <Badge
                        key={conflict.id}
                        variant="destructive"
                        className="absolute top-1 right-1 text-xs"
                      >
                        !
                      </Badge>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 