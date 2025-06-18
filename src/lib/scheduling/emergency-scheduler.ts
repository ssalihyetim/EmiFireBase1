import { Timestamp } from 'firebase/firestore';
import { 
  CalendarEvent, 
  EmergencyApproval, 
  EmergencyScheduleConstraints,
  CalendarSettings,
  TimeSlot,
  CalendarConflict 
} from '@/types/manufacturing-calendar';
import { AvailabilityCalculator } from './availability-calculator';
import { ScheduleManager } from './schedule-manager';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, addDoc } from 'firebase/firestore';

export class EmergencyScheduler {
  private availabilityCalculator: AvailabilityCalculator;
  private scheduleManager: ScheduleManager;

  constructor() {
    this.availabilityCalculator = new AvailabilityCalculator();
    this.scheduleManager = new ScheduleManager();
  }

  /**
   * Schedule an emergency operation that can override normal working hours
   */
  async scheduleEmergencyOperation(
    event: CalendarEvent,
    calendarSettings: CalendarSettings,
    requestedBy: string
  ): Promise<{
    success: boolean;
    scheduledEvent?: CalendarEvent;
    approval?: EmergencyApproval;
    conflicts?: CalendarConflict[];
    message: string;
  }> {
    try {
      console.log(`🚨 EmergencyScheduler: Processing emergency operation: ${event.title}`);

      // Validate emergency operation
      const validation = this.validateEmergencyOperation(event, calendarSettings);
      if (!validation.isValid) {
        return {
          success: false,
          conflicts: validation.conflicts,
          message: `Emergency operation validation failed: ${validation.conflicts?.map(c => c.message).join(', ')}`
        };
      }

      // Check if approval is required
      const requiresApproval = this.requiresApproval(event, calendarSettings);
      
      if (requiresApproval) {
        // Create approval request
        const approval = await this.createApprovalRequest(event, requestedBy);
        
        return {
          success: true,
          approval,
          message: 'Emergency operation requires approval. Approval request has been created and notifications sent.'
        };
      }

      // No approval required, schedule immediately
      const scheduledEvent = await this.scheduleImmediately(event, calendarSettings);
      
      return {
        success: true,
        scheduledEvent,
        message: 'Emergency operation scheduled successfully.'
      };

    } catch (error) {
      console.error('❌ EmergencyScheduler: Failed to schedule emergency operation:', error);
      return {
        success: false,
        message: `Failed to schedule emergency operation: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get available emergency time slots (including afterhours and weekends)
   */
  async getEmergencyTimeSlots(
    machineId: string,
    durationMinutes: number,
    calendarSettings: CalendarSettings,
    urgencyLevel: 'urgent' | 'critical' | 'safety_critical' = 'urgent'
  ): Promise<TimeSlot[]> {
    try {
      console.log(`🚨 Getting emergency slots for machine ${machineId}, duration: ${durationMinutes}min, urgency: ${urgencyLevel}`);

      // Get emergency schedule constraints
      const constraints = this.getEmergencyConstraints(calendarSettings, urgencyLevel);
      
      // Get existing schedules for the machine
      const existingSchedules = await this.getExistingSchedules(machineId);
      
      // Calculate emergency time slots
      const emergencySlots = await this.calculateEmergencySlots(
        machineId,
        durationMinutes,
        constraints,
        existingSchedules
      );

      console.log(`🚨 Found ${emergencySlots.length} emergency time slots`);
      return emergencySlots;

    } catch (error) {
      console.error('❌ Error getting emergency time slots:', error);
      throw new Error('Failed to get emergency time slots');
    }
  }

  /**
   * Approve an emergency operation request
   */
  async approveEmergencyOperation(
    approvalId: string,
    approvedBy: string,
    calendarSettings: CalendarSettings
  ): Promise<{
    success: boolean;
    scheduledEvent?: CalendarEvent;
    message: string;
  }> {
    try {
      console.log(`✅ Approving emergency operation: ${approvalId}`);

      // Get approval request
      const approvalDoc = await getDoc(doc(db, 'emergency_approvals', approvalId));
      if (!approvalDoc.exists()) {
        return {
          success: false,
          message: 'Approval request not found'
        };
      }

      const approval = approvalDoc.data() as EmergencyApproval;
      
      // Update approval status
      await setDoc(doc(db, 'emergency_approvals', approvalId), {
        ...approval,
        approvedBy,
        approvedAt: new Date().toISOString(),
        status: 'approved'
      });

      // Get the original event data
      const eventDoc = await getDoc(doc(db, 'calendar_events', approval.eventId));
      if (!eventDoc.exists()) {
        return {
          success: false,
          message: 'Original event not found'
        };
      }

      const event = eventDoc.data() as CalendarEvent;
      
      // Schedule the approved emergency operation
      const scheduledEvent = await this.scheduleImmediately(event, calendarSettings);
      
      // Send approval notification
      await this.sendApprovalNotification(approval, scheduledEvent, 'approved');

      return {
        success: true,
        scheduledEvent,
        message: 'Emergency operation approved and scheduled successfully'
      };

    } catch (error) {
      console.error('❌ Error approving emergency operation:', error);
      return {
        success: false,
        message: `Failed to approve emergency operation: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate emergency operation
   */
  private validateEmergencyOperation(
    event: CalendarEvent,
    calendarSettings: CalendarSettings
  ): { isValid: boolean; conflicts?: CalendarConflict[] } {
    const conflicts: CalendarConflict[] = [];

    // Check if emergency operations are enabled
    if (!calendarSettings.emergencySettings.allowEmergencyAfterHours && event.allowAfterHours) {
      conflicts.push({
        type: 'emergency_override_required',
        message: 'After-hours emergency operations are not currently enabled',
        suggestedAlternatives: []
      });
    }

    if (!calendarSettings.emergencySettings.allowEmergencyWeekends && event.allowWeekends) {
      conflicts.push({
        type: 'emergency_override_required',
        message: 'Weekend emergency operations are not currently enabled',
        suggestedAlternatives: []
      });
    }

    // Check emergency duration limits
    const eventDurationHours = (event.estimatedDuration || 0) / 60;
    if (eventDurationHours > calendarSettings.emergencySettings.maxConsecutiveEmergencyHours) {
      conflicts.push({
        type: 'emergency_override_required',
        message: `Emergency operation duration (${eventDurationHours}h) exceeds maximum allowed (${calendarSettings.emergencySettings.maxConsecutiveEmergencyHours}h)`,
        suggestedAlternatives: []
      });
    }

    return {
      isValid: conflicts.length === 0,
      conflicts: conflicts.length > 0 ? conflicts : undefined
    };
  }

  /**
   * Check if emergency operation requires approval
   */
  private requiresApproval(event: CalendarEvent, calendarSettings: CalendarSettings): boolean {
    // Always require approval if configured
    if (calendarSettings.emergencySettings.requireApprovalForEmergency) {
      return true;
    }

    // Require approval for safety-critical operations
    if (event.emergencyLevel === 'safety_critical') {
      return true;
    }

    // Require approval for weekend operations
    if (event.allowWeekends) {
      return true;
    }

    // Require approval for long-duration operations
    const eventDurationHours = (event.estimatedDuration || 0) / 60;
    if (eventDurationHours > 8) { // More than 8 hours
      return true;
    }

    return false;
  }

  /**
   * Create approval request
   */
  private async createApprovalRequest(
    event: CalendarEvent,
    requestedBy: string
  ): Promise<EmergencyApproval> {
    const approval: Omit<EmergencyApproval, 'id'> = {
      eventId: event.id,
      requestedBy,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      reason: event.emergencyReason || 'Emergency operation required',
      emergencyLevel: event.emergencyLevel || 'urgent',
      estimatedDuration: event.estimatedDuration || 0,
      affectedMachines: event.machineId ? [event.machineId] : [],
      requiredResources: [],
      notes: event.notes
    };

    // Save approval request to Firestore
    const docRef = await addDoc(collection(db, 'emergency_approvals'), approval);
    
    const approvalWithId: EmergencyApproval = {
      ...approval,
      id: docRef.id
    };

    // Send notification to approvers
    await this.sendApprovalNotification(approvalWithId, event, 'requested');

    return approvalWithId;
  }

  /**
   * Schedule emergency operation immediately
   */
  private async scheduleImmediately(
    event: CalendarEvent,
    calendarSettings: CalendarSettings
  ): Promise<CalendarEvent> {
    // Mark as emergency and approved
    const emergencyEvent: CalendarEvent = {
      ...event,
      isEmergency: true,
      emergencyApprovalBy: 'system',
      emergencyApprovalTime: new Date().toISOString(),
      priority: 'emergency',
      updatedAt: new Date().toISOString()
    };

    // Save to calendar events collection
    await setDoc(doc(db, 'calendar_events', event.id), emergencyEvent);

    console.log(`✅ Emergency operation scheduled: ${event.title}`);
    return emergencyEvent;
  }

  /**
   * Get emergency scheduling constraints based on urgency level
   */
  private getEmergencyConstraints(
    calendarSettings: CalendarSettings,
    urgencyLevel: 'urgent' | 'critical' | 'safety_critical'
  ): EmergencyScheduleConstraints {
    const baseConstraints = calendarSettings.emergencySettings;

    switch (urgencyLevel) {
      case 'safety_critical':
        return {
          allowAfterHours: true,
          allowWeekends: true,
          emergencyWorkingHours: {
            start: '00:00',
            end: '23:59'
          },
          maxConsecutiveHours: 24,
          requiredApprovals: 2,
          notificationRequired: true
        };
      
      case 'critical':
        return {
          allowAfterHours: baseConstraints.allowEmergencyAfterHours,
          allowWeekends: baseConstraints.allowEmergencyWeekends,
          emergencyWorkingHours: baseConstraints.emergencyWorkingHours,
          maxConsecutiveHours: baseConstraints.maxConsecutiveEmergencyHours,
          requiredApprovals: 1,
          notificationRequired: true
        };
      
      case 'urgent':
      default:
        return {
          allowAfterHours: baseConstraints.allowEmergencyAfterHours,
          allowWeekends: false, // Urgent operations during weekdays only
          emergencyWorkingHours: baseConstraints.emergencyWorkingHours,
          maxConsecutiveHours: Math.min(baseConstraints.maxConsecutiveEmergencyHours, 12),
          requiredApprovals: 1,
          notificationRequired: true
        };
    }
  }

  /**
   * Get existing schedules for a machine
   */
  private async getExistingSchedules(machineId: string): Promise<CalendarEvent[]> {
    try {
      const schedulesSnapshot = await getDocs(
        query(
          collection(db, 'calendar_events'),
          where('machineId', '==', machineId),
          where('status', 'in', ['scheduled', 'in_progress'])
        )
      );

      return schedulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CalendarEvent));
    } catch (error) {
      console.warn('Could not get existing schedules:', error);
      return [];
    }
  }

  /**
   * Calculate emergency time slots
   */
  private async calculateEmergencySlots(
    machineId: string,
    durationMinutes: number,
    constraints: EmergencyScheduleConstraints,
    existingSchedules: CalendarEvent[]
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const now = new Date();
    
    // Look ahead for the next 7 days for emergency slots
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(now);
      currentDate.setDate(currentDate.getDate() + dayOffset);
      currentDate.setHours(0, 0, 0, 0);

      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Skip weekends if not allowed
      if (isWeekend && !constraints.allowWeekends) {
        continue;
      }

      // Determine working hours for this day
      let workingHours = constraints.emergencyWorkingHours;
      
      // For non-emergency hours, use regular working hours unless after-hours is allowed
      if (!constraints.allowAfterHours && !isWeekend) {
        workingHours = {
          start: '08:00',
          end: '17:00'
        };
      }

      // Create working period for this day
      const workingStart = this.createDateTimeFromTimeString(currentDate, workingHours.start);
      const workingEnd = this.createDateTimeFromTimeString(currentDate, workingHours.end);

      // If it's today, start from current time
      if (dayOffset === 0 && now > workingStart) {
        workingStart.setTime(now.getTime());
      }

      // Find available slots in this day
      const daySlots = this.findEmergencySlots(
        workingStart,
        workingEnd,
        durationMinutes,
        existingSchedules
      );

      slots.push(...daySlots);

      // Limit to reasonable number of options
      if (slots.length >= 10) {
        break;
      }
    }

    return slots.slice(0, 10); // Return top 10 emergency slots
  }

  /**
   * Find emergency slots within a day
   */
  private findEmergencySlots(
    workingStart: Date,
    workingEnd: Date,
    durationMinutes: number,
    existingSchedules: CalendarEvent[]
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const slotDuration = durationMinutes * 60 * 1000; // Convert to milliseconds

    // Sort existing schedules by start time
    const daySchedules = existingSchedules
      .filter(schedule => {
        const scheduleStart = new Date(schedule.startTime);
        return scheduleStart >= workingStart && scheduleStart <= workingEnd;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    let currentTime = new Date(workingStart);

    // Check slot before first schedule
    if (daySchedules.length === 0) {
      // No existing schedules, entire day is available
      if (workingEnd.getTime() - currentTime.getTime() >= slotDuration) {
        slots.push({
          start: Timestamp.fromDate(currentTime),
          end: Timestamp.fromDate(new Date(currentTime.getTime() + slotDuration)),
          duration: durationMinutes
        });
      }
    } else {
      // Check gaps between schedules
      for (let i = 0; i <= daySchedules.length; i++) {
        let slotEnd: Date;

        if (i === 0) {
          // Before first schedule
          slotEnd = new Date(daySchedules[0].startTime);
        } else if (i === daySchedules.length) {
          // After last schedule
          slotEnd = workingEnd;
          currentTime = new Date(daySchedules[i - 1].endTime);
        } else {
          // Between schedules
          slotEnd = new Date(daySchedules[i].startTime);
          currentTime = new Date(daySchedules[i - 1].endTime);
        }

        // Check if gap is large enough
        const availableTime = slotEnd.getTime() - currentTime.getTime();
        if (availableTime >= slotDuration) {
          slots.push({
            start: Timestamp.fromDate(currentTime),
            end: Timestamp.fromDate(new Date(currentTime.getTime() + slotDuration)),
            duration: durationMinutes
          });
        }
      }
    }

    return slots;
  }

  /**
   * Create date/time from time string
   */
  private createDateTimeFromTimeString(date: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Send approval notification (placeholder for real implementation)
   */
  private async sendApprovalNotification(
    approval: EmergencyApproval,
    event: CalendarEvent,
    action: 'requested' | 'approved' | 'rejected'
  ): Promise<void> {
    // In a real implementation, this would send emails/notifications
    console.log(`📧 Notification: Emergency operation ${action}`, {
      approvalId: approval.id,
      eventTitle: event.title,
      emergencyLevel: approval.emergencyLevel,
      action
    });
  }
} 