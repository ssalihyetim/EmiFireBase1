import { NextRequest, NextResponse } from "next/server";
import { EnhancedAutoScheduler } from "@/lib/scheduling/enhanced-auto-scheduler";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { ProcessInstance, Machine } from "@/types/planning";

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Enhanced auto-schedule API called');
    
    const { processInstances, options } = await request.json();
    
    if (!processInstances || !Array.isArray(processInstances)) {
      return NextResponse.json(
        { success: false, error: "Invalid process instances provided" },
        { status: 400 }
      );
    }

    console.log(`📋 Processing ${processInstances.length} process instances with enhanced algorithm`);

    // Fetch machines from database
    const machinesSnapshot = await getDocs(collection(db, "machines"));
    const machines: Machine[] = machinesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        model: data.model,
        isActive: data.isActive,
        capabilities: data.capabilities,
        hourlyRate: data.hourlyRate,
        currentWorkload: data.currentWorkload || 0,
        availableFrom: data.availableFrom,
        workingHours: data.workingHours,
        operatorRequired: data.operatorRequired,
        maintenanceWindows: data.maintenanceWindows || [],
        maintenanceSchedule: data.maintenanceSchedule,
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString()
      } as Machine;
    });

    if (machines.length === 0) {
      return NextResponse.json(
        { success: false, error: "No machines found in database" },
        { status: 500 }
      );
    }

    console.log(`🏭 Found ${machines.length} machines for enhanced scheduling`);

    // Initialize enhanced auto-scheduler with custom options
    const enhancedScheduler = new EnhancedAutoScheduler(options);

    // Run enhanced scheduling algorithm
    console.log('🧠 Starting enhanced scheduling algorithm...');
    const result = await enhancedScheduler.scheduleProcessInstances(
      processInstances as ProcessInstance[],
      machines,
      options
    );

    if (result.success) {
      console.log(`✅ Enhanced scheduling completed successfully:`);
      console.log(`   📊 Scheduled ${result.entries.length} jobs`);
      console.log(`   ⚠️ ${result.conflicts.length} conflicts detected`);
      console.log(`   ⏱️ Processing time: ${result.metrics.schedulingDurationMs}ms`);
      console.log(`   📈 Average utilization: ${result.metrics.averageUtilization}%`);
      
      return NextResponse.json({
        success: true,
        entries: result.entries.map(entry => ({
          ...entry,
          // Convert Timestamps to ISO strings for JSON serialization
          startTime: entry.startTime.toDate().toISOString(),
          endTime: entry.endTime.toDate().toISOString(),
          actualStartTime: entry.actualStartTime?.toDate().toISOString(),
          actualEndTime: entry.actualEndTime?.toDate().toISOString()
        })),
        conflicts: result.conflicts,
        metrics: result.metrics,
        algorithm: 'enhanced',
        features: [
          'Multi-objective optimization',
          'Advanced priority calculation',
          'Sophisticated machine matching',
          'Critical path analysis',
          'Setup time optimization',
          'Load balancing',
          'Dependency resolution'
        ]
      });
    } else {
      console.error('❌ Enhanced scheduling failed:', result.conflicts);
      return NextResponse.json(
        { 
          success: false, 
          error: "Enhanced scheduling failed",
          conflicts: result.conflicts,
          metrics: result.metrics
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('💥 Enhanced auto-schedule API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        algorithm: 'enhanced'
      },
      { status: 500 }
    );
  }
} 