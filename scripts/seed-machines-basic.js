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

// Very basic machine data with only essential fields
const basicMachines = [
  {
    name: "NEX110 CNC Lathe",
    type: "turning",
    model: "NEX110",
    isActive: true,
    hourlyRate: 85
  },
  {
    name: "AWEA VP-1000 VMC", 
    type: "milling",
    model: "VP-1000",
    isActive: true,
    hourlyRate: 95
  }
];

async function seedBasicMachines() {
  try {
    console.log('Starting basic machine data seeding...');
    console.log('Firebase Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    
    for (const machine of basicMachines) {
      console.log(`Attempting to add machine: ${machine.name}`);
      const docRef = await addDoc(collection(db, 'machines'), machine);
      console.log(`✅ Added machine "${machine.name}" with ID: ${docRef.id}`);
    }
    
    console.log(`✅ Successfully seeded ${basicMachines.length} machines!`);
    
  } catch (error) {
    console.error('❌ Error seeding machines:', error);
    console.error('Error details:', error.message);
  }
}

// Run the seeder
seedBasicMachines().then(() => {
  console.log('Seeding complete!');
  process.exit(0);
}).catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
}); 