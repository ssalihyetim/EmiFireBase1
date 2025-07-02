import { getJobLotNumber, getAllJobLotMappings, extractJobInfoFromId } from '../src/lib/centralized-lot-management';

/**
 * Test script to verify centralized lot number consistency
 * Run this to ensure all components generate the same lot number for the same job
 */
async function testCentralizedLotConsistency() {
  console.log('🧪 Testing Centralized Lot Number Consistency\n');

  // Test job data
  const testJobId = 'AERO-2025-001-item-0-lot-1';
  const testPartNumber = '1606P-AEROSPACE';
  const testPartName = '1606P-AEROSPACE';
  const testOrderId = 'AERO-2025-001';

  console.log('📋 Test Job Information:');
  console.log(`   Job ID: ${testJobId}`);
  console.log(`   Part Number: ${testPartNumber}`);
  console.log(`   Part Name: ${testPartName}`);
  console.log(`   Order ID: ${testOrderId}\n`);

  // Test 1: Extract job info from ID
  console.log('🔍 Test 1: Job ID Parsing');
  const jobInfo = extractJobInfoFromId(testJobId);
  console.log('   Extracted info:', jobInfo);
  console.log(`   ✓ Order ID extracted: ${jobInfo?.orderId}`);
  console.log(`   ✓ Item ID extracted: ${jobInfo?.itemId}`);
  console.log(`   ✓ Lot number extracted: ${jobInfo?.lotNumber}\n`);

  // Test 2: Consistent lot number generation across components
  console.log('🎯 Test 2: Consistent Lot Number Generation');
  
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
      console.log(`   ✓ ${component}: ${lotNumber}`);
    } catch (error) {
      console.log(`   ❌ ${component}: ERROR - ${error}`);
    }
  }

  // Check consistency
  console.log('\n📊 Consistency Check:');
  const uniqueLotNumbers = new Set(Object.values(lotNumbers));
  
  if (uniqueLotNumbers.size === 1) {
    console.log('   ✅ ALL COMPONENTS GENERATED THE SAME LOT NUMBER');
    console.log(`   📋 Consistent lot number: ${Array.from(uniqueLotNumbers)[0]}`);
  } else {
    console.log('   ❌ INCONSISTENT LOT NUMBERS DETECTED!');
    console.log('   🔧 Different lot numbers generated:');
    Object.entries(lotNumbers).forEach(([component, lotNumber]) => {
      console.log(`      ${component}: ${lotNumber}`);
    });
  }

  // Test 3: Usage tracking
  console.log('\n📝 Test 3: Usage Tracking');
  const allMappings = await getAllJobLotMappings();
  const testJobMapping = allMappings.find(mapping => mapping.jobId === testJobId);
  
  if (testJobMapping) {
    console.log('   ✓ Lot mapping found in database');
    console.log(`   📋 Lot number: ${testJobMapping.lotNumber}`);
    console.log(`   📊 Usage history (${testJobMapping.usageHistory.length} entries):`);
    testJobMapping.usageHistory.forEach((usage, index) => {
      console.log(`      ${index + 1}. ${usage.component} at ${new Date(usage.timestamp).toLocaleString()}`);
    });
  } else {
    console.log('   ❌ No lot mapping found for test job');
  }

  // Test 4: Fallback behavior
  console.log('\n🛡️ Test 4: Fallback Behavior with Missing Info');
  
  try {
    const fallbackLotNumber = await getJobLotNumber(
      testJobId,
      'PART', // Default value that should trigger extraction
      'Unknown Part', // Default value that should trigger extraction
      'unknown-order', // Default value that should trigger extraction
      'traceability_task'
    );
    console.log(`   ✓ Fallback lot number: ${fallbackLotNumber}`);
    
    // Should still be consistent with previous generations
    if (lotNumbers.traceability_task && fallbackLotNumber === lotNumbers.traceability_task) {
      console.log('   ✅ Fallback generated consistent lot number');
    } else {
      console.log('   ⚠️ Fallback generated different lot number (this might be expected for new extraction logic)');
    }
  } catch (error) {
    console.log(`   ❌ Fallback test failed: ${error}`);
  }

  // Test 5: Multiple jobs consistency
  console.log('\n🔄 Test 5: Multiple Jobs Consistency');
  
  const testJobs = [
    { id: 'AERO-2025-001-item-1-lot-2', part: '1606P-AEROSPACE' },
    { id: 'AERO-2025-001-item-2-lot-3', part: '1606P-AEROSPACE' },
    { id: 'AERO-2025-002-item-0-lot-1', part: 'BTDK1-PART' }
  ];

  for (const testJob of testJobs) {
    try {
      const lotNumber = await getJobLotNumber(
        testJob.id,
        testJob.part,
        testJob.part,
        testJob.id.split('-item-')[0],
        'job_creation'
      );
      console.log(`   ✓ Job ${testJob.id.split('-')[3]}: ${lotNumber}`);
    } catch (error) {
      console.log(`   ❌ Job ${testJob.id}: ERROR - ${error}`);
    }
  }

  console.log('\n🎉 Centralized Lot Number Consistency Test Completed');
  console.log('\n💡 Key Benefits:');
  console.log('   • Single source of truth for lot numbers');
  console.log('   • Consistent across all components (traceability, routing, material approval)');
  console.log('   • Usage tracking for audit trails');
  console.log('   • Automatic fallback for missing information');
  console.log('   • Job ID parsing for backward compatibility');
}

// Run the test
testCentralizedLotConsistency().catch(console.error); 