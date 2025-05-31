'use client';

import { useState } from 'react';
import { ConflictResolverProps, ScheduleConflict, ConflictResolution } from '@/types/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Clock, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function ConflictResolver({
  conflicts,
  events,
  resourceAllocations,
  onResolveConflict
}: ConflictResolverProps) {
  const t = useTranslations('ManufacturingCalendar');
  const [selectedConflict, setSelectedConflict] = useState<ScheduleConflict | null>(null);
  const [resolutionType, setResolutionType] = useState<ConflictResolution['type'] | ''>('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'resource_double_booking':
        return <AlertTriangle className="h-4 w-4" />;
      case 'time_overlap':
        return <Clock className="h-4 w-4" />;
      case 'dependency_violation':
        return <Calendar className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getResolutionOptions = (conflict: ScheduleConflict): { value: ConflictResolution['type']; label: string; description: string }[] => {
    const baseOptions = [
      {
        value: 'reschedule' as const,
        label: t('reschedule', { defaultMessage: 'Reschedule Event' }),
        description: t('rescheduleDescription', { defaultMessage: 'Move one or more events to different time slots' })
      },
      {
        value: 'reallocate_resource' as const,
        label: t('reallocateResource', { defaultMessage: 'Reallocate Resource' }),
        description: t('reallocateResourceDescription', { defaultMessage: 'Assign a different resource to the conflicting event' })
      },
      {
        value: 'manual_override' as const,
        label: t('manualOverride', { defaultMessage: 'Manual Override' }),
        description: t('manualOverrideDescription', { defaultMessage: 'Accept the conflict and proceed manually' })
      }
    ];

    // Add specific options based on conflict type
    if (conflict.type === 'resource_double_booking') {
      baseOptions.unshift({
        value: 'split_task' as const,
        label: t('splitTask', { defaultMessage: 'Split Task' }),
        description: t('splitTaskDescription', { defaultMessage: 'Divide the task into smaller parts that can be scheduled separately' })
      });
    }

    if (conflict.severity === 'low' || conflict.severity === 'medium') {
      baseOptions.push({
        value: 'extend_deadline' as const,
        label: t('extendDeadline', { defaultMessage: 'Extend Deadline' }),
        description: t('extendDeadlineDescription', { defaultMessage: 'Adjust project deadlines to accommodate the conflict' })
      });
    }

    return baseOptions;
  };

  const handleResolveConflict = async () => {
    if (!selectedConflict || !resolutionType) return;

    setIsResolving(true);

    try {
      const resolution: ConflictResolution = {
        type: resolutionType,
        description: resolutionNotes || `${resolutionType.replace('_', ' ')} resolution applied`,
        proposedChanges: [],
        estimatedImpact: {
          delayInHours: 0,
          costIncrease: 0,
          affectedJobs: []
        }
      };

      // Add specific changes based on resolution type
      if (resolutionType === 'reschedule' && selectedConflict.affectedEvents.length > 0) {
        const eventToReschedule = events.find(e => e.id === selectedConflict.affectedEvents[0]);
        if (eventToReschedule) {
          const newStartTime = new Date(eventToReschedule.startTime.toDate());
          newStartTime.setHours(newStartTime.getHours() + 2); // Move 2 hours later
          const newEndTime = new Date(eventToReschedule.endTime.toDate());
          newEndTime.setHours(newEndTime.getHours() + 2);

          resolution.proposedChanges.push({
            eventId: eventToReschedule.id,
            newStartTime: { toDate: () => newStartTime } as any,
            newEndTime: { toDate: () => newEndTime } as any,
            additionalNotes: resolutionNotes
          });

          resolution.estimatedImpact.delayInHours = 2;
        }
      }

      await onResolveConflict(selectedConflict.id, resolution);
      setSelectedConflict(null);
      setResolutionType('');
      setResolutionNotes('');
    } catch (error) {
      console.error('Error resolving conflict:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const getAffectedEventDetails = (eventId: string) => {
    return events.find(e => e.id === eventId);
  };

  const getAffectedResourceDetails = (resourceId: string) => {
    return resourceAllocations.find(r => r.resourceId === resourceId);
  };

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <>
      {/* Conflict List */}
      <div className="space-y-3">
        {conflicts.map((conflict) => (
          <Card key={conflict.id} className={cn("cursor-pointer transition-all hover:shadow-md", getSeverityColor(conflict.severity))}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">
                    {getConflictIcon(conflict.type)}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm font-medium">{conflict.description}</CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('conflictType', { defaultMessage: 'Type' })}: {conflict.type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className={getSeverityColor(conflict.severity)}>
                    {conflict.severity}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => setSelectedConflict(conflict)}
                    className="h-7"
                  >
                    {t('resolve', { defaultMessage: 'Resolve' })}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-medium mb-1">{t('affectedEvents', { defaultMessage: 'Affected Events' })}</div>
                  {conflict.affectedEvents.slice(0, 2).map((eventId) => {
                    const event = getAffectedEventDetails(eventId);
                    return (
                      <div key={eventId} className="text-muted-foreground">
                        {event?.title || eventId}
                      </div>
                    );
                  })}
                  {conflict.affectedEvents.length > 2 && (
                    <div className="text-muted-foreground">
                      +{conflict.affectedEvents.length - 2} more
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium mb-1">{t('affectedResources', { defaultMessage: 'Affected Resources' })}</div>
                  {conflict.affectedResources.slice(0, 2).map((resourceId) => {
                    const resource = getAffectedResourceDetails(resourceId);
                    return (
                      <div key={resourceId} className="text-muted-foreground">
                        {resource?.resourceName || resourceId}
                      </div>
                    );
                  })}
                  {conflict.affectedResources.length > 2 && (
                    <div className="text-muted-foreground">
                      +{conflict.affectedResources.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resolution Dialog */}
      <Dialog open={!!selectedConflict} onOpenChange={() => setSelectedConflict(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>{t('resolveConflict', { defaultMessage: 'Resolve Conflict' })}</span>
            </DialogTitle>
            <DialogDescription>
              {t('resolveConflictDescription', { defaultMessage: 'Choose how to resolve this scheduling conflict' })}
            </DialogDescription>
          </DialogHeader>

          {selectedConflict && (
            <div className="space-y-6">
              {/* Conflict Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('conflictDetails', { defaultMessage: 'Conflict Details' })}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="font-medium text-sm">{selectedConflict.description}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('detectedAt', { defaultMessage: 'Detected at' })}: {selectedConflict.detectedAt.toDate().toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="font-medium text-sm mb-2">{t('affectedEvents', { defaultMessage: 'Affected Events' })}</div>
                      {selectedConflict.affectedEvents.map((eventId) => {
                        const event = getAffectedEventDetails(eventId);
                        return (
                          <div key={eventId} className="text-sm p-2 bg-gray-50 rounded mb-1">
                            <div className="font-medium">{event?.title || eventId}</div>
                            {event && (
                              <div className="text-xs text-muted-foreground">
                                {event.startTime.toDate().toLocaleString()} - {event.endTime.toDate().toLocaleString()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div>
                      <div className="font-medium text-sm mb-2">{t('affectedResources', { defaultMessage: 'Affected Resources' })}</div>
                      {selectedConflict.affectedResources.map((resourceId) => {
                        const resource = getAffectedResourceDetails(resourceId);
                        return (
                          <div key={resourceId} className="text-sm p-2 bg-gray-50 rounded mb-1">
                            <div className="font-medium">{resource?.resourceName || resourceId}</div>
                            {resource && (
                              <div className="text-xs text-muted-foreground">
                                {resource.resourceType} - {resource.status}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Suggested Resolution */}
              {selectedConflict.suggestedResolution && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-sm text-blue-800 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('suggestedResolution', { defaultMessage: 'Suggested Resolution' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-blue-700 mb-3">
                      {selectedConflict.suggestedResolution.description}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setResolutionType(selectedConflict.suggestedResolution!.type);
                        setResolutionNotes(selectedConflict.suggestedResolution!.description);
                      }}
                      className="h-7"
                    >
                      {t('useSuggestedResolution', { defaultMessage: 'Use Suggested Resolution' })}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Resolution Options */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('resolutionMethod', { defaultMessage: 'Resolution Method' })}
                  </label>
                  <Select value={resolutionType} onValueChange={(value) => setResolutionType(value as ConflictResolution['type'])}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectResolutionMethod', { defaultMessage: 'Select resolution method' })} />
                    </SelectTrigger>
                    <SelectContent>
                      {getResolutionOptions(selectedConflict).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('resolutionNotes', { defaultMessage: 'Resolution Notes' })}
                  </label>
                  <Textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder={t('resolutionNotesPlaceholder', { defaultMessage: 'Add any additional notes about this resolution...' })}
                    rows={3}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedConflict(null)}
                  disabled={isResolving}
                >
                  {t('cancel', { defaultMessage: 'Cancel' })}
                </Button>
                <Button
                  onClick={handleResolveConflict}
                  disabled={!resolutionType || isResolving}
                  className="min-w-[100px]"
                >
                  {isResolving ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('resolving', { defaultMessage: 'Resolving...' })}</span>
                    </div>
                  ) : (
                    t('resolveConflict', { defaultMessage: 'Resolve Conflict' })
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 