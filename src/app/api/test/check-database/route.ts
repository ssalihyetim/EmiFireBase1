import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";

export async function GET() {
  try {
    console.log('🔍 Checking database collections...');
    
    const results: any = {};
    
    // Check jobs
    const jobsRef = collection(db, 'jobs');
    const jobsSnapshot = await getDocs(query(jobsRef, limit(5)));
    results.jobs = {
      count: jobsSnapshot.docs.length,
      samples: jobsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };
    
    // Check calendar events
    const calendarRef = collection(db, 'calendarEvents');
    const calendarSnapshot = await getDocs(query(calendarRef, limit(10)));
    results.calendarEvents = {
      count: calendarSnapshot.docs.length,
      samples: calendarSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          type: data.type,
          jobId: data.jobId,
          partName: data.partName,
          operationName: data.operationName,
          machineName: data.machineName
        };
      })
    };
    
    // Check schedules
    const schedulesRef = collection(db, 'schedules');
    const schedulesSnapshot = await getDocs(query(schedulesRef, limit(5)));
    results.schedules = {
      count: schedulesSnapshot.docs.length,
      samples: schedulesSnapshot.docs.map(doc => ({
        id: doc.id,
        jobId: doc.data().jobId,
        processInstanceId: doc.data().processInstanceId,
        partName: doc.data().partName
      }))
    };
    
    // Check process instances
    const processRef = collection(db, 'processInstances');
    const processSnapshot = await getDocs(query(processRef, limit(5)));
    results.processInstances = {
      count: processSnapshot.docs.length,
      samples: processSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };
    
    console.log('Database check results:', results);
    
    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Database check failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 