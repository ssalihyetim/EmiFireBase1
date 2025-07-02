#!/usr/bin/env ts-node

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDGpAHia_wEmrhnmYjrPf_UsWI7gIir03I",
  authDomain: "emi-steel.firebaseapp.com",
  projectId: "emi-steel",
  storageBucket: "emi-steel.appspot.com",
  messagingSenderId: "1039864678287",
  appId: "1:1039864678287:web:6faa9e17519618096c7011"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupArchivedJobs() {
  console.log('🗑️  Starting archived jobs cleanup...');
  
  try {
    // Get all archived jobs
    const archivesRef = collection(db, 'archives');
    const archivesSnapshot = await getDocs(archivesRef);
    
    if (archivesSnapshot.empty) {
      console.log('✅ No archived jobs found - database is already clean');
      return;
    }

    console.log(`📋 Found ${archivesSnapshot.size} archived jobs to delete`);
    
    // Delete in batches (Firestore batch limit is 500)
    const batchSize = 500;
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    
    archivesSnapshot.docs.forEach((docSnapshot) => {
      currentBatch.delete(doc(db, 'archives', docSnapshot.id));
      operationCount++;
      
      if (operationCount === batchSize) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    });
    
    // Add the remaining operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }
    
    console.log(`🔄 Executing ${batches.length} batch(es) to delete all archived jobs...`);
    
    // Execute all batches
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`✅ Batch ${i + 1}/${batches.length} completed`);
    }
    
    console.log('🎉 All archived jobs have been successfully deleted!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Deleted: ${archivesSnapshot.size} archived jobs`);
    console.log(`   • Batches executed: ${batches.length}`);
    console.log('');
    console.log('✨ Database is now clean and ready for new test data');
    
  } catch (error) {
    console.error('❌ Error cleaning up archived jobs:', error);
    throw error;
  }
}

// Also clean up any orphaned manufacturing forms
async function cleanupOrphanedForms() {
  console.log('🧹 Checking for orphaned manufacturing forms...');
  
  try {
    const collections = [
      'routingSheets',
      'setupSheets', 
      'toolLists',
      'faiReports',
      'inspectionRecords'
    ];
    
    let totalDeleted = 0;
    
    for (const collectionName of collections) {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      if (!snapshot.empty) {
        console.log(`🗂️  Found ${snapshot.size} documents in ${collectionName}`);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach((docSnapshot) => {
          batch.delete(doc(db, collectionName, docSnapshot.id));
        });
        
        await batch.commit();
        totalDeleted += snapshot.size;
        console.log(`✅ Deleted ${snapshot.size} documents from ${collectionName}`);
      }
    }
    
    if (totalDeleted > 0) {
      console.log(`🧹 Cleaned up ${totalDeleted} orphaned manufacturing forms`);
    } else {
      console.log('✅ No orphaned forms found');
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up orphaned forms:', error);
  }
}

async function main() {
  console.log('🚀 Starting complete archive cleanup...');
  console.log('');
  
  try {
    await cleanupArchivedJobs();
    console.log('');
    await cleanupOrphanedForms();
    
    console.log('');
    console.log('🎯 Archive cleanup completed successfully!');
    console.log('💡 You can now create new jobs and test the archiving system with fresh data');
    
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
main().then(() => {
  console.log('✨ Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 