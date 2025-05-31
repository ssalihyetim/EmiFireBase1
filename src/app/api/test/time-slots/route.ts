import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityCalculator } from '@/lib/scheduling/availability-calculator';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machineId') || 'GhB98CalnZKb2m6SJ95f'; // Default to our seeded lathe
    const duration = parseInt(searchParams.get('duration') || '60'); // Default 60 minutes

    console.log(`🧪 Testing time slots for machine ${machineId}, duration ${duration} minutes`);

    const calculator = new AvailabilityCalculator();
    
    // Test availability calculation
    const availableSlots = await calculator.getAvailableTimeSlots(machineId, duration);
    
    console.log(`✅ Found ${availableSlots.length} available slots`);

    return NextResponse.json({
      success: true,
      machineId,
      durationMinutes: duration,
      availableSlots: availableSlots.map(slot => ({
        start: slot.start.toDate().toISOString(),
        end: slot.end.toDate().toISOString(),
        duration: slot.duration
      })),
      debugInfo: {
        currentTime: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    });
  } catch (error) {
    console.error('❌ Time slot test error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test time slots', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 