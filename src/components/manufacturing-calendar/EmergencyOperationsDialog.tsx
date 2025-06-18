'use client';

import { useState } from 'react';
import { CalendarEvent, EmergencyApproval } from '@/types/manufacturing-calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, Shield } from 'lucide-react';

interface EmergencyOperationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleEmergency: (emergencyData: Partial<CalendarEvent>) => Promise<{
    success: boolean;
    approval?: EmergencyApproval;
    message: string;
  }>;
  machines: Array<{ id: string; name: string; type: string; isActive: boolean }>;
}

export function EmergencyOperationsDialog({
  open,
  onOpenChange,
  onScheduleEmergency,
  machines
}: EmergencyOperationsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Schedule Emergency Operation</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 p-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Emergency Operations System - Allows scheduling outside normal working hours and weekends for urgent manufacturing needs.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="emergencyTitle">Operation Title</Label>
              <Input id="emergencyTitle" placeholder="Emergency repair, urgent production..." />
            </div>
            
            <div>
              <Label htmlFor="emergencyMachine">Machine</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.filter(m => m.isActive).map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name} ({machine.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="emergencyReason">Emergency Reason</Label>
              <Textarea 
                id="emergencyReason" 
                placeholder="Explain why this operation cannot wait for normal scheduling..."
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow After-Hours Operation</Label>
                <p className="text-sm text-muted-foreground">Schedule outside normal 8 AM - 5 PM hours</p>
              </div>
              <Switch />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Weekend Operation</Label>
                <p className="text-sm text-muted-foreground">Schedule on Saturday or Sunday</p>
              </div>
              <Switch />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Emergency Operation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
