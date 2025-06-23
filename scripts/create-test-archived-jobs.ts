#!/usr/bin/env npx tsx

/**
 * Create Test Archived Jobs
 * 
 * This script creates sample archived jobs with complete manufacturing forms
 * so you can see archived jobs directly on the Archive Intelligence page.
 */

import { archiveJob } from '../src/lib/job-archival';
import { generateManufacturingForms } from '../src/lib/manufacturing-forms';

async function createTestArchivedJobs() {
  console.log('🏭 Creating Test Archived Jobs with Manufacturing Forms\n');

  const testJobs = [
    {
      id: 'TEST-ARCHIVE-001',
      partName: '1606P',
      clientName: 'Aerospace Dynamics Ltd.',
      quantity: 5,
      operations: ['3-Axis Milling', 'Deburring', 'Quality Inspection'],
      qualityScore: 9.2
    },
    {
      id: 'TEST-ARCHIVE-002', 
      partName: 'Sensor Housing',
      clientName: 'Tech Solutions Inc.',
      quantity: 10,
      operations: ['5-Axis Milling', 'Anodizing', 'Final Inspection'],
      qualityScore: 8.7
    },
    {
      id: 'TEST-ARCHIVE-003',
      partName: 'Bracket Assembly',
      clientName: 'Manufacturing Corp.',
      quantity: 25,
      operations: ['Laser Cutting', 'Bending', 'Welding', 'Finishing'],
      qualityScore: 8.9
    },
    {
      id: 'TEST-ARCHIVE-004',
      partName: 'Precision Shaft',
      clientName: 'Precision Parts LLC',
      quantity: 8,
      operations: ['Turning', 'Grinding', 'Heat Treatment', 'Quality Control'],
      qualityScore: 9.5
    },
    {
      id: 'TEST-ARCHIVE-005',
      partName: 'Control Panel',
      clientName: 'Electronics Systems',
      quantity: 15,
      operations: ['CNC Machining', 'Powder Coating', 'Assembly'],
      qualityScore: 8.8
    }
  ];

  try {
    for (const testJob of testJobs) {
      console.log(`📦 Creating archived job: ${testJob.partName} (${testJob.id})`);

      // Create mock job structure
      const mockJob = {
        id: testJob.id,
        item: {
          partName: testJob.partName,
          quantity: testJob.quantity,
          description: `Test archived job for ${testJob.partName}`,
          processes: testJob.operations
        },
        clientName: testJob.clientName,
        orderNumber: `ORDER-${testJob.id}`,
        status: 'Completed' as const,
        priority: 'Medium' as const,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        tasks: [],
        subtasks: [],
        lotInfo: {
          lotNumber: Math.floor(Math.random() * 10) + 1,
          lotId: `LOT-${testJob.id}`,
          partNumber: testJob.partName,
          totalLotsForPart: Math.floor(Math.random() * 5) + 1,
          createdAt: new Date(),
          completedAt: new Date(),
          archivedAt: new Date()
        }
      };

      // Generate manufacturing forms
      console.log(`📋 Generating manufacturing forms...`);
      const manufacturingForms = await generateManufacturingForms(mockJob);

      // Create performance data
      const performanceData = {
        qualityScore: testJob.qualityScore,
        totalDuration: Math.random() * 20 + 5, // 5-25 hours
        issuesEncountered: [
          { type: 'Setup Delay', description: 'Minor fixture adjustment needed' },
          { type: 'Tool Wear', description: 'End mill required replacement' }
        ],
        lessonsLearned: [
          'Pre-check fixture alignment to avoid setup delays',
          'Monitor tool wear more frequently for this material'
        ]
      };

      // Archive the job
      console.log(`📁 Archiving job...`);
      await archiveJob(
        mockJob,
        'completed',
        performanceData,
        manufacturingForms
      );

      console.log(`✅ Successfully archived ${testJob.partName}\n`);
    }

    console.log('🎉 All test archived jobs created successfully!');
    console.log('\n📋 You can now:');
    console.log('1. Go to Archive Intelligence page (/archive-intelligence)');
    console.log('2. See all archived jobs listed automatically');
    console.log('3. Click "View Details" to see complete manufacturing forms');
    console.log('4. Navigate through routing sheets, setup sheets, tool lists, etc.');

  } catch (error) {
    console.error('❌ Error creating test archived jobs:', error);
  }
}

// Run the script
createTestArchivedJobs().catch(console.error); 