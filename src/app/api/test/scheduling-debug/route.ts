import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug API: Analyzing scheduling environment...');
    
    // Check machines
    const machinesSnapshot = await getDocs(collection(db, 'machines'));
    const machines: any[] = [];
    
    machinesSnapshot.forEach(doc => {
      const data = doc.data();
      machines.push({
        id: doc.id,
        name: data.name,
        type: data.type,
        isActive: data.isActive,
        capabilities: data.capabilities,
        workingHours: data.workingHours,
        currentWorkload: data.currentWorkload
      });
    });
    
    // Analysis
    const activeMachines = machines.filter(m => m.isActive);
    const machineTypes = [...new Set(machines.map(m => m.type))];
    const allCapabilities = [...new Set(machines.flatMap(m => m.capabilities || []))];
    
    console.log(`📊 Found ${machines.length} total machines, ${activeMachines.length} active`);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalMachines: machines.length,
        activeMachines: activeMachines.length,
        machineTypes,
        allCapabilities
      },
      machines,
      recommendations: machines.length === 0 ? [
        'No machines found - use the Seed Machines button to create sample data',
        'Visit /api/test/machines to verify database connection'
      ] : activeMachines.length === 0 ? [
        'Machines exist but none are active - check isActive field',
        'Update machine configurations to set isActive: true'
      ] : [
        'Machine configuration looks good for scheduling',
        `Available machine types: ${machineTypes.join(', ')}`,
        `Available capabilities: ${allCapabilities.join(', ')}`
      ]
    });
  } catch (error) {
    console.error('❌ Debug API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to analyze scheduling environment', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 