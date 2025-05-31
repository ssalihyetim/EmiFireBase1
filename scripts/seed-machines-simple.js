const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');
require('dotenv').config();

// Firebase config from environment variables
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

// Simple machine data matching the existing structure
const simpleMachines = [
  {
    name: "NEX110 CNC Lathe",
    type: "turning",
    model: "NEX110",
    isActive: true,
    capabilities: ["high_precision", "thread_cutting", "live_tooling"],
    hourlyRate: 85
  },
  {
    name: "AWEA VP-1000 VMC",
    type: "milling",
    model: "VP-1000",
    isActive: true,
    capabilities: ["3_axis", "high_speed", "aluminum_cutting"],
    hourlyRate: 95
  },
  {
    name: "Fanuc Robodrill",
    type: "5-axis",
    model: "Robodrill α-D21MiA5",
    isActive: true,
    capabilities: ["5_axis", "high_precision", "complex_geometry"],
    hourlyRate: 125
  },
  {
    name: "Mazak QTN-200",
    type: "turning",
    model: "QTN-200MSY",
    isActive: true,
    capabilities: ["live_tooling", "y_axis", "sub_spindle"],
    hourlyRate: 105
  },
  {
    name: "Haas VF-3",
    type: "milling",
    model: "VF-3",
    isActive: true,
    capabilities: ["3_axis", "steel_cutting", "large_parts"],
    hourlyRate: 75
  }
];

async function seedSimpleMachines() {
  try {
    console.log('Starting simple machine data seeding...');
    
    for (const machine of simpleMachines) {
      const docRef = await addDoc(collection(db, 'machines'), machine);
      console.log(`Added machine "${machine.name}" with ID: ${docRef.id}`);
    }
    
    console.log(`Successfully seeded ${simpleMachines.length} machines!`);
    
    // Display summary
    console.log('\n=== Machine Summary ===');
    simpleMachines.forEach(machine => {
      console.log(`- ${machine.name} (${machine.type}) - $${machine.hourlyRate}/hr`);
    });
    
  } catch (error) {
    console.error('Error seeding machines:', error);
  }
}

// Run the seeder
seedSimpleMachines().then(() => {
  console.log('Seeding complete!');
  process.exit(0);
}).catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
}); 