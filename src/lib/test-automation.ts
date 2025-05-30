import type { Job } from '@/types';
import { 
  generateJobTasks,
  calculateJobProgress,
  updateTaskStatus,
  updateSubtaskStatus,
  canTaskStart,
  getNextAvailableTasks,
  validateTaskCompleteness
} from './task-automation';
import { validateAS9100DCompliance, generateQualityPackage } from './quality-template-integration';

// === Sample Test Data ===

const sampleJobs: Job[] = [
  {
    id: 'test-job-001',
    orderId: 'order-001',
    orderNumber: 'ORD-2024-001',
    clientName: 'Aerospace Corp',
    status: 'Pending',
    item: {
      id: 'item-001',
      partName: 'Landing Gear Bracket',
      rawMaterialType: 'Aluminum 7075-T6',
      rawMaterialDimension: '50x50x100mm',
      materialCost: 45.50,
      machiningCost: 125.00,
      outsourcedProcessesCost: 85.00,
      unitPrice: 275.00,
      quantity: 5,
      totalPrice: 1375.00,
      assignedProcesses: ['Turning', '3-Axis Milling', 'Anodizing'],
      attachments: []
    }
  },
  {
    id: 'test-job-002',
    orderId: 'order-002',
    orderNumber: 'ORD-2024-002',
    clientName: 'Defense Systems Ltd',
    status: 'Pending',
    item: {
      id: 'item-002',
      partName: 'Turbine Impeller',
      rawMaterialType: 'Titanium Ti-6Al-4V',
      rawMaterialDimension: '150x150x75mm',
      materialCost: 285.00,
      machiningCost: 450.00,
      outsourcedProcessesCost: 125.00,
      unitPrice: 950.00,
      quantity: 2,
      totalPrice: 1900.00,
      assignedProcesses: ['5-Axis Milling', 'Heat Treatment', 'Grinding'],
      attachments: []
    }
  },
  {
    id: 'test-job-003',
    orderId: 'order-003',
    orderNumber: 'ORD-2024-003',
    clientName: 'Automotive Inc',
    status: 'Pending',
    item: {
      id: 'item-003',
      partName: 'Simple Shaft',
      rawMaterialType: 'Steel 4140',
      rawMaterialDimension: '25x150mm',
      materialCost: 15.00,
      machiningCost: 35.00,
      outsourcedProcessesCost: 0,
      unitPrice: 65.00,
      quantity: 10,
      totalPrice: 650.00,
      assignedProcesses: ['Turning'], // Only turning - minimal complexity
      attachments: []
    }
  }
];

// === Test Functions ===

/**
 * Test basic task generation for different job types
 */
export function testTaskGeneration(): void {
  console.log('🧪 TESTING TASK GENERATION');
  console.log('=' .repeat(50));
  
  sampleJobs.forEach((job, index) => {
    console.log(`\n📋 Job ${index + 1}: ${job.item.partName}`);
    console.log(`Processes: ${job.item.assignedProcesses?.join(', ')}`);
    
    const tasks = generateJobTasks(job);
    
    console.log(`✅ Generated ${tasks.length} tasks:`);
    tasks.forEach(task => {
      console.log(`  - ${task.name} (${task.type}, ${task.priority})`);
      console.log(`    Dependencies: ${task.dependencies?.length || 0}`);
      console.log(`    Subtasks: ${task.subtasks.length}`);
      
      // Show milling subtasks specifically (as mentioned in requirements)
      if (task.templateId.includes('milling')) {
        console.log(`    🔧 Milling Subtasks:`);
        task.subtasks.forEach(subtask => {
          console.log(`      - ${subtask.name} (${subtask.qualityTemplateId || 'No template'})`);
        });
      }
    });
  });
}

/**
 * Test task dependency resolution
 */
export function testTaskDependencies(): void {
  console.log('\n\n🔗 TESTING TASK DEPENDENCIES');
  console.log('=' .repeat(50));
  
  const job = sampleJobs[1]; // Complex 5-axis job
  const tasks = generateJobTasks(job);
  
  console.log(`\n📋 Testing dependencies for: ${job.item.partName}`);
  
  // Test which tasks can start initially
  const initialTasks = getNextAvailableTasks(tasks);
  console.log(`\n✅ Tasks that can start immediately: ${initialTasks.length}`);
  initialTasks.forEach(task => {
    console.log(`  - ${task.name}`);
  });
  
  // Simulate completing contract review
  const contractReviewTask = tasks.find(t => t.templateId === 'contract_review');
  if (contractReviewTask) {
    const updatedTask = updateTaskStatus(contractReviewTask, 'completed', 'test-user');
    const updatedTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    
    const nextTasks = getNextAvailableTasks(updatedTasks);
    console.log(`\n✅ After completing contract review, available tasks: ${nextTasks.length}`);
    nextTasks.forEach(task => {
      console.log(`  - ${task.name}`);
    });
  }
}

/**
 * Test quality compliance validation
 */
export function testQualityCompliance(): void {
  console.log('\n\n🎯 TESTING QUALITY COMPLIANCE');
  console.log('=' .repeat(50));
  
  const job = sampleJobs[0]; // Aerospace job with anodizing
  const tasks = generateJobTasks(job);
  
  // Test each task's quality compliance
  tasks.forEach(task => {
    console.log(`\n📋 Task: ${task.name}`);
    
    // Test subtask compliance
    task.subtasks.forEach(subtask => {
      const compliance = validateAS9100DCompliance(subtask);
      console.log(`  - ${subtask.name}: ${compliance.isCompliant ? '✅' : '❌'}`);
      
      if (compliance.issues.length > 0) {
        compliance.issues.forEach(issue => {
          console.log(`    ⚠️ ${issue}`);
        });
      }
      
      if (compliance.recommendations.length > 0) {
        compliance.recommendations.forEach(rec => {
          console.log(`    💡 ${rec}`);
        });
      }
    });
    
    // Test task completeness
    const completeness = validateTaskCompleteness(task);
    console.log(`  Task completeness: ${completeness.isComplete ? '✅' : '❌'}`);
    if (completeness.missingItems.length > 0) {
      console.log(`  Missing: ${completeness.missingItems.join(', ')}`);
    }
  });
}

/**
 * Test quality package generation
 */
export function testQualityPackage(): void {
  console.log('\n\n📄 TESTING QUALITY PACKAGE GENERATION');
  console.log('=' .repeat(50));
  
  sampleJobs.forEach(job => {
    console.log(`\n📋 Job: ${job.item.partName}`);
    const tasks = generateJobTasks(job);
    const allSubtasks = tasks.flatMap(task => task.subtasks);
    
    const qualityPackage = generateQualityPackage(allSubtasks, job);
    
    console.log(`  📄 Quality Documents: ${qualityPackage.documents.length}`);
    qualityPackage.documents.forEach(doc => {
      console.log(`    - ${doc.docId}: ${doc.title}`);
    });
    
    console.log(`  📊 Compliance Status: ${qualityPackage.complianceStatus}`);
    
    if (qualityPackage.missingDocuments.length > 0) {
      console.log(`  ❌ Missing Documents: ${qualityPackage.missingDocuments.join(', ')}`);
    }
  });
}

/**
 * Test progress calculation
 */
export function testProgressCalculation(): void {
  console.log('\n\n📊 TESTING PROGRESS CALCULATION');
  console.log('=' .repeat(50));
  
  const job = sampleJobs[2]; // Simple turning job
  const tasks = generateJobTasks(job);
  
  console.log(`\n📋 Job: ${job.item.partName}`);
  
  // Initial progress
  const initialProgress = calculateJobProgress(tasks);
  console.log(`\n📊 Initial Progress:`);
  console.log(`  Overall: ${initialProgress.overallProgress}%`);
  console.log(`  Tasks: ${initialProgress.completedTasks}/${initialProgress.totalTasks}`);
  console.log(`  Subtasks: ${initialProgress.completedSubtasks}/${initialProgress.totalSubtasks}`);
  
  // Simulate completing some subtasks
  let updatedTasks = [...tasks];
  const firstTask = updatedTasks[0];
  
  if (firstTask.subtasks.length > 0) {
    // Complete half the subtasks of the first task
    const halfSubtasks = Math.ceil(firstTask.subtasks.length / 2);
    for (let i = 0; i < halfSubtasks; i++) {
      firstTask.subtasks[i] = updateSubtaskStatus(
        firstTask.subtasks[i], 
        true, 
        'test-user',
        'Test completion'
      );
    }
    
    const midProgress = calculateJobProgress(updatedTasks);
    console.log(`\n📊 After completing ${halfSubtasks} subtasks:`);
    console.log(`  Overall: ${midProgress.overallProgress}%`);
    console.log(`  Tasks: ${midProgress.completedTasks}/${midProgress.totalTasks}`);
    console.log(`  Subtasks: ${midProgress.completedSubtasks}/${midProgress.totalSubtasks}`);
  }
}

/**
 * Test specific milling requirements (as mentioned in user requirements)
 */
export function testMillingRequirements(): void {
  console.log('\n\n🔧 TESTING MILLING SPECIFIC REQUIREMENTS');
  console.log('=' .repeat(50));
  
  const millingJob = sampleJobs[0]; // Has 3-axis milling
  const tasks = generateJobTasks(millingJob);
  
  const millingTask = tasks.find(task => task.templateId === 'milling_3axis');
  
  if (millingTask) {
    console.log(`\n📋 Milling Task: ${millingTask.name}`);
    console.log(`Required subtasks for milling operation:`);
    
    const expectedSubtasks = [
      'milling_setup_sheet',
      'milling_tool_list', 
      'milling_cam_program',
      'milling_first_article'
    ];
    
    expectedSubtasks.forEach(expectedId => {
      const subtask = millingTask.subtasks.find(s => s.templateId === expectedId);
      if (subtask) {
        console.log(`  ✅ ${subtask.name}`);
        console.log(`     Template: ${subtask.qualityTemplateId}`);
        console.log(`     Printable: ${subtask.isPrintable ? 'Yes' : 'No'}`);
        console.log(`     Has Checkbox: ${subtask.hasCheckbox ? 'Yes' : 'No'}`);
        console.log(`     AS9100D: ${subtask.as9100dClause || 'N/A'}`);
      } else {
        console.log(`  ❌ Missing: ${expectedId}`);
      }
    });
  } else {
    console.log('❌ No milling task found!');
  }
}

/**
 * Run all tests
 */
export function runAllTests(): void {
  console.log('🚀 STARTING TASK AUTOMATION TESTS');
  console.log('=' .repeat(60));
  
  try {
    testTaskGeneration();
    testTaskDependencies();
    testQualityCompliance();
    testQualityPackage();
    testProgressCalculation();
    testMillingRequirements();
    
    console.log('\n\n✅ ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n\n❌ TEST FAILED:', error);
  }
}

// Export sample data for external use
export { sampleJobs }; 