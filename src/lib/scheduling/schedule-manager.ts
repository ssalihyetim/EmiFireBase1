import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { 
  ScheduleEntry, 
  ScheduleEntryFirestore, 
  DateRange, 
  Conflict, 
  TimeSlot 
} from '@/types/planning';

export class ScheduleManager {
  private readonly collectionName = 'schedules';

  /**
   * Create a new schedule entry
   */
  async createScheduleEntry(entry: Omit<ScheduleEntry, 'id'>): Promise<string> {
    try {
      const firestoreEntry: Omit<ScheduleEntryFirestore, 'id'> = {
        ...entry,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        // Convert string timestamps to Firestore Timestamps for legacy compatibility
        scheduledStartTime: entry.startTime,
        scheduledEndTime: entry.endTime,
      };

      const docRef = await addDoc(collection(db, this.collectionName), firestoreEntry);
      return docRef.id;
    } catch (error) {
      console.error('Error creating schedule entry:', error);
      throw new Error('Failed to create schedule entry');
    }
  }

  /**
   * Update an existing schedule entry
   */
  async updateScheduleEntry(id: string, updates: Partial<ScheduleEntry>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const updateData: Partial<ScheduleEntryFirestore> = {
        updatedAt: serverTimestamp() as Timestamp,
      };

      // Copy non-timestamp fields
      if (updates.machineId) updateData.machineId = updates.machineId;
      if (updates.processInstanceId) updateData.processInstanceId = updates.processInstanceId;
      if (updates.orderId) updateData.orderId = updates.orderId;
      if (updates.status) updateData.status = updates.status;
      if (updates.operatorNotes) updateData.operatorNotes = updates.operatorNotes;
      if (updates.jobId) updateData.jobId = updates.jobId;
      if (updates.partName) updateData.partName = updates.partName;
      if (updates.quantity) updateData.quantity = updates.quantity;
      if (updates.process) updateData.process = updates.process;
      if (updates.machineName) updateData.machineName = updates.machineName;
      if (updates.dependencies) updateData.dependencies = updates.dependencies;

      // Handle timestamp fields properly
      if (updates.startTime) {
        updateData.startTime = updates.startTime;
        updateData.scheduledStartTime = updates.startTime;
      }
      if (updates.endTime) {
        updateData.endTime = updates.endTime;
        updateData.scheduledEndTime = updates.endTime;
      }
      if (updates.actualStartTime) {
        updateData.actualStartTime = updates.actualStartTime;
      }
      if (updates.actualEndTime) {
        updateData.actualEndTime = updates.actualEndTime;
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating schedule entry:', error);
      throw new Error('Failed to update schedule entry');
    }
  }

  /**
   * Delete a schedule entry
   */
  async deleteScheduleEntry(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting schedule entry:', error);
      throw new Error('Failed to delete schedule entry');
    }
  }

  /**
   * Get machine schedule for a specific date range
   */
  async getMachineSchedule(machineId: string, dateRange?: DateRange): Promise<ScheduleEntry[]> {
    try {
      // First check if the schedules collection exists and has any documents
      const collectionRef = collection(db, this.collectionName);
      const simpleQuery = query(collectionRef, limit(1));
      const testSnapshot = await getDocs(simpleQuery);
      
      if (testSnapshot.empty) {
        console.log('   📊 No schedules collection or empty collection, returning empty array');
        return [];
      }

      let scheduleQuery = query(
        collection(db, this.collectionName),
        where('machineId', '==', machineId),
        orderBy('startTime', 'asc')
      );

      if (dateRange) {
        const startTimestamp = Timestamp.fromDate(new Date(dateRange.start));
        const endTimestamp = Timestamp.fromDate(new Date(dateRange.end));
        
        scheduleQuery = query(
          collection(db, this.collectionName),
          where('machineId', '==', machineId),
          where('startTime', '>=', startTimestamp),
          where('startTime', '<=', endTimestamp),
          orderBy('startTime', 'asc')
        );
      }

      const querySnapshot = await getDocs(scheduleQuery);
      return this.convertFirestoreToScheduleEntries(querySnapshot);
    } catch (error) {
      console.error('Error getting machine schedule:', error);
      // If it's an index error and we have no schedules, return empty array
      if (error instanceof Error && error.message.includes('index')) {
        console.log('   📊 Index error but likely no schedules exist, returning empty array');
        return [];
      }
      throw new Error('Failed to get machine schedule');
    }
  }

  /**
   * Get all schedule entries for a date range
   */
  async getScheduleEntries(dateRange?: DateRange): Promise<ScheduleEntry[]> {
    try {
      let scheduleQuery = query(
        collection(db, this.collectionName),
        orderBy('startTime', 'asc')
      );

      if (dateRange) {
        const startTimestamp = Timestamp.fromDate(new Date(dateRange.start));
        const endTimestamp = Timestamp.fromDate(new Date(dateRange.end));
        
        scheduleQuery = query(
          collection(db, this.collectionName),
          where('startTime', '>=', startTimestamp),
          where('startTime', '<=', endTimestamp),
          orderBy('startTime', 'asc')
        );
      }

      const querySnapshot = await getDocs(scheduleQuery);
      return this.convertFirestoreToScheduleEntries(querySnapshot);
    } catch (error) {
      console.error('Error getting schedule entries:', error);
      throw new Error('Failed to get schedule entries');
    }
  }

  /**
   * Detect conflicts in a new schedule entry
   */
  async detectConflicts(newEntry: ScheduleEntry): Promise<Conflict[]> {
    try {
      // Get existing schedules for the same machine
      const existingSchedules = await this.getMachineSchedule(newEntry.machineId);
      const conflicts: Conflict[] = [];

      // Check for time conflicts
      existingSchedules.forEach(existing => {
        if (existing.id === newEntry.id) return; // Skip self

        const newStart = newEntry.startTime.toMillis();
        const newEnd = newEntry.endTime.toMillis();
        const existingStart = existing.startTime.toMillis();
        const existingEnd = existing.endTime.toMillis();

        // Check for overlap
        if (newStart < existingEnd && existingStart < newEnd) {
          conflicts.push({
            type: 'machine_conflict',
            description: `Time conflict with existing job on machine ${newEntry.machineId}`,
            conflictingEntries: [newEntry.id, existing.id],
            suggestedResolution: 'Reschedule to a different time slot'
          });
        }
      });

      return conflicts;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      throw new Error('Failed to detect conflicts');
    }
  }

  /**
   * Calculate machine availability for scheduling
   */
  async calculateMachineAvailability(machineId: string): Promise<TimeSlot[]> {
    try {
      // Get current schedules for the machine
      const schedules = await this.getMachineSchedule(machineId);
      
      // For now, return a simple implementation
      // This would be enhanced with working hours, maintenance windows, etc.
      const availableSlots: TimeSlot[] = [];
      
      // If no schedules, machine is available from now
      if (schedules.length === 0) {
        const now = Timestamp.now();
        const tomorrow = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
        
        availableSlots.push({
          start: now,
          end: tomorrow,
          duration: 24 * 60 // 24 hours in minutes
        });
      } else {
        // Find gaps between scheduled jobs
        for (let i = 0; i < schedules.length - 1; i++) {
          const current = schedules[i];
          const next = schedules[i + 1];
          
          const gapStart = current.endTime;
          const gapEnd = next.startTime;
          const gapDuration = (gapEnd.toMillis() - gapStart.toMillis()) / (1000 * 60);
          
          if (gapDuration > 0) {
            availableSlots.push({
              start: gapStart,
              end: gapEnd,
              duration: gapDuration
            });
          }
        }
      }

      return availableSlots;
    } catch (error) {
      console.error('Error calculating machine availability:', error);
      throw new Error('Failed to calculate machine availability');
    }
  }

  /**
   * Convert Firestore documents to ScheduleEntry objects
   */
  private convertFirestoreToScheduleEntries(querySnapshot: any): ScheduleEntry[] {
    const scheduleEntries: ScheduleEntry[] = [];

    querySnapshot.forEach((doc: any) => {
      const data = doc.data();
      scheduleEntries.push({
        id: doc.id,
        machineId: data.machineId,
        processInstanceId: data.processInstanceId,
        orderId: data.orderId,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        actualStartTime: data.actualStartTime,
        actualEndTime: data.actualEndTime,
        operatorNotes: data.operatorNotes,
        // Legacy compatibility fields
        jobId: data.jobId || data.processInstanceId,
        partName: data.partName || '',
        quantity: data.quantity || 1,
        process: data.process || {},
        machineName: data.machineName || '',
        scheduledStartTime: data.startTime?.toDate().toISOString() || '',
        scheduledEndTime: data.endTime?.toDate().toISOString() || '',
        dependencies: data.dependencies,
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
      } as ScheduleEntry);
    });

    return scheduleEntries;
  }
} 