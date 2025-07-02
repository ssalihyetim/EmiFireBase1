import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

const JOB_ARCHIVES_COLLECTION = 'job_archives';
const COMPLETED_FORMS_COLLECTION = 'completed_forms';

export async function GET() {
  try {
    // Check archives collection
    const archivesSnapshot = await getDocs(collection(db, JOB_ARCHIVES_COLLECTION));
    const archiveCount = archivesSnapshot.size;
    
    // Check completed forms collection  
    const formsSnapshot = await getDocs(collection(db, COMPLETED_FORMS_COLLECTION));
    const formsCount = formsSnapshot.size;
    
    return NextResponse.json({
      success: true,
      data: {
        archivedJobs: archiveCount,
        orphanedForms: formsCount,
        message: archiveCount === 0 && formsCount === 0 
          ? 'Database is clean - no archived jobs or forms found'
          : `Found ${archiveCount} archived jobs and ${formsCount} completed forms`
      }
    });
  } catch (error) {
    console.error('Error checking archives:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check archives',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    console.log('Starting cleanup of archived jobs and forms...');

    // Get all archives
    const archivesSnapshot = await getDocs(collection(db, JOB_ARCHIVES_COLLECTION));
    const archiveCount = archivesSnapshot.size;
    
    // Get all forms
    const formsSnapshot = await getDocs(collection(db, COMPLETED_FORMS_COLLECTION));
    const formsCount = formsSnapshot.size;
    
    if (archiveCount === 0 && formsCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'Database is already clean - no archived jobs or forms to delete',
        deletedArchives: 0,
        deletedForms: 0
      });
    }

    let deletedArchives = 0;
    let deletedForms = 0;

    // Delete archives in batches
    if (archiveCount > 0) {
      const batch = writeBatch(db);
      archivesSnapshot.docs.forEach((docSnapshot) => {
        batch.delete(docSnapshot.ref);
        deletedArchives++;
      });
      await batch.commit();
      console.log(`Deleted ${deletedArchives} archived jobs`);
    }

    // Delete forms in batches  
    if (formsCount > 0) {
      const batch = writeBatch(db);
      formsSnapshot.docs.forEach((docSnapshot) => {
        batch.delete(docSnapshot.ref);
        deletedForms++;
      });
      await batch.commit();
      console.log(`Deleted ${deletedForms} completed forms`);
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully cleaned database',
      deletedArchives,
      deletedForms,
      totalDeleted: deletedArchives + deletedForms
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup archives',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 