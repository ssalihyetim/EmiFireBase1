import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    console.log('🔍 Test API: Fetching machines...');
    
    const querySnapshot = await getDocs(collection(db, 'machines'));
    const machines: any[] = [];

    console.log(`📊 Found ${querySnapshot.size} machine documents`);

    querySnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`📋 Machine ${doc.id}:`, {
        name: data.name,
        type: data.type,
        isActive: data.isActive,
        capabilities: data.capabilities,
        workingHours: data.workingHours
      });
      
      machines.push({
        id: doc.id,
        ...data,
        availableFrom: data.availableFrom?.toDate()?.toISOString() || 'No timestamp'
      });
    });

    return NextResponse.json({
      success: true,
      machineCount: machines.length,
      machines
    });
  } catch (error) {
    console.error('❌ Test API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch machines', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 