import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

export async function GET() {
  try {
    // Fetch schedule entries
    const schedulesRef = collection(db, "schedules");
    
    // Try simple query first, then add orderBy if field exists
    let scheduleQuery;
    let scheduleSnapshot;
    
    try {
      scheduleQuery = query(schedulesRef, orderBy("scheduledStartTime", "asc"));
      scheduleSnapshot = await getDocs(scheduleQuery);
    } catch (orderByError) {
      // If orderBy fails, try without ordering
      console.log("OrderBy failed, trying simple query...");
      scheduleSnapshot = await getDocs(schedulesRef);
    }

    console.log(`📊 Found ${scheduleSnapshot.docs.length} documents in schedules collection`);

    const entries = scheduleSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Helper function to safely convert dates
      const convertToISOString = (dateField: any): string => {
        if (!dateField) return new Date().toISOString();
        
        // If it's already a string, return it
        if (typeof dateField === 'string') return dateField;
        
        // If it's a Firestore Timestamp
        if (dateField && typeof dateField.toDate === 'function') {
          return dateField.toDate().toISOString();
        }
        
        // If it's a Date object
        if (dateField instanceof Date) {
          return dateField.toISOString();
        }
        
        // If it's a seconds/nanoseconds object (Firestore timestamp format)
        if (dateField && typeof dateField === 'object' && 'seconds' in dateField) {
          return new Date(dateField.seconds * 1000).toISOString();
        }
        
        // Fallback
        return new Date().toISOString();
      };

      const startTime = convertToISOString(data.scheduledStartTime || data.startTime);
      const endTime = convertToISOString(data.scheduledEndTime || data.endTime);
      
      // Calculate duration in minutes
      const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60));

      return {
        id: doc.id,
        machineId: data.machineId || '',
        machineName: data.machineName || 'Unknown Machine',
        partName: data.partName || data.process?.name || 'Unknown Part',
        scheduledStartTime: startTime,
        scheduledEndTime: endTime,
        status: data.status || 'scheduled',
        quantity: data.quantity || 1,
        duration: duration > 0 ? duration : 0, // Ensure duration is not negative
        processInstanceId: data.processInstanceId,
        orderId: data.orderId
      };
    });

    // Fetch machine count
    const machinesRef = collection(db, "machines");
    const machinesSnapshot = await getDocs(machinesRef);
    const machineCount = machinesSnapshot.size;

    return NextResponse.json({
      success: true,
      entries,
      machineCount,
      totalEntries: entries.length,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error("Error fetching schedule:", error);
    
    // Return empty data instead of error when Firebase is offline/has issues
    return NextResponse.json({
      success: true,
      entries: [], // Return empty array instead of error
      machineCount: 30, // Default machine count
      totalEntries: 0,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
} 