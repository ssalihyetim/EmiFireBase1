'use client';

import { CalendarEvent, ResourceAllocation, ScheduleConflict } from '@/types/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, Wrench, AlertTriangle, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DayViewProps {
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

export function DayView({
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
}: DayViewProps) {
  const t = useTranslations('ManufacturingCalendar');

  // Generate time slots (6 AM to 8 PM)
  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 20; hour++) {
      slots.push({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        time: hour
      });
    }
    return slots;
  };

  const timeSlots = getTimeSlots();

  // Get events for a specific hour
  const getEventsForHour = (hour: number) => {
    return events.filter(event => {
      const eventStart = event.startTime.toDate();
      const eventEnd = event.endTime.toDate();
      
      // Check if event spans through the current date (multi-day support)
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const eventSpansThisDay = (
        (eventStart >= dayStart && eventStart <= dayEnd) ||           // Starts on this date
        (eventEnd >= dayStart && eventEnd <= dayEnd) ||               // Ends on this date
        (eventStart <= dayStart && eventEnd >= dayEnd)                // Spans through this date
      );
      
      if (!eventSpansThisDay) {
        return false;
      }
      
      const slotStart = new Date(currentDate);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(currentDate);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      return (
        (eventStart >= slotStart && eventStart < slotEnd) ||
        (eventEnd > slotStart && eventEnd <= slotEnd) ||
        (eventStart <= slotStart && eventEnd >= slotEnd)
      );
    });
  };

  // Get conflicts for a specific hour
  const getConflictsForHour = (hour: number) => {
    return conflicts.filter(conflict => {
      return conflict.affectedEvents.some(eventId => {
        const event = events.find(e => e.id === eventId);
        if (!event) return false;
        
        const eventStart = event.startTime.toDate();
        return (
          eventStart.toDateString() === currentDate.toDateString() &&
          eventStart.getHours() === hour
        );
      });
    });
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'job':
        return <Wrench className="h-4 w-4" />;
      case 'maintenance':
        return <AlertTriangle className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'deadline':
        return <Clock className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
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

  const getEventDuration = (event: CalendarEvent) => {
    const start = event.startTime.toDate();
    const end = event.endTime.toDate();
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    return durationHours;
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

  const handleDrop = (hour: number, e: React.DragEvent) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('text/plain');
    
    if (eventId && onEventDrop) {
      const newStartTime = new Date(currentDate);
      newStartTime.setHours(hour, 0, 0, 0);
      
      // Assume 1-hour duration for simplicity
      const newEndTime = new Date(newStartTime);
      newEndTime.setHours(hour + 1, 0, 0, 0);
      
      onEventDrop(eventId, newStartTime, newEndTime);
    }
    
    onEventDragEnd?.();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Day header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div className={cn(
            "text-2xl font-bold",
            currentDate.toDateString() === new Date().toDateString() && "text-blue-600"
          )}>
            {currentDate.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Time slots and events */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1">
          {timeSlots.map((slot) => {
            const hourEvents = getEventsForHour(slot.hour);
            const hourConflicts = getConflictsForHour(slot.hour);
            
            return (
              <div
                key={slot.hour}
                className={cn(
                  "min-h-[80px] border-b flex",
                  hourConflicts.length > 0 && "bg-red-50"
                )}
              >
                {/* Time label */}
                <div className="w-20 p-3 text-sm text-muted-foreground border-r bg-gray-50 flex-shrink-0">
                  {slot.label}
                </div>
                
                {/* Event area */}
                <div
                  className="flex-1 p-2 relative hover:bg-gray-50"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(slot.hour, e)}
                >
                  {/* Events */}
                  <div className="space-y-2">
                    {hourEvents.map((event) => {
                      const duration = getEventDuration(event);
                      const startTime = event.startTime.toDate();
                      const endTime = event.endTime.toDate();
                      
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "p-3 rounded-lg cursor-pointer transition-all shadow-sm",
                            "hover:shadow-md border-l-4",
                            draggedEvent?.id === event.id && "opacity-50"
                          )}
                          style={{
                            backgroundColor: `${getEventColor(event)}20`,
                            borderLeftColor: getEventColor(event)
                          }}
                          draggable
                          onDragStart={(e) => handleDragStart(event, e)}
                          onDragEnd={onEventDragEnd}
                          onClick={() => handleEventClick(event)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <div style={{ color: getEventColor(event) }}>
                                  {getEventIcon(event.type)}
                                </div>
                                <h4 className="font-medium text-sm">{event.title}</h4>
                                <Badge 
                                  variant={event.status === 'completed' ? 'default' : 
                                          event.status === 'in_progress' ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {event.status}
                                </Badge>
                              </div>
                              
                              <div className="text-xs text-muted-foreground mb-2">
                                {formatTime(startTime)} - {formatTime(endTime)} 
                                ({duration.toFixed(1)}h)
                              </div>
                              
                              {event.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {event.description}
                                </p>
                              )}
                              
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                {event.machineId && (
                                  <span>Machine: {event.machineId}</span>
                                )}
                                {event.operatorId && (
                                  <span>Operator: {event.operatorId}</span>
                                )}
                                {event.priority && (
                                  <Badge variant="outline" className="text-xs">
                                    {event.priority}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Conflict indicators */}
                  {hourConflicts.map((conflict) => (
                    <Badge
                      key={conflict.id}
                      variant="destructive"
                      className="absolute top-2 right-2 text-xs"
                    >
                      Conflict: {conflict.severity}
                    </Badge>
                  ))}
                  
                  {/* Empty slot indicator */}
                  {hourEvents.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-4">
                      {t('emptyTimeSlot', { defaultMessage: 'No events scheduled' })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 