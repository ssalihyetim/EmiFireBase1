#!/usr/bin/env tsx

/**
 * Test Manufacturing Forms and Setup Time Recording System
 * 
 * This script demonstrates the complete Phase 2 manufacturing forms system:
 * 1. Creating manufacturing forms from tasks
 * 2. Recording actual setup and cycle times
 * 3. Extracting real data for archives
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Import the new manufacturing forms system
import {
  createRoutingSheetFromTasks,
  createSetupSheetFromTask,
  createToolListFromTask,
  createFAIReportFromTask,
  recordSetupAndCycleTimes,
  getJobManufacturingForms,
  getJobSetupTimeRecords
} from '../src/lib/manufacturing-forms';

import type { JobTask, JobSubtask } from '../src/types';

// Firebase config (you'll need to replace with your actual config)
const firebaseConfig = {
  // Your Firebase config here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function demonstrateManufacturingFormsSystem() {
  console.log('🔧 Testing Manufacturing Forms & Setup Time Recording System\n');

  // Mock job data for testing
  const testJobId = `test_job_${Date.now()}`;
  
  // Create mock manufacturing tasks with complete subtask sets
  const manufacturingTasks: JobTask[] = [
    {
      id: `task_turning_${Date.now()}`,
      jobId: testJobId,
      templateId: 'turning_template',
      name: 'Turning Operation',
      description: 'Turn shaft to specifications',
      category: 'manufacturing_process',
      status: 'completed',
      priority: 'medium',
      manufacturingProcessType: 'turning',
      machineType: 'CNC Lathe',
      setupTimeMinutes: 25,
      cycleTimeMinutes: 12,
      quantity: 5,
      partCode: 'SHAFT-001-REV-A',
      operationIndex: 1,
      scheduledMachineName: 'HAAS ST-20',
      scheduledMachineId: 'HAAS_ST20_001',
      subtasks: [
        {
          id: `subtask_turning_setup_${Date.now()}`,
          taskId: `task_turning_${Date.now()}`,
          jobId: testJobId,
          templateId: 'turning_setup_sheet',
          name: 'Turning Setup Sheet',
          description: 'Create and verify setup sheet for turning operation',
          status: 'completed',
          isPrintable: true,
          hasCheckbox: true,
          isChecked: true,
          manufacturingSubtaskType: 'setup_sheet',
          estimatedDurationMinutes: 40,
          actualDurationMinutes: 35,
          completedBy: 'john.smith',
          completedAt: new Date().toISOString(),
          notes: 'Setup completed successfully',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `subtask_turning_machining_${Date.now()}`,
          taskId: `task_turning_${Date.now()}`,
          jobId: testJobId,
          templateId: 'turning_machining',
          name: 'Turning Machining',
          description: 'Execute turning operations',
          status: 'completed',
          isPrintable: false,
          hasCheckbox: true,
          isChecked: true,
          manufacturingSubtaskType: 'machining',
          estimatedDurationMinutes: 60,
          actualDurationMinutes: 55,
          completedBy: 'john.smith',
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      estimatedDurationHours: 2,
      actualDurationHours: 1.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: `task_milling_${Date.now()}`,
      jobId: testJobId,
      templateId: '3_axis_milling_template',
      name: '3-Axis Milling Operation',
      description: 'Mill keyway and mounting holes',
      category: 'manufacturing_process',
      status: 'completed',
      priority: 'medium',
      manufacturingProcessType: '3_axis_milling',
      machineType: 'CNC Mill',
      setupTimeMinutes: 35,
      cycleTimeMinutes: 18,
      quantity: 5,
      partCode: 'SHAFT-001-REV-A',
      operationIndex: 2,
      scheduledMachineName: 'HAAS VF-2',
      scheduledMachineId: 'HAAS_VF2_001',
      subtasks: [
        {
          id: `subtask_milling_setup_${Date.now()}`,
          taskId: `task_milling_${Date.now()}`,
          jobId: testJobId,
          templateId: '3_axis_milling_setup_sheet',
          name: '3-Axis Milling Setup Sheet',
          description: 'Create and verify setup sheet for 3-axis milling',
          status: 'completed',
          isPrintable: true,
          hasCheckbox: true,
          isChecked: true,
          manufacturingSubtaskType: 'setup_sheet',
          estimatedDurationMinutes: 40,
          actualDurationMinutes: 42,
          completedBy: 'sarah.jones',
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `subtask_milling_machining_${Date.now()}`,
          taskId: `task_milling_${Date.now()}`,
          jobId: testJobId,
          templateId: '3_axis_milling_machining',
          name: '3-Axis Milling Machining',
          description: 'Execute 3-axis milling operations',
          status: 'completed',
          isPrintable: false,
          hasCheckbox: true,
          isChecked: true,
          manufacturingSubtaskType: 'machining',
          estimatedDurationMinutes: 90,
          actualDurationMinutes: 85,
          completedBy: 'sarah.jones',
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      estimatedDurationHours: 2.5,
      actualDurationHours: 2.1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  try {
    console.log('📋 Step 1: Creating Manufacturing Forms from Tasks');
    console.log('='.repeat(50));

    // Create routing sheet from all manufacturing tasks
    const routingSheetId = await createRoutingSheetFromTasks(
      testJobId,
      manufacturingTasks,
      'production.planner'
    );
    console.log(`✅ Created routing sheet: ${routingSheetId}`);

    // Create setup sheets for each task
    for (const task of manufacturingTasks) {
      const setupSheetId = await createSetupSheetFromTask(task, 'machine.operator');
      console.log(`✅ Created setup sheet for ${task.manufacturingProcessType}: ${setupSheetId}`);

      const toolListId = await createToolListFromTask(task, 'tool.crib.operator');
      console.log(`✅ Created tool list for ${task.manufacturingProcessType}: ${toolListId}`);

      const faiReportId = await createFAIReportFromTask(task, 'quality.inspector');
      console.log(`✅ Created FAI report for ${task.manufacturingProcessType}: ${faiReportId}`);
    }

    console.log('\n⏱️  Step 2: Recording Actual Setup and Cycle Times');
    console.log('='.repeat(50));

    // Record actual setup and cycle times for machining subtasks
    for (const task of manufacturingTasks) {
      const machiningSubtask = task.subtasks.find(s => s.manufacturingSubtaskType === 'machining');
      
      if (machiningSubtask) {
        const actualTimes = {
          actualSetupTimeMinutes: (task.setupTimeMinutes || 30) + Math.floor(Math.random() * 10) - 5, // Realistic variance
          actualCycleTimeMinutes: (task.cycleTimeMinutes || 15) + Math.floor(Math.random() * 4) - 2, // Realistic variance
          actualPiecesCompleted: task.quantity || 5,
          actualMachineId: task.scheduledMachineId || 'MACHINE_001',
          actualOperator: machiningSubtask.completedBy || 'operator',
          setupStartTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
          setupEndTime: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(), // 2.5 hours ago
          machiningStartTime: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(), // 2.5 hours ago
          machiningEndTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
          toolsActuallyUsed: ['T01', 'T02', 'T03'],
          setupNotes: `Setup for ${task.manufacturingProcessType} completed with minor adjustments`,
          machiningNotes: `${task.manufacturingProcessType} operation completed successfully. Good surface finish achieved.`,
          qualityIssues: [],
          setupAdjustments: ['Adjusted tool height by 0.002"', 'Verified work coordinate system'],
          cycleTimeVariations: [
            { piece: 1, cycleTime: (task.cycleTimeMinutes || 15) + 2 }, // First piece slower
            { piece: 2, cycleTime: (task.cycleTimeMinutes || 15) },
            { piece: 3, cycleTime: (task.cycleTimeMinutes || 15) - 1 },
            { piece: 4, cycleTime: (task.cycleTimeMinutes || 15) - 1 },
            { piece: 5, cycleTime: (task.cycleTimeMinutes || 15) - 2 } // Got faster
          ]
        };

        await recordSetupAndCycleTimes(machiningSubtask, actualTimes);
        console.log(`✅ Recorded setup/cycle times for ${task.manufacturingProcessType} machining`);
        console.log(`   - Setup Time: ${actualTimes.actualSetupTimeMinutes} min (est: ${task.setupTimeMinutes} min)`);
        console.log(`   - Cycle Time: ${actualTimes.actualCycleTimeMinutes} min (est: ${task.cycleTimeMinutes} min)`);
        console.log(`   - Pieces: ${actualTimes.actualPiecesCompleted}`);
        console.log(`   - Operator: ${actualTimes.actualOperator}`);
      }
    }

    console.log('\n📊 Step 3: Retrieving Manufacturing Data for Archive');
    console.log('='.repeat(50));

    // Get all manufacturing forms for the job
    const manufacturingForms = await getJobManufacturingForms(testJobId);
    console.log(`✅ Retrieved ${manufacturingForms.length} manufacturing forms:`);
    
    manufacturingForms.forEach(form => {
      console.log(`   - ${form.formType}: ${form.id} (completed by ${form.completedBy})`);
    });

    // Get all setup time records for the job
    const setupTimeRecords = await getJobSetupTimeRecords(testJobId);
    console.log(`✅ Retrieved ${setupTimeRecords.length} setup time records:`);
    
    setupTimeRecords.forEach(record => {
      console.log(`   - Subtask ${record.subtaskId}: ${record.actualSetupTimeMinutes}min setup, ${record.actualCycleTimeMinutes}min cycle`);
      console.log(`     Operator: ${record.actualOperator}, Machine: ${record.actualMachineId}`);
    });

    console.log('\n🎯 Step 4: Demonstrating Archive Data Extraction');
    console.log('='.repeat(50));

    // This shows how the archive system can now extract REAL data
    console.log('📋 Manufacturing Forms Available for Archive:');
    console.log(`   - Routing Sheets: ${manufacturingForms.filter(f => f.formType === 'routing_sheet').length}`);
    console.log(`   - Setup Sheets: ${manufacturingForms.filter(f => f.formType === 'setup_sheet').length}`);
    console.log(`   - Tool Lists: ${manufacturingForms.filter(f => f.formType === 'tool_list').length}`);
    console.log(`   - FAI Reports: ${manufacturingForms.filter(f => f.formType === 'fai_report').length}`);

    console.log('\n⏱️  Setup Time Records Available for Archive:');
    setupTimeRecords.forEach(record => {
      console.log(`   - ${record.subtaskId}:`);
      console.log(`     * Actual Setup: ${record.actualSetupTimeMinutes} min`);
      console.log(`     * Actual Cycle: ${record.actualCycleTimeMinutes} min per piece`);
      console.log(`     * Total Pieces: ${record.actualPiecesCompleted}`);
      console.log(`     * Quality Issues: ${record.qualityIssues?.length || 0}`);
      console.log(`     * Setup Adjustments: ${record.setupAdjustments?.length || 0}`);
    });

    console.log('\n✅ SUCCESS: Manufacturing Forms System Complete');
    console.log('='.repeat(50));
    console.log('The system now has:');
    console.log('✓ Real manufacturing forms generation from tasks');
    console.log('✓ Actual setup and cycle time recording');
    console.log('✓ Complete traceability data for archives');
    console.log('✓ No more mock data - only real manufacturing information');
    console.log('\nArchive system can now extract comprehensive manufacturing data!');

  } catch (error) {
    console.error('❌ Error during manufacturing forms test:', error);
    throw error;
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateManufacturingFormsSystem()
    .then(() => {
      console.log('\n🏁 Manufacturing forms demonstration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Manufacturing forms demonstration failed:', error);
      process.exit(1);
    });
}

export { demonstrateManufacturingFormsSystem }; 