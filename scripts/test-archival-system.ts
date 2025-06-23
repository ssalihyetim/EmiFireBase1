// Test Archival System - Populate Sample Manufacturing History
// Run this to create realistic archive data for testing

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import type { JobArchive, Job, JobTask } from '../src/types';

// Firebase config (you'll need to update this with your config)
const firebaseConfig = {
  // Add your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample manufacturing data
const sampleArchives: Omit<JobArchive, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    originalJobId: "job_001_archived",
    archiveDate: "2024-01-15",
    archiveType: "completed",
    
    jobSnapshot: {
      id: "job_001_archived",
      orderId: "order_001",
      orderNumber: "AER-2024-001",
      clientName: "Aerospace Dynamics Inc",
      status: "Completed",
      item: {
        partName: "Landing Gear Bracket - Main",
        partNumber: "LG-BRACKET-001",
        rawMaterialType: "Aluminum 7075-T6",
        assignedProcesses: ["Turning", "3-Axis Milling", "Anodizing"],
        quantity: 1,
        drawingRevision: "Rev-C",
        specialInstructions: "Critical aerospace component - AS9100D compliance required"
      },
      createdAt: "2024-01-10",
      updatedAt: "2024-01-15"
    } as Job,
    
    taskSnapshot: [
      {
        id: "task_001_turning",
        jobId: "job_001_archived",
        taskName: "Rough Turning Operation",
        category: "manufacturing_process",
        process: "Turning",
        status: "Completed",
        estimatedDuration: 4,
        assignedMachine: "HAAS-ST-30",
        priority: "high"
      },
      {
        id: "task_002_milling",
        jobId: "job_001_archived", 
        taskName: "3-Axis Precision Milling",
        category: "manufacturing_process",
        process: "3-Axis Milling",
        status: "Completed",
        estimatedDuration: 6,
        assignedMachine: "HAAS-VF-2",
        priority: "high"
      },
      {
        id: "task_003_anodizing",
        jobId: "job_001_archived",
        taskName: "Type II Anodizing",
        category: "manufacturing_process", 
        process: "Anodizing",
        status: "Completed",
        estimatedDuration: 2,
        priority: "normal"
      }
    ] as JobTask[],
    
    subtaskSnapshot: [],
    
    completedForms: {
      routingSheet: {
        formType: "routing_sheet",
        formId: "routing_001",
        completedBy: "John Smith",
        completedAt: "2024-01-15",
        formData: {
          processSequence: ["Turning", "3-Axis Milling", "Anodizing"],
          qualityCheckpoints: ["Dimensional Check", "Surface Finish", "Final Inspection"]
        },
        signatures: {
          operator: "John Smith",
          inspector: "Jane Doe",
          supervisor: "Mike Johnson"
        }
      },
      setupSheets: [
        {
          formType: "setup_sheet",
          formId: "setup_001_turning",
          completedBy: "John Smith", 
          completedAt: "2024-01-12",
          formData: {
            machineSetup: "HAAS ST-30 with 3-jaw chuck",
            tooling: "CNMG carbide inserts",
            workholding: "3-jaw chuck with soft jaws"
          },
          signatures: {
            operator: "John Smith"
          }
        }
      ],
      toolLists: [
        {
          formType: "tool_list",
          formId: "tool_001",
          completedBy: "Tool Crib Manager",
          completedAt: "2024-01-12",
          formData: {
            tools: [
              { toolNumber: "T01", description: "CNMG Insert", condition: "Good" },
              { toolNumber: "T02", description: "Face Mill 4\"", condition: "Good" },
              { toolNumber: "T03", description: "Drill 0.5\"", condition: "Good" }
            ]
          },
          signatures: {
            operator: "Tool Manager"
          }
        }
      ],
      faiReports: [
        {
          formType: "fai_report",
          formId: "fai_001",
          completedBy: "Quality Inspector",
          completedAt: "2024-01-15",
          formData: {
            dimensions: [
              { feature: "Overall Length", nominal: 150.0, actual: 149.95, tolerance: "±0.1" },
              { feature: "Hole Diameter", nominal: 12.0, actual: 12.02, tolerance: "±0.05" }
            ],
            result: "PASS"
          },
          signatures: {
            inspector: "Jane Doe"
          }
        }
      ],
      inspectionRecords: []
    },
    
    performanceData: {
      totalDuration: 10.5, // Hours
      qualityScore: 9.2,
      efficiencyRating: 8.8,
      onTimeDelivery: true,
      customerSatisfaction: 9.5,
      issuesEncountered: [
        {
          id: "issue_001",
          type: "tooling",
          severity: "low",
          description: "Tool wear noticed during final pass",
          reportedBy: "John Smith",
          reportedAt: "2024-01-14",
          solutionApplied: "Replaced insert with new carbide",
          resolvedBy: "John Smith",
          resolvedAt: "2024-01-14"
        }
      ],
      lessonsLearned: [
        "New coolant setting improved surface finish",
        "Soft jaws prevented marking on finished surface"
      ]
    },
    
    qualityData: {
      allInspectionsPassed: true,
      finalQualityScore: 9.2,
      nonConformances: [],
      customerAcceptance: true,
      qualityDocuments: ["FAI_001.pdf", "InspectionReport_001.pdf"]
    },
    
    archivedBy: "Manufacturing Manager",
    archiveReason: "Job completed successfully - high quality result",
    retentionPeriod: 10
  },

  // Second archive - Engine Mount
  {
    originalJobId: "job_002_archived",
    archiveDate: "2024-01-20",
    archiveType: "completed",
    
    jobSnapshot: {
      id: "job_002_archived",
      orderId: "order_002", 
      orderNumber: "AER-2024-002",
      clientName: "Turbine Technologies",
      status: "Completed",
      item: {
        partName: "Engine Mount Housing",
        partNumber: "ENG-MOUNT-003",
        rawMaterialType: "Titanium Ti-6Al-4V",
        assignedProcesses: ["5-Axis Milling", "Heat Treatment", "Grinding"],
        quantity: 2,
        drawingRevision: "Rev-B",
        specialInstructions: "Critical engine component - high precision required"
      },
      createdAt: "2024-01-12",
      updatedAt: "2024-01-20"
    } as Job,
    
    taskSnapshot: [
      {
        id: "task_004_5axis",
        jobId: "job_002_archived",
        taskName: "5-Axis Complex Machining",
        category: "manufacturing_process",
        process: "5-Axis Milling", 
        status: "Completed",
        estimatedDuration: 12,
        assignedMachine: "DMG-MORI-5AX",
        priority: "high"
      }
    ] as JobTask[],
    
    subtaskSnapshot: [],
    
    completedForms: {
      routingSheet: {
        formType: "routing_sheet",
        formId: "routing_002",
        completedBy: "Advanced Machinist",
        completedAt: "2024-01-20",
        formData: {},
        signatures: { operator: "Advanced Machinist" }
      },
      setupSheets: [],
      toolLists: [],
      faiReports: [],
      inspectionRecords: []
    },
    
    performanceData: {
      totalDuration: 15.2,
      qualityScore: 9.6,
      efficiencyRating: 9.1,
      onTimeDelivery: true,
      issuesEncountered: [],
      lessonsLearned: ["5-axis program optimization saved 2 hours"]
    },
    
    qualityData: {
      allInspectionsPassed: true,
      finalQualityScore: 9.6,
      nonConformances: [],
      customerAcceptance: true,
      qualityDocuments: ["FAI_002.pdf"]
    },
    
    archivedBy: "Manufacturing Manager",
    archiveReason: "Excellent quality result - candidate for pattern creation",
    retentionPeriod: 10
  },

  // Third archive - Quality Failure example
  {
    originalJobId: "job_003_archived",
    archiveDate: "2024-01-25",
    archiveType: "quality_failure",
    
    jobSnapshot: {
      id: "job_003_archived",
      orderId: "order_003",
      orderNumber: "AER-2024-003", 
      clientName: "Defense Systems Corp",
      status: "Cancelled",
      item: {
        partName: "Hydraulic Valve Body",
        partNumber: "HYD-VALVE-012",
        rawMaterialType: "Stainless Steel 316L",
        assignedProcesses: ["Turning", "4-Axis Milling"],
        quantity: 5,
        drawingRevision: "Rev-A"
      },
      createdAt: "2024-01-18",
      updatedAt: "2024-01-25"
    } as Job,
    
    taskSnapshot: [
      {
        id: "task_005_turning",
        jobId: "job_003_archived",
        taskName: "Precision Turning",
        category: "manufacturing_process",
        process: "Turning",
        status: "Failed",
        estimatedDuration: 3,
        priority: "normal"
      }
    ] as JobTask[],
    
    subtaskSnapshot: [],
    
    completedForms: {
      routingSheet: {
        formType: "routing_sheet",
        formId: "routing_003",
        completedBy: "Operator",
        completedAt: "2024-01-25",
        formData: {},
        signatures: { operator: "Operator" }
      },
      setupSheets: [],
      toolLists: [],
      faiReports: [],
      inspectionRecords: []
    },
    
    performanceData: {
      totalDuration: 4.5,
      qualityScore: 3.2, // Failed
      efficiencyRating: 4.0,
      onTimeDelivery: false,
      issuesEncountered: [
        {
          id: "issue_002",
          type: "quality",
          severity: "critical",
          description: "Dimensional tolerance exceeded - part scrapped",
          reportedBy: "Quality Inspector",
          reportedAt: "2024-01-25",
          solutionApplied: "Process parameter adjustment needed",
          resolvedBy: "Engineering",
          resolvedAt: "2024-01-25"
        }
      ],
      lessonsLearned: ["Need better fixture design for thin-wall parts"]
    },
    
    qualityData: {
      allInspectionsPassed: false,
      finalQualityScore: 3.2,
      nonConformances: ["NCR-2024-001"],
      customerAcceptance: false,
      qualityDocuments: ["NCR_001.pdf", "FailureAnalysis_001.pdf"]
    },
    
    archivedBy: "Quality Manager",
    archiveReason: "Quality failure - archived for analysis and improvement",
    retentionPeriod: 10
  }
];

// Function to populate archives
async function populateArchives() {
  console.log('🏭 Starting to populate manufacturing archive data...');
  
  try {
    for (const archive of sampleArchives) {
      const archiveData = {
        ...archive,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'job_archives'), archiveData);
      console.log(`✅ Created archive: ${docRef.id} - ${archive.jobSnapshot.item.partName}`);
    }
    
    console.log(`🎉 Successfully populated ${sampleArchives.length} manufacturing archives!`);
    console.log('');
    console.log('📊 Archive Summary:');
    console.log(`   - ${sampleArchives.filter(a => a.archiveType === 'completed').length} Completed Jobs`);
    console.log(`   - ${sampleArchives.filter(a => a.archiveType === 'quality_failure').length} Quality Failures`);
    console.log(`   - Average Quality Score: ${(sampleArchives.reduce((sum, a) => sum + a.performanceData.qualityScore, 0) / sampleArchives.length).toFixed(1)}`);
    console.log('');
    console.log('🧪 You can now test the archive system at:');
    console.log('   http://localhost:3000/en/jobs');
    console.log('   Click "Manufacturing History" to see archived jobs');
    
  } catch (error) {
    console.error('❌ Failed to populate archives:', error);
  }
}

// Run the script
if (require.main === module) {
  populateArchives();
}

export { populateArchives, sampleArchives }; 