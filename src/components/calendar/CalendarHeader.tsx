'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar, RefreshCw, Plus } from 'lucide-react';
import { CalendarHeaderProps } from '@/types/calendar';
import { useTranslations } from 'next-intl';

export function CalendarHeader({
  currentDate,
  currentView,
  onDateChange,
  onViewChange,
  onRefresh
}: CalendarHeaderProps) {
  const t = useTranslations('ManufacturingCalendar');

  const formatDateForView = (date: Date, view: string) => {
    const options: Intl.DateTimeFormatOptions = {};
    
    switch (view) {
      case 'day':
        options.weekday = 'long';
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        break;
      case 'week':
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'month':
        options.year = 'numeric';
        options.month = 'long';
        break;
    }
    
    return date.toLocaleDateString('en-US', options);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (currentView) {
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex items-center justify-between p-4 border-b">
      {/* Left side - Date navigation */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('prev')}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('next')}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-8"
          >
            {t('today', { defaultMessage: 'Today' })}
          </Button>
        </div>
        
        <div className="text-lg font-semibold">
          {formatDateForView(currentDate, currentView)}
        </div>
      </div>

      {/* Center - View selector */}
      <div className="flex items-center space-x-2">
        <Select value={currentView} onValueChange={onViewChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">
              {t('dayView', { defaultMessage: 'Day' })}
            </SelectItem>
            <SelectItem value="week">
              {t('weekView', { defaultMessage: 'Week' })}
            </SelectItem>
            <SelectItem value="month">
              {t('monthView', { defaultMessage: 'Month' })}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="h-8"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('refresh', { defaultMessage: 'Refresh' })}
        </Button>
        
        <Button
          size="sm"
          className="h-8"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('addEvent', { defaultMessage: 'Add Event' })}
        </Button>
      </div>
    </div>
  );
} 