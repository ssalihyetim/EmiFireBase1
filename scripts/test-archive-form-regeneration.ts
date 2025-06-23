#!/usr/bin/env tsx

// Import our functions that already handle Firebase initialization
import { searchJobArchives, regenerateFormsFromArchiveData } from '../src/lib/job-archival';

async function testArchiveFormRegeneration() {
  console.log('\n🧪 Testing Archive Form Regeneration System');
  console.log('='.repeat(50));

  try {
    // Step 1: Get existing archives
    console.log('\n📊 Step 1: Searching for existing archives');
    const archives = await searchJobArchives({});
    console.log(`✅ Found ${archives.length} archived jobs`);

    if (archives.length === 0) {
      console.log('⚠️ No archives found - test cannot proceed');
      return;
    }

    // Step 2: Find an archive with empty forms
    console.log('\n🔍 Step 2: Looking for archives with empty forms');
    const archiveWithEmptyForms = archives.find(archive => {
      const hasEmptyRoutingSheet = !archive.completedForms.routingSheet?.formData ||
        Object.keys(archive.completedForms.routingSheet?.formData || {}).length === 0;
      return hasEmptyRoutingSheet;
    });

    if (!archiveWithEmptyForms) {
      console.log('⚠️ No archives with empty forms found - using first archive for testing');
      const testArchive = archives[0];
      console.log(`📋 Testing with archive: ${testArchive.originalJobId}`);
      
      // Test regeneration anyway
      console.log('\n🔄 Step 3: Testing form regeneration');
      const regeneratedForms = await regenerateFormsFromArchiveData(testArchive);
      
      console.log('\n📋 Regeneration Results:');
      console.log(`   - Total Forms: ${regeneratedForms.totalForms}`);
      console.log(`   - Routing Sheets: ${regeneratedForms.routingSheets.length}`);
      console.log(`   - Setup Sheets: ${regeneratedForms.setupSheets.length}`);
      console.log(`   - Tool Lists: ${regeneratedForms.toolLists.length}`);
      console.log(`   - FAI Reports: ${regeneratedForms.faiReports.length}`);
      console.log(`   - Inspection Records: ${regeneratedForms.inspectionRecords.length}`);

      // Show sample data
      if (regeneratedForms.routingSheets.length > 0) {
        const routingSheet = regeneratedForms.routingSheets[0];
        console.log('\n📄 Sample Routing Sheet:');
        console.log(`   - Form ID: ${routingSheet.formId}`);
        console.log(`   - Completed By: ${routingSheet.completedBy}`);
        console.log(`   - Date: ${routingSheet.completedAt}`);
        console.log(`   - Process Count: ${routingSheet.formData.processes?.length || 0}`);
        if (routingSheet.formData.extractedFromArchive) {
          console.log('   - Source: 🔄 Extracted from archive data');
        }
      }

      if (regeneratedForms.setupSheets.length > 0) {
        console.log('\n🔧 Setup Sheets Generated:');
        regeneratedForms.setupSheets.forEach((sheet, idx) => {
          console.log(`   ${idx + 1}. ${sheet.formId} (${sheet.formData.processType})`);
        });
      }

      if (regeneratedForms.inspectionRecords.length > 0) {
        console.log('\n📊 Inspection Records Found:');
        regeneratedForms.inspectionRecords.forEach((record, idx) => {
          console.log(`   ${idx + 1}. ${record.formData.recordType}`);
          if (record.formData.actualSetupTime !== 'Not recorded') {
            console.log(`      - Setup Time: ${record.formData.actualSetupTime} min`);
          }
          if (record.formData.actualCycleTime !== 'Not recorded') {
            console.log(`      - Cycle Time: ${record.formData.actualCycleTime} min`);
          }
        });
      }

      return;
    }

    // Step 3: Test regeneration on archive with empty forms
    console.log(`✅ Found archive with empty forms: ${archiveWithEmptyForms.originalJobId}`);
    console.log(`📋 Original forms status:`);
    console.log(`   - Routing Sheet: ${archiveWithEmptyForms.completedForms.routingSheet ? 'Has data' : 'Empty'}`);
    console.log(`   - Setup Sheets: ${archiveWithEmptyForms.completedForms.setupSheets?.length || 0}`);
    console.log(`   - Tool Lists: ${archiveWithEmptyForms.completedForms.toolLists?.length || 0}`);
    console.log(`   - FAI Reports: ${archiveWithEmptyForms.completedForms.faiReports?.length || 0}`);

    console.log('\n🔄 Step 3: Regenerating forms from archive data');
    const regeneratedForms = await regenerateFormsFromArchiveData(archiveWithEmptyForms);

    console.log('\n📋 Regeneration Results:');
    console.log(`   - Total Forms Generated: ${regeneratedForms.totalForms}`);
    console.log(`   - Routing Sheets: ${regeneratedForms.routingSheets.length}`);
    console.log(`   - Setup Sheets: ${regeneratedForms.setupSheets.length}`);
    console.log(`   - Tool Lists: ${regeneratedForms.toolLists.length}`);
    console.log(`   - FAI Reports: ${regeneratedForms.faiReports.length}`);
    console.log(`   - Inspection Records: ${regeneratedForms.inspectionRecords.length}`);

    // Step 4: Show detailed results
    if (regeneratedForms.totalForms > 0) {
      console.log('\n📄 Detailed Form Analysis:');
      
      if (regeneratedForms.routingSheets.length > 0) {
        const routingSheet = regeneratedForms.routingSheets[0];
        console.log('\n🗺️ Routing Sheet Generated:');
        console.log(`   - Form ID: ${routingSheet.formId}`);
        console.log(`   - Part Name: ${routingSheet.formData.partName}`);
        console.log(`   - Material: ${routingSheet.formData.material}`);
        console.log(`   - Process Count: ${routingSheet.formData.processes?.length || 0}`);
        console.log(`   - Operations: ${routingSheet.formData.routingSequence?.length || 0}`);
        console.log(`   - Source: ${routingSheet.formData.extractedFromArchive ? '🔄 Archive Extraction' : '📊 Live Data'}`);
      }

      if (regeneratedForms.setupSheets.length > 0) {
        console.log('\n🔧 Setup Sheets:');
        regeneratedForms.setupSheets.slice(0, 3).forEach((sheet, idx) => {
          console.log(`   ${idx + 1}. Operation ${sheet.formData.operationNumber}: ${sheet.formData.processType}`);
          console.log(`      - Machine: ${sheet.formData.machineName}`);
          console.log(`      - Setup Time: ${sheet.formData.setupTime || 'N/A'} min`);
        });
        if (regeneratedForms.setupSheets.length > 3) {
          console.log(`   ... and ${regeneratedForms.setupSheets.length - 3} more`);
        }
      }

      if (regeneratedForms.toolLists.length > 0) {
        console.log('\n🔨 Tool Lists:');
        regeneratedForms.toolLists.slice(0, 2).forEach((list, idx) => {
          console.log(`   ${idx + 1}. ${list.formData.processType} Tools:`);
          if (list.formData.tools?.length > 0) {
            list.formData.tools.forEach((tool: any, toolIdx: number) => {
              console.log(`      - ${tool.toolNumber}: ${tool.description}`);
            });
          }
        });
      }

      console.log('\n✅ Archive Form Regeneration Test Completed Successfully!');
      console.log('📊 Summary:');
      console.log(`   - Original Job: ${archiveWithEmptyForms.originalJobId}`);
      console.log(`   - Archive Date: ${archiveWithEmptyForms.archiveDate}`);
      console.log(`   - Tasks in Archive: ${archiveWithEmptyForms.taskSnapshot.length}`);
      console.log(`   - Subtasks in Archive: ${archiveWithEmptyForms.subtaskSnapshot.length}`);
      console.log(`   - Forms Generated: ${regeneratedForms.totalForms}`);

    } else {
      console.log('⚠️ No forms could be generated from archive data');
      console.log('   This may indicate:');
      console.log('   - Archive contains no manufacturing tasks');
      console.log('   - Task structure has changed since archival');
      console.log('   - Archive data is incomplete');
    }

  } catch (error) {
    console.error('❌ Error during archive form regeneration test:', error);
  }
}

// Run the test
testArchiveFormRegeneration().then(() => {
  console.log('\n🎉 Archive Form Regeneration Test Complete');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 