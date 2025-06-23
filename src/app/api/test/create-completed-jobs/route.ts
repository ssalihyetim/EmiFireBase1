import { NextRequest, NextResponse } from 'next/server';
import { createJob } from '@/lib/firebase-jobs';
import type { Job } from '@/types';

const testCompletedJobs: Partial<Job>[] = [
  {
    id: 'test-completed-001',
    orderId: 'order-001', 
    orderNumber: 'ORD-2024-001',
    clientName: 'Aerospace Components Inc.',
    item: {
      id: 'item-001',
      partName: 'Landing Gear Bracket',
      rawMaterialType: 'Aluminum 7075-T6',
      rawMaterialDimension: '100x50x25mm',
      materialCost: 45.00,
      machiningCost: 120.00,
      outsourcedProcessesCost: 25.00,
      unitPrice: 190.00,
      quantity: 5,
      totalPrice: 950.00,
      assignedProcesses: ['3-Axis Milling', 'Anodizing', 'Final Inspection']
    },
    status: 'Completed',
    dueDate: '2024-02-15',
    priority: 'urgent',
    specialInstructions: 'Critical aerospace component - AS9100D compliance required',
    createdAt: new Date('2024-01-10').toISOString(),
    updatedAt: new Date('2024-02-10').toISOString(),
    actualStartDate: '2024-01-15',
    actualCompletionDate: '2024-02-10',
    overallQualityScore: 9.2
  },
  {
    id: 'test-completed-002',
    orderId: 'order-002',
    orderNumber: 'ORD-2024-002', 
    clientName: 'Precision Manufacturing Co.',
    item: {
      id: 'item-002',
      partName: 'Hydraulic Valve Body',
      rawMaterialType: 'Stainless Steel 316L',
      rawMaterialDimension: '80x80x40mm',
      materialCost: 65.00,
      machiningCost: 180.00,
      outsourcedProcessesCost: 0.00,
      unitPrice: 245.00,
      quantity: 10,
      totalPrice: 2450.00,
      assignedProcesses: ['4-Axis Milling', 'Grinding', 'Pressure Testing']
    },
    status: 'Completed',
    dueDate: '2024-01-30',
    priority: 'normal',
    specialInstructions: 'High precision hydraulic component',
    createdAt: new Date('2024-01-05').toISOString(),
    updatedAt: new Date('2024-01-28').toISOString(),
    actualStartDate: '2024-01-08',
    actualCompletionDate: '2024-01-28',
    overallQualityScore: 8.7
  },
  {
    id: 'test-completed-003',
    orderId: 'order-003',
    orderNumber: 'ORD-2024-003',
    clientName: 'Medical Device Solutions',
    item: {
      id: 'item-003',
      partName: 'Surgical Instrument Handle',
      rawMaterialType: 'Titanium Ti-6Al-4V',
      rawMaterialDimension: '120x15x10mm',
      materialCost: 85.00,
      machiningCost: 220.00,
      outsourcedProcessesCost: 40.00,
      unitPrice: 345.00,
      quantity: 25,
      totalPrice: 8625.00,
      assignedProcesses: ['5-Axis Milling', 'EDM', 'Passivation', 'Laser Marking']
    },
    status: 'Completed',
    dueDate: '2024-03-01',
    priority: 'critical',
    specialInstructions: 'Medical grade - FDA compliance required',
    createdAt: new Date('2024-01-28').toISOString(),
    updatedAt: new Date('2024-02-25').toISOString(),
    actualStartDate: '2024-02-01',
    actualCompletionDate: '2024-02-25',
    overallQualityScore: 9.5
  }
];

export async function POST(request: NextRequest) {
  try {
    console.log('🏭 Creating test completed jobs...');
    
    const results = [];
    
    for (const jobData of testCompletedJobs) {
      try {
        await createJob(jobData as Job);
        results.push({
          id: jobData.id,
          partName: jobData.item?.partName,
          status: 'created'
        });
        console.log(`✅ Created completed job: ${jobData.item?.partName} (${jobData.id})`);
      } catch (error) {
        console.error(`❌ Failed to create job ${jobData.id}:`, error);
        results.push({
          id: jobData.id,
          partName: jobData.item?.partName,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const successCount = results.filter(r => r.status === 'created').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    
    return NextResponse.json({
      success: true,
      message: `Created ${successCount} completed jobs${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      results,
      summary: {
        totalJobs: testCompletedJobs.length,
        created: successCount,
        failed: failedCount,
        allJobsCompleted: successCount === testCompletedJobs.length,
        patternEligible: successCount > 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating test completed jobs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 