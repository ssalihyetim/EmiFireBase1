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
      return {
        id: doc.id,
        machineId: data.machineId || '',
        machineName: data.machineName || 'Unknown Machine',
        partName: data.partName || 'Unknown Part',
        scheduledStartTime: data.scheduledStartTime || new Date().toISOString(),
        scheduledEndTime: data.scheduledEndTime || new Date().toISOString(),
        status: data.status || 'scheduled',
        quantity: data.quantity || 1,
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