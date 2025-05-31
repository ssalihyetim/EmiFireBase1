'use client';

import { useState } from 'react';
import { CalendarViewProps, CalendarEvent } from '@/types/calendar';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { DayView } from './DayView';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';

export function CalendarView({
  view,
  currentDate,
  events,
  resourceAllocations,
  conflicts,
  loading,
  onEventUpdate,
  onEventSelect,
  onResourceReallocation
}: CalendarViewProps) {
  const t = useTranslations('ManufacturingCalendar');
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

  const handleEventDragStart = (event: CalendarEvent) => {
    setDraggedEvent(event);
  };

  const handleEventDragEnd = () => {
    setDraggedEvent(null);
  };

  const handleEventDrop = (eventId: string, newStartTime: Date, newEndTime: Date) => {
    const duration = newEndTime.getTime() - newStartTime.getTime();
    onEventUpdate(eventId, {
      startTime: { toDate: () => newStartTime } as any,
      endTime: { toDate: () => newEndTime } as any
    });
    setDraggedEvent(null);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const commonProps = {
    currentDate,
    events,
    resourceAllocations,
    conflicts,
    onEventUpdate,
    onEventSelect,
    onResourceReallocation,
    onEventDragStart: handleEventDragStart,
    onEventDragEnd: handleEventDragEnd,
    onEventDrop: handleEventDrop,
    draggedEvent
  };

  switch (view) {
    case 'day':
      return <DayView {...commonProps} />;
    case 'week':
      return <WeekView {...commonProps} />;
    case 'month':
      return <MonthView {...commonProps} />;
    default:
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          {t('invalidView', { defaultMessage: 'Invalid calendar view' })}
        </div>
      );
  }
} 