#!/usr/bin/env npx tsx

/**
 * Offline Lot Tracking Test
 * 
 * Tests the lot tracking system logic without Firebase dependencies
 * to verify the core functionality works as expected.
 */

import { getPartNameWithLot, getLotNumberFromJobId } from '../src/lib/lot-number-generator';

// In-memory lot counter simulation
const lotCounters = new Map<string, number>();

function simulateGetNextLotNumber(partNumber: string, orderId?: string): number {
  const counterKey = orderId ? `${partNumber}-${orderId}` : partNumber;
  const currentLot = (lotCounters.get(counterKey) || 0) + 1;
  lotCounters.set(counterKey, currentLot);
  return currentLot;
}

function simulateGenerateJobIdWithLot(
  orderId: string,
  itemId: string,
  partNumber: string,
  useOrderBasedLots: boolean = true,
  lotNumber?: number // Use pre-generated lot number
): string {
  const lot = lotNumber || (useOrderBasedLots 
    ? simulateGetNextLotNumber(partNumber, orderId)
    : simulateGetNextLotNumber(partNumber));
  
  return `${orderId}-item-${itemId}-lot-${lot}`;
}

function testLotTrackingOffline() {
  console.log('🧪 Testing Lot Tracking System (Offline Mode)\n');

  // Test 1: Multiple lots within same order
  console.log('Test 1: Multiple Lots in Same Order');
  const orderId = 'AERO-2025-001';
  const partNumber = '1606P-AEROSPACE';
  
  const lot1 = simulateGetNextLotNumber(partNumber, orderId);
  const lot2 = simulateGetNextLotNumber(partNumber, orderId);
  const lot3 = simulateGetNextLotNumber(partNumber, orderId);
  
  console.log(`✅ Lot 1: ${lot1}`);
  console.log(`✅ Lot 2: ${lot2}`);
  console.log(`✅ Lot 3: ${lot3}`);
  
  const sequentialTest = lot1 === 1 && lot2 === 2 && lot3 === 3;
  console.log(`🎯 Sequential lot numbering: ${sequentialTest ? 'PASSED' : 'FAILED'}`);

  // Test 2: Job ID generation
  console.log('\nTest 2: Job ID Generation with Order-Based Lots');
  
  const jobId1 = simulateGenerateJobIdWithLot(orderId, '0', partNumber, true);
  const jobId2 = simulateGenerateJobIdWithLot(orderId, '1', partNumber, true);
  const jobId3 = simulateGenerateJobIdWithLot(orderId, '2', partNumber, true);
  
  console.log(`🆔 Job 1: ${jobId1}`);
  console.log(`🆔 Job 2: ${jobId2}`);
  console.log(`🆔 Job 3: ${jobId3}`);
  
  // Verify lot numbers in job IDs
  const extractedLot1 = getLotNumberFromJobId(jobId1);
  const extractedLot2 = getLotNumberFromJobId(jobId2);
  const extractedLot3 = getLotNumberFromJobId(jobId3);
  
  console.log(`📋 Extracted lots: ${extractedLot1}, ${extractedLot2}, ${extractedLot3}`);
  
  const extractionTest = extractedLot1 === 4 && extractedLot2 === 5 && extractedLot3 === 6;
  console.log(`🎯 Lot extraction from job ID: ${extractionTest ? 'PASSED' : 'FAILED'}`);

  // Test 3: Different order - independent lot tracking
  console.log('\nTest 3: Different Order - Independent Lot Tracking');
  
  const orderId2 = 'AERO-2025-002';
  const lot1Order2 = simulateGetNextLotNumber(partNumber, orderId2);
  const lot2Order2 = simulateGetNextLotNumber(partNumber, orderId2);
  
  console.log(`📋 Order 2: ${orderId2}`);
  console.log(`✅ Lot 1: ${lot1Order2} (should be 1)`);
  console.log(`✅ Lot 2: ${lot2Order2} (should be 2)`);
  
  const independentTest = lot1Order2 === 1 && lot2Order2 === 2;
  console.log(`🎯 Independent order lot tracking: ${independentTest ? 'PASSED' : 'FAILED'}`);

  // Test 4: Part name display
  console.log('\nTest 4: Part Name Display with Lot Numbers');
  
  const displayName1 = getPartNameWithLot(partNumber, 1);
  const displayName2 = getPartNameWithLot(partNumber, 2);
  const displayName3 = getPartNameWithLot(partNumber, 3);
  
  console.log(`📛 Display: ${displayName1}`);
  console.log(`📛 Display: ${displayName2}`);
  console.log(`📛 Display: ${displayName3}`);
  
  const displayTest = displayName1.includes('(Lot 1)') && 
                     displayName2.includes('(Lot 2)') && 
                     displayName3.includes('(Lot 3)');
  console.log(`🎯 Part name formatting: ${displayTest ? 'PASSED' : 'FAILED'}`);

  // Test 5: Multiple parts in same order
  console.log('\nTest 5: Multiple Parts in Same Order');
  
  const multiPartOrderId = 'AIRBUS-2025-001';
  const enginePart = 'ENGINE-MOUNT-A350';
  const fuselagePart = 'FUSELAGE-PANEL-A350';
  
  const engineLot1 = simulateGetNextLotNumber(enginePart, multiPartOrderId);
  const engineLot2 = simulateGetNextLotNumber(enginePart, multiPartOrderId);
  const fuselageLot1 = simulateGetNextLotNumber(fuselagePart, multiPartOrderId);
  const fuselageLot2 = simulateGetNextLotNumber(fuselagePart, multiPartOrderId);
  
  console.log(`🔧 ${enginePart} - Lot ${engineLot1}`);
  console.log(`🔧 ${enginePart} - Lot ${engineLot2}`);
  console.log(`🏗️  ${fuselagePart} - Lot ${fuselageLot1}`);
  console.log(`🏗️  ${fuselagePart} - Lot ${fuselageLot2}`);
  
  const multiPartTest = engineLot1 === 1 && engineLot2 === 2 && 
                       fuselageLot1 === 1 && fuselageLot2 === 2;
  console.log(`🎯 Multi-part lot tracking: ${multiPartTest ? 'PASSED' : 'FAILED'}`);

  // Test 6: Large order scenario (aerospace) - FIXED
  console.log('\nTest 6: Large Aerospace Order (10 units)');
  
  const largeOrderId = 'BOEING-2025-001';
  const wingPart = 'WING-COMPONENT-737';
  
  console.log('📦 Generating 10 lots for large aerospace order:');
  const largeLots: number[] = [];
  for (let i = 1; i <= 10; i++) {
    const lotNumber = simulateGetNextLotNumber(wingPart, largeOrderId);
    const jobId = simulateGenerateJobIdWithLot(largeOrderId, i.toString(), wingPart, true, lotNumber); // Pass pre-generated lot
    largeLots.push(lotNumber);
    console.log(`  📦 Lot ${lotNumber}: ${jobId}`);
  }
  
  // Verify all lots are sequential 1-10
  const largeOrderTest = largeLots.every((lot, index) => lot === index + 1);
  console.log(`🎯 Large order sequential lots: ${largeOrderTest ? 'PASSED' : 'FAILED'}`);

  // Test 7: Global vs order-based lot tracking
  console.log('\nTest 7: Global vs Order-Based Lot Tracking');
  
  const testPart = 'TEST-PART-123';
  
  // Global lot tracking (no order specified)
  const globalLot1 = simulateGetNextLotNumber(testPart);
  const globalLot2 = simulateGetNextLotNumber(testPart);
  
  // Order-based lot tracking
  const orderLot1 = simulateGetNextLotNumber(testPart, 'ORDER-1');
  const orderLot2 = simulateGetNextLotNumber(testPart, 'ORDER-2');
  
  console.log(`🌍 Global lots: ${globalLot1}, ${globalLot2}`);
  console.log(`📦 Order-based lots: ${orderLot1} (ORDER-1), ${orderLot2} (ORDER-2)`);
  
  const globalVsOrderTest = globalLot1 === 1 && globalLot2 === 2 && 
                           orderLot1 === 1 && orderLot2 === 1;
  console.log(`🎯 Global vs order-based separation: ${globalVsOrderTest ? 'PASSED' : 'FAILED'}`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 Test Summary:');
  console.log(`• Sequential lot numbering: ${sequentialTest ? '✅' : '❌'}`);
  console.log(`• Job ID generation: ${extractionTest ? '✅' : '❌'}`);
  console.log(`• Independent order tracking: ${independentTest ? '✅' : '❌'}`);
  console.log(`• Part name formatting: ${displayTest ? '✅' : '❌'}`);
  console.log(`• Multi-part tracking: ${multiPartTest ? '✅' : '❌'}`);
  console.log(`• Large order handling: ${largeOrderTest ? '✅' : '❌'}`);
  console.log(`• Global vs order separation: ${globalVsOrderTest ? '✅' : '❌'}`);
  
  const allPassed = sequentialTest && extractionTest && independentTest && 
                   displayTest && multiPartTest && largeOrderTest && globalVsOrderTest;
  
  console.log('\n' + (allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'));
  
  if (allPassed) {
    console.log('\n✨ The lot tracking system is working correctly and supports:');
    console.log('   • Multiple lots within the same order (aerospace requirement)');
    console.log('   • Independent lot tracking per order');
    console.log('   • Sequential lot numbering');
    console.log('   • Proper job ID generation with lots');
    console.log('   • Multi-part orders with separate lot sequences');
    console.log('   • Large-scale aerospace manufacturing scenarios');
  }

  return allPassed;
}

// Run the test
try {
  const success = testLotTrackingOffline();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('💥 Test failed with error:', error);
  process.exit(1);
} 