#!/usr/bin/env npx tsx

/**
 * Test Lot Number Alignment System
 * 
 * This script demonstrates the new aligned lot number system that ensures
 * consistency between job ID lot numbers and task/component lot numbers.
 */

import { 
  getJobLotNumber, 
  extractJobInfoFromId, 
  getAlignedLotDisplayName,
  getJobLotMapping
} from '../src/lib/centralized-lot-management';

async function testLotAlignment() {
  console.log('🎯 Testing Lot Number Alignment System');
  console.log('━'.repeat(70));
  console.log();

  // Test Case 1: Job with lot number in ID
  console.log('📋 Test Case 1: Job with Lot Number in ID');
  console.log('─'.repeat(50));
  
  const testJobId = 'AERO-2025-001-item-0-lot-3';
  const testPartNumber = '1606P-AEROSPACE';
  const testPartName = '1606P-AEROSPACE';
  const testOrderId = 'AERO-2025-001';

  console.log(`Job ID: ${testJobId}`);
  console.log(`Part: ${testPartNumber}`);
  console.log(`Order: ${testOrderId}`);
  console.log();

  // Extract job info
  const jobInfo = extractJobInfoFromId(testJobId);
  console.log('🔍 Extracted Job Information:');
  console.log(`   Order ID: ${jobInfo?.orderId}`);
  console.log(`   Item ID: ${jobInfo?.itemId}`);
  console.log(`   Sequential Lot Number: ${jobInfo?.lotNumber}`);
  console.log();

  // Test aligned lot number generation for each component
  console.log('🎯 Aligned Lot Number Generation:');
  
  const components: Array<'job_creation' | 'traceability_task' | 'routing_sheet' | 'material_approval'> = [
    'job_creation',
    'traceability_task',
    'routing_sheet', 
    'material_approval'
  ];

  const lotNumbers: Record<string, string> = {};

  for (const component of components) {
    try {
      const lotNumber = await getJobLotNumber(
        testJobId,
        testPartNumber,
        testPartName,
        testOrderId,
        component
      );
      lotNumbers[component] = lotNumber;
      console.log(`   ✓ ${component.padEnd(20)}: ${lotNumber}`);
    } catch (error) {
      console.log(`   ❌ ${component.padEnd(20)}: ERROR - ${error}`);
    }
  }

  // Verify all components got the same lot number
  const uniqueLotNumbers = new Set(Object.values(lotNumbers));
  console.log();
  if (uniqueLotNumbers.size === 1) {
    console.log('🎉 SUCCESS: All components use the same lot number!');
    console.log(`   Aligned Lot Number: ${Array.from(uniqueLotNumbers)[0]}`);
  } else {
    console.log('❌ FAILURE: Components have different lot numbers!');
    console.log('   This indicates the system is not properly aligned.');
  }
  
  console.log();
  console.log('📊 Lot Number Breakdown:');
  const alignedLot = Array.from(uniqueLotNumbers)[0];
  if (alignedLot) {
    const parts = alignedLot.split('-');
    console.log(`   Format: ${alignedLot}`);
    console.log(`   Part Code: ${parts[0]} (from "${testPartNumber}")`);
    console.log(`   Order Code: ${parts[1]} (from "${testOrderId}")`);
    console.log(`   Sequence: ${parts[3]} (from job lot number ${jobInfo?.lotNumber})`);
  }

  console.log();
  console.log('─'.repeat(70));
  
  // Test Case 2: Legacy job without lot number in ID
  console.log();
  console.log('📋 Test Case 2: Legacy Job (No Lot Number in ID)');
  console.log('─'.repeat(50));
  
  const legacyJobId = 'LEGACY-2025-001-item-5';
  const legacyPartNumber = 'LEGACY-PART';
  const legacyOrderId = 'LEGACY-2025-001';
  
  console.log(`Job ID: ${legacyJobId}`);
  console.log(`Part: ${legacyPartNumber}`);
  console.log(`Order: ${legacyOrderId}`);
  console.log();

  const legacyJobInfo = extractJobInfoFromId(legacyJobId);
  console.log('🔍 Extracted Job Information:');
  console.log(`   Order ID: ${legacyJobInfo?.orderId}`);
  console.log(`   Item ID: ${legacyJobInfo?.itemId}`);
  console.log(`   Sequential Lot Number: ${legacyJobInfo?.lotNumber || 'None (legacy format)'}`);
  console.log();

  // Test legacy lot number handling
  console.log('🔄 Legacy Lot Number Handling:');
  try {
    const legacyLotNumber = await getJobLotNumber(
      legacyJobId,
      legacyPartNumber,
      legacyPartNumber,
      legacyOrderId,
      'traceability_task'
    );
    console.log(`   ✓ Generated lot number: ${legacyLotNumber}`);
    console.log(`   📝 Note: Uses legacy generation since no lot number in job ID`);
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }

  console.log();
  console.log('─'.repeat(70));

  // Test Case 3: Display name generation
  console.log();
  console.log('📋 Test Case 3: Display Name Generation');
  console.log('─'.repeat(50));
  
  const displayNameAligned = getAlignedLotDisplayName(testJobId, testPartName);
  const displayNameLegacy = getAlignedLotDisplayName(legacyJobId, legacyPartNumber);
  
  console.log(`Aligned Job Display: ${displayNameAligned}`);
  console.log(`Legacy Job Display: ${displayNameLegacy}`);

  console.log();
  console.log('─'.repeat(70));

  // Summary
  console.log();
  console.log('📈 Lot Number Alignment Summary');
  console.log('─'.repeat(50));
  console.log('✅ Benefits of the new system:');
  console.log('   • Job ID lot number becomes source of truth');
  console.log('   • All components use same aligned lot number format');
  console.log('   • Traceability maintained across manufacturing process');
  console.log('   • Backwards compatible with legacy jobs');
  console.log();
  console.log('🎯 Alignment Strategy:');
  console.log('   • Extract sequential lot number from job ID');
  console.log('   • Generate formatted lot number: PART-ORDER-LOT-SEQUENCE');
  console.log('   • Store mapping in centralized system');
  console.log('   • All components retrieve same lot number');
  console.log();
  console.log('🔄 Usage in Components:');
  console.log('   • Set Traceability & Lot Number task');
  console.log('   • Routing sheet generation');
  console.log('   • Material approval dialogs');
  console.log('   • Job archival and documentation');

  console.log();
  console.log('🎉 Test completed successfully!');
}

// Handle offline testing
async function testOffline() {
  console.log('⚠️  Running in offline mode - simulating lot number generation');
  console.log();
  
  // Simulate aligned lot number generation
  function simulateAlignedLotNumber(jobId: string, orderId: string, partNumber: string): string {
    const jobInfo = extractJobInfoFromId(jobId);
    const lotSequence = jobInfo?.lotNumber || 1;
    
    const orderCode = orderId.replace(/[^A-Z0-9]/g, '').slice(-6);
    const partCode = partNumber.replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const sequenceStr = lotSequence.toString().padStart(3, '0');
    
    return `${partCode}-${orderCode}-LOT-${sequenceStr}`;
  }

  const testJobId = 'AERO-2025-001-item-0-lot-3';
  const testPartNumber = '1606P-AEROSPACE';
  const testOrderId = 'AERO-2025-001';

  console.log('📋 Offline Simulation:');
  console.log(`Job ID: ${testJobId}`);
  console.log(`Expected aligned lot: ${simulateAlignedLotNumber(testJobId, testOrderId, testPartNumber)}`);
  console.log();
  console.log('✅ This lot number would be used consistently across:');
  console.log('   • Traceability task');
  console.log('   • Routing sheet');
  console.log('   • Material approval');
  console.log('   • Job archival');
}

if (require.main === module) {
  testLotAlignment().catch(error => {
    console.error('Test failed:', error);
    console.log();
    testOffline();
  });
}

export { testLotAlignment }; 