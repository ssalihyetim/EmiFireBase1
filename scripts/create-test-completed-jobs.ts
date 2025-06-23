import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import type { Job } from '../src/types';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDjWmr0uHdZXbx2DlWEAXc7-6zVAE8sVhs",
  authDomain: "docuflow-squdu.firebaseapp.com",
  projectId: "docuflow-squdu",
  storageBucket: "docuflow-squdu.firebasestorage.app",
  messagingSenderId: "1064951960235",
  appId: "1:1064951960235:web:953af2f8376facc2449dee"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
    actualStartDate: '2024-02-01',
    actualCompletionDate: '2024-02-25',
    overallQualityScore: 9.5
  }
];

async function createTestCompletedJobs() {
  console.log('🏭 Creating test completed jobs for pattern creation testing...');
  
  try {
    for (const jobData of testCompletedJobs) {
      const jobDoc = {
        ...jobData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        dueDate: jobData.dueDate ? Timestamp.fromDate(new Date(jobData.dueDate)) : null,
        actualStartDate: jobData.actualStartDate ? Timestamp.fromDate(new Date(jobData.actualStartDate)) : null,
        actualCompletionDate: jobData.actualCompletionDate ? Timestamp.fromDate(new Date(jobData.actualCompletionDate)) : null
      };
      
      await setDoc(doc(db, 'jobs', jobData.id!), jobDoc);
      console.log(`✅ Created completed job: ${jobData.item?.partName} (${jobData.id})`);
    }
    
    console.log('🎉 Successfully created all test completed jobs!');
    console.log('📋 Summary:');
    console.log(`   - ${testCompletedJobs.length} completed jobs created`);
    console.log('   - All jobs have high quality scores (8.7-9.5)');
    console.log('   - Jobs are eligible for pattern creation');
    console.log('   - Navigate to /jobs page and filter by "Completed" to see them');
    
  } catch (error) {
    console.error('❌ Error creating test completed jobs:', error);
    process.exit(1);
  }
}

// Run the script
createTestCompletedJobs().then(() => {
  console.log('✨ Test data creation complete!');
  process.exit(0);
}); 