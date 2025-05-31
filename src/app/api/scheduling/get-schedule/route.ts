import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

export async function GET() {
  try {
    // Fetch schedule entries
    const schedulesRef = collection(db, "schedules");
    const scheduleQuery = query(schedulesRef, orderBy("scheduledStartTime", "asc"));
    const scheduleSnapshot = await getDocs(scheduleQuery);

    const entries = scheduleSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        machineId: data.machineId,
        machineName: data.machineName,
        partName: data.partName,
        scheduledStartTime: data.scheduledStartTime,
        scheduledEndTime: data.scheduledEndTime,
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
    });

  } catch (error) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch schedule",
        entries: [],
        machineCount: 0,
        totalEntries: 0,
      }, 
      { status: 500 }
    );
  }
} 