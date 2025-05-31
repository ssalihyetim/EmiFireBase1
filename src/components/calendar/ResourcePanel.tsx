'use client';

import { useState } from 'react';
import { ResourcePanelProps, ResourceAllocation, ScheduleConflict } from '@/types/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wrench, User, Settings, Package, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function ResourcePanel({
  resourceAllocations,
  conflicts,
  onResourceReallocation
}: ResourcePanelProps) {
  const t = useTranslations('ManufacturingCalendar');
  const [selectedResource, setSelectedResource] = useState<string | null>(null);

  // Group allocations by resource type
  const groupedAllocations = resourceAllocations.reduce((acc, allocation) => {
    if (!acc[allocation.resourceType]) {
      acc[allocation.resourceType] = [];
    }
    acc[allocation.resourceType].push(allocation);
    return acc;
  }, {} as Record<string, ResourceAllocation[]>);

  // Calculate utilization statistics
  const getUtilizationStats = (allocations: ResourceAllocation[]) => {
    if (allocations.length === 0) return { average: 0, max: 0, min: 0 };
    
    const utilizations = allocations
      .filter(a => a.utilizationPercentage !== undefined)
      .map(a => a.utilizationPercentage!);
    
    if (utilizations.length === 0) return { average: 0, max: 0, min: 0 };
    
    return {
      average: utilizations.reduce((sum, util) => sum + util, 0) / utilizations.length,
      max: Math.max(...utilizations),
      min: Math.min(...utilizations)
    };
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'machine':
        return <Wrench className="h-4 w-4" />;
      case 'operator':
        return <User className="h-4 w-4" />;
      case 'tool':
        return <Settings className="h-4 w-4" />;
      case 'fixture':
        return <Package className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_use':
        return 'bg-green-500';
      case 'allocated':
        return 'bg-blue-500';
      case 'available':
        return 'bg-gray-500';
      case 'maintenance':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600';
    if (utilization >= 75) return 'text-yellow-600';
    if (utilization >= 50) return 'text-blue-600';
    return 'text-green-600';
  };

  const handleResourceReallocation = (allocationId: string, newResourceId: string) => {
    onResourceReallocation(allocationId, newResourceId);
  };

  // Get conflicts affecting specific resources
  const getResourceConflicts = (resourceId: string) => {
    return conflicts.filter(conflict => 
      conflict.affectedResources.includes(resourceId)
    );
  };

  return (
    <div className="space-y-4">
      {/* Resource Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            {t('resourceOverview', { defaultMessage: 'Resource Overview' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(groupedAllocations).map(([type, allocations]) => {
              const stats = getUtilizationStats(allocations);
              
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getResourceIcon(type)}
                      <span className="font-medium capitalize">{type}s</span>
                      <Badge variant="outline">{allocations.length}</Badge>
                    </div>
                    <span className={cn("text-sm font-medium", getUtilizationColor(stats.average))}>
                      {stats.average.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={stats.average} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Min: {stats.min.toFixed(1)}%</span>
                    <span>Max: {stats.max.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resource Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('resourceDetails', { defaultMessage: 'Resource Details' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="machines" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="machines">
                {t('machines', { defaultMessage: 'Machines' })}
              </TabsTrigger>
              <TabsTrigger value="operators">
                {t('operators', { defaultMessage: 'Operators' })}
              </TabsTrigger>
              <TabsTrigger value="tools">
                {t('tools', { defaultMessage: 'Tools' })}
              </TabsTrigger>
              <TabsTrigger value="fixtures">
                {t('fixtures', { defaultMessage: 'Fixtures' })}
              </TabsTrigger>
            </TabsList>

            {['machine', 'operator', 'tool', 'fixture'].map((resourceType) => (
              <TabsContent key={resourceType} value={`${resourceType}s`} className="space-y-3">
                {groupedAllocations[resourceType]?.map((allocation) => {
                  const resourceConflicts = getResourceConflicts(allocation.resourceId);
                  
                  return (
                    <div
                      key={allocation.id}
                      className={cn(
                        "p-3 border rounded-lg space-y-2",
                        resourceConflicts.length > 0 && "border-red-200 bg-red-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getResourceIcon(allocation.resourceType)}
                          <span className="font-medium">{allocation.resourceName}</span>
                          <div className={cn("w-2 h-2 rounded-full", getStatusColor(allocation.status))} />
                        </div>
                        <Badge variant={allocation.status === 'in_use' ? 'default' : 'outline'}>
                          {allocation.status}
                        </Badge>
                      </div>

                      {allocation.utilizationPercentage !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Utilization</span>
                            <span className={getUtilizationColor(allocation.utilizationPercentage)}>
                              {allocation.utilizationPercentage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={allocation.utilizationPercentage} className="h-1" />
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        <div>Allocated to: {allocation.allocatedTo}</div>
                        <div>
                          {allocation.startTime.toDate().toLocaleString()} - {allocation.endTime.toDate().toLocaleString()}
                        </div>
                      </div>

                      {/* Conflict indicators */}
                      {resourceConflicts.length > 0 && (
                        <div className="space-y-1">
                          {resourceConflicts.map((conflict) => (
                            <div key={conflict.id} className="flex items-center space-x-2 text-xs text-red-600">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{conflict.description}</span>
                              <Badge variant="destructive" className="text-xs">
                                {conflict.severity}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reallocation controls */}
                      {allocation.status === 'allocated' && (
                        <div className="flex items-center space-x-2 pt-2 border-t">
                          <Select onValueChange={(newResourceId) => handleResourceReallocation(allocation.id, newResourceId)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Reallocate to..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="machine-turning-2">CNC Lathe TNC2000</SelectItem>
                              <SelectItem value="machine-milling-3">AWEA VM-1020</SelectItem>
                              <SelectItem value="machine-5axis-2">Spinner U1520</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" className="h-8 text-xs">
                            {t('reallocate', { defaultMessage: 'Reallocate' })}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                }) || (
                  <div className="text-center text-muted-foreground py-4">
                    {t('noResourcesAllocated', { defaultMessage: 'No resources allocated' })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Conflicts Summary */}
      {conflicts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {t('activeConflicts', { defaultMessage: 'Active Conflicts' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conflicts.slice(0, 5).map((conflict) => (
                <div key={conflict.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-red-800">{conflict.description}</div>
                      <div className="text-xs text-red-600 mt-1">
                        Type: {conflict.type.replace('_', ' ')}
                      </div>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {conflict.severity}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <div>Affected Events: {conflict.affectedEvents.length}</div>
                    <div>Affected Resources: {conflict.affectedResources.length}</div>
                    <div>Detected: {conflict.detectedAt.toDate().toLocaleString()}</div>
                  </div>

                  {conflict.suggestedResolution && (
                    <div className="mt-2 pt-2 border-t border-red-200">
                      <div className="text-xs font-medium text-red-800 mb-1">
                        Suggested Resolution:
                      </div>
                      <div className="text-xs text-red-700">
                        {conflict.suggestedResolution.description}
                      </div>
                      <Button size="sm" variant="outline" className="mt-2 h-6 text-xs">
                        {t('applyResolution', { defaultMessage: 'Apply Resolution' })}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              
              {conflicts.length > 5 && (
                <div className="text-center">
                  <Button variant="outline" size="sm">
                    {t('viewAllConflicts', { count: conflicts.length - 5, defaultMessage: 'View {count} more conflicts' })}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('quickActions', { defaultMessage: 'Quick Actions' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Clock className="h-4 w-4 mr-2" />
              {t('scheduleMaintenanceWindow', { defaultMessage: 'Schedule Maintenance Window' })}
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <User className="h-4 w-4 mr-2" />
              {t('reassignOperator', { defaultMessage: 'Reassign Operator' })}
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Wrench className="h-4 w-4 mr-2" />
              {t('checkMachineAvailability', { defaultMessage: 'Check Machine Availability' })}
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {t('resolveAllConflicts', { defaultMessage: 'Resolve All Conflicts' })}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 