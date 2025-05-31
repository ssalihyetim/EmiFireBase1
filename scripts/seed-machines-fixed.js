const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp } = require('firebase/firestore');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('Firebase Config Check:');
console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Machine data with proper Firestore-compatible fields
const machines = [
  {
    name: "NEX110 CNC Lathe",
    type: "turning",
    model: "NEX110",
    isActive: true,
    capabilities: ["high_precision", "thread_cutting", "live_tooling"],
    hourlyRate: 85,
    currentWorkload: 32,
    availableFrom: Timestamp.now(),
    workingHours: {
      start: "08:00",
      end: "17:00",
      workingDays: [1, 2, 3, 4, 5]
    },
    operatorRequired: "cnc_lathe_operator",
    maintenanceWindows: [],
    maintenanceSchedule: {
      lastMaintenance: "2024-12-01",
      nextMaintenance: "2025-01-01"
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: "AWEA VP-1000 VMC",
    type: "milling", 
    model: "VP-1000",
    isActive: true,
    capabilities: ["3_axis", "high_speed", "aluminum_cutting"],
    hourlyRate: 95,
    currentWorkload: 28,
    availableFrom: Timestamp.now(),
    workingHours: {
      start: "08:00",
      end: "17:00", 
      workingDays: [1, 2, 3, 4, 5]
    },
    operatorRequired: "cnc_mill_operator",
    maintenanceWindows: [],
    maintenanceSchedule: {
      lastMaintenance: "2024-11-28",
      nextMaintenance: "2024-12-28"
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: "Fanuc Robodrill",
    type: "5-axis",
    model: "Robodrill α-D21MiA5",
    isActive: true,
    capabilities: ["5_axis", "high_precision", "complex_geometry", "titanium_cutting"],
    hourlyRate: 125,
    currentWorkload: 40,
    availableFrom: Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    workingHours: {
      start: "08:00",
      end: "17:00",
      workingDays: [1, 2, 3, 4, 5]
    },
    operatorRequired: "advanced_cnc_operator", 
    maintenanceWindows: [],
    maintenanceSchedule: {
      lastMaintenance: "2024-11-15",
      nextMaintenance: "2025-01-15"
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
];

async function seedMachines() {
  try {
    console.log('🚀 Starting machine data seeding...');
    console.log(`📊 Seeding ${machines.length} machines to project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
    
    for (let i = 0; i < machines.length; i++) {
      const machine = machines[i];
      console.log(`\n[${i + 1}/${machines.length}] Adding machine: ${machine.name}`);
      
      try {
        const docRef = await addDoc(collection(db, 'machines'), machine);
        console.log(`✅ Successfully added "${machine.name}" with ID: ${docRef.id}`);
        console.log(`   Type: ${machine.type}, Rate: $${machine.hourlyRate}/hr, Workload: ${machine.currentWorkload}h`);
      } catch (error) {
        console.error(`❌ Failed to add "${machine.name}":`, error.message);
      }
    }
    
    console.log(`\n🎉 Machine seeding completed!`);
    console.log(`\n=== MACHINE SUMMARY ===`);
    machines.forEach((machine, index) => {
      console.log(`${index + 1}. ${machine.name} (${machine.type}) - $${machine.hourlyRate}/hr - ${machine.currentWorkload}h workload`);
    });
    
  } catch (error) {
    console.error('❌ Critical error during seeding:', error);
  }
}

// Validate Firebase config before running
if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.error('❌ Firebase configuration missing! Check your .env.local file.');
  process.exit(1);
}

// Run the seeder
seedMachines().then(() => {
  console.log('✅ Seeding process completed!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Seeding process failed:', error);
  process.exit(1);
}); 