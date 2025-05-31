import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sampleMachines = [
  {
    name: "NEX110 CNC Lathe",
    type: "turning",
    model: "NEX110",
    isActive: true,
    capabilities: ["high_precision", "thread_cutting", "live_tooling"],
    hourlyRate: 85,
    currentWorkload: 32, // hours currently scheduled
    availableFrom: Timestamp.now(),
    workingHours: {
      start: "08:00",
      end: "17:00",
      workingDays: [1, 2, 3, 4, 5] // Monday to Friday
    },
    operatorRequired: "cnc_lathe_operator",
    maintenanceWindows: [
      {
        start: "2024-12-20T18:00:00Z",
        end: "2024-12-20T20:00:00Z"
      }
    ],
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
    availableFrom: Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000)), // Available in 2 hours
    workingHours: {
      start: "08:00",
      end: "17:00",
      workingDays: [1, 2, 3, 4, 5]
    },
    operatorRequired: "advanced_cnc_operator",
    maintenanceWindows: [
      {
        start: "2024-12-22T09:00:00Z",
        end: "2024-12-22T11:00:00Z"
      }
    ],
    maintenanceSchedule: {
      lastMaintenance: "2024-11-15",
      nextMaintenance: "2025-01-15"
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: "Mazak QTN-200",
    type: "turning",
    model: "QTN-200MSY",
    isActive: true,
    capabilities: ["live_tooling", "y_axis", "sub_spindle", "high_precision"],
    hourlyRate: 105,
    currentWorkload: 35,
    availableFrom: Timestamp.now(),
    workingHours: {
      start: "08:00",
      end: "17:00",
      workingDays: [1, 2, 3, 4, 5]
    },
    operatorRequired: "advanced_lathe_operator",
    maintenanceWindows: [],
    maintenanceSchedule: {
      lastMaintenance: "2024-12-05",
      nextMaintenance: "2025-02-05"
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: "Haas VF-3",
    type: "milling",
    model: "VF-3",
    isActive: true,
    capabilities: ["3_axis", "steel_cutting", "large_parts"],
    hourlyRate: 75,
    currentWorkload: 25,
    availableFrom: Timestamp.now(),
    workingHours: {
      start: "08:00",
      end: "17:00",
      workingDays: [1, 2, 3, 4, 5]
    },
    operatorRequired: "cnc_mill_operator",
    maintenanceWindows: [],
    maintenanceSchedule: {
      lastMaintenance: "2024-11-20",
      nextMaintenance: "2024-12-30"
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
];

async function seedMachines() {
  try {
    console.log('Starting machine data seeding...');
    
    for (const machine of sampleMachines) {
      const docRef = await addDoc(collection(db, 'machines'), machine);
      console.log(`Added machine "${machine.name}" with ID: ${docRef.id}`);
    }
    
    console.log(`Successfully seeded ${sampleMachines.length} machines!`);
    
    // Display summary
    console.log('\n=== Machine Summary ===');
    sampleMachines.forEach(machine => {
      console.log(`- ${machine.name} (${machine.type}) - $${machine.hourlyRate}/hr - ${machine.currentWorkload}h workload`);
    });
    
  } catch (error) {
    console.error('Error seeding machines:', error);
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedMachines().then(() => {
    console.log('Seeding complete!');
    process.exit(0);
  }).catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
}

export { seedMachines }; 