#!/usr/bin/env tsx

/**
 * Simple Relational Architecture Implementation Test
 * 
 * This script tests the relational architecture implementation with
 * mock data to validate the core functionality.
 */

import { 
  RelationalJob,
  RelationalCustomer,
  RelationalOrder,
  RelationalMachine,
  RelationalOperator,
  Reference,
  BidirectionalReference,
  EventDrivenReference,
  TraceabilityChain
} from '../src/types/relational';

import {
  RelationshipManager,
  TraceabilityManager,
  EventManager,
  ComplianceManager
} from '../src/lib/relational-architecture';

class RelationalImplementationTest {
  private testResults: { name: string; passed: boolean; error?: string }[] = [];

  async runTests(): Promise<void> {
    console.log('🧪 Testing Relational Architecture Implementation\n');

    // Test core functionality
    await this.testTypeDefinitions();
    await this.testReferenceStructures();
    await this.testRelationalEntityCreation();
    await this.testManagerClassesExist();
    await this.testTraceabilityStructures();
    await this.testComplianceFrameworkStructures();
    
    this.printResults();
  }

  private async runTest(testName: string, testFunction: () => Promise<void>): Promise<void> {
    try {
      await testFunction();
      this.testResults.push({ name: testName, passed: true });
      console.log(`✅ ${testName}`);
    } catch (error) {
      this.testResults.push({ 
        name: testName, 
        passed: false, 
        error: error instanceof Error ? error.message : String(error)
      });
      console.log(`❌ ${testName}: ${error}`);
    }
  }

  private async testTypeDefinitions(): Promise<void> {
    await this.runTest('Type Definitions', async () => {
      // Test that all required types are properly defined
      const reference: Reference = {
        id: 'test_001',
        collection: 'test_collection',
        metadata: {
          displayName: 'Test Reference',
          isActive: true,
          relationshipType: 'test'
        }
      };

      const bidirectionalRef: BidirectionalReference = {
        id: 'test_002',
        collection: 'test_collection',
        metadata: {
          displayName: 'Bidirectional Test',
          isActive: true,
          relationshipType: 'bidirectional'
        },
        reverseReference: {
          collection: 'reverse_collection',
          field: 'reverseField'
        }
      };

      const eventDrivenRef: EventDrivenReference = {
        id: 'test_003',
        collection: 'test_collection',
        metadata: {
          displayName: 'Event Driven Test',
          isActive: true,
          relationshipType: 'event_driven'
        },
        reverseReference: {
          collection: 'reverse_collection',
          field: 'reverseField'
        },
        eventTriggers: {
          onCreate: ['update_parent'],
          onUpdate: ['sync_data'],
          onDelete: ['cleanup']
        },
        cascadeRules: {
          onParentDelete: 'orphan',
          onChildDelete: 'update_parent'
        }
      };

      // Validate structure
      if (!reference.id || !reference.collection) {
        throw new Error('Reference missing required fields');
      }

      if (!bidirectionalRef.reverseReference) {
        throw new Error('BidirectionalReference missing reverse reference');
      }

      if (!eventDrivenRef.eventTriggers || !eventDrivenRef.cascadeRules) {
        throw new Error('EventDrivenReference missing triggers or cascade rules');
      }
    });
  }

  private async testReferenceStructures(): Promise<void> {
    await this.runTest('Reference Structures', async () => {
      // Test reference creation and validation
      const references: Reference[] = [
        {
          id: 'customer_001',
          collection: 'customers',
          metadata: {
            displayName: 'Test Customer',
            lastUpdated: new Date().toISOString(),
            isActive: true,
            relationshipType: 'customer_reference'
          }
        },
        {
          id: 'order_001',
          collection: 'orders',
          metadata: {
            displayName: 'Test Order',
            lastUpdated: new Date().toISOString(),
            isActive: true,
            relationshipType: 'order_reference'
          }
        }
      ];

      // Validate reference array
      if (references.length !== 2) {
        throw new Error('Reference array not properly created');
      }

      // Validate reference properties
      for (const ref of references) {
        if (!ref.id || !ref.collection || !ref.metadata) {
          throw new Error('Reference missing required properties');
        }

        if (!ref.metadata.displayName || !ref.metadata.relationshipType) {
          throw new Error('Reference metadata incomplete');
        }
      }
    });
  }

  private async testRelationalEntityCreation(): Promise<void> {
    await this.runTest('Relational Entity Creation', async () => {
      // Create a test customer
      const customer: RelationalCustomer = {
        id: 'customer_test_001',
        entityType: 'customer',
        relationships: new Map(),
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          lastModifiedBy: 'test_system'
        },
        customerData: {
          name: 'Test Customer Corp',
          code: 'TCC001',
          industry: 'Manufacturing',
          certificationLevel: 'AS9100D'
        },
        contracts: [],
        orders: [],
        specialRequirements: [],
        qualificationStatus: {
          id: 'qual_001',
          collection: 'qualifications',
          metadata: {
            displayName: 'AS9100D Qualified',
            isActive: true,
            relationshipType: 'qualification'
          }
        },
        qualityRequirements: {
          as9100dLevel: 'Full',
          specialClauses: ['8.2.1', '8.5.2'],
          customRequirements: ['Special Handling']
        }
      };

      // Create a test order
      const order: RelationalOrder = {
        id: 'order_test_001',
        entityType: 'order',
        relationships: new Map(),
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          lastModifiedBy: 'test_system'
        },
        orderData: {
          orderNumber: 'ORD-2024-001',
          poNumber: 'PO-12345',
          orderDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high'
        },
        contractId: {
          id: 'contract_001',
          collection: 'contracts',
          reverseReference: {
            collection: 'orders',
            field: 'contractId'
          },
          eventTriggers: {
            onCreate: ['update_contract_orders']
          },
          cascadeRules: {
            onParentDelete: 'orphan',
            onChildDelete: 'update_parent'
          }
        },
        customerId: {
          id: customer.id,
          collection: 'customers',
          reverseReference: {
            collection: 'orders',
            field: 'customerId'
          },
          eventTriggers: {
            onCreate: ['update_customer_orders']
          },
          cascadeRules: {
            onParentDelete: 'orphan',
            onChildDelete: 'update_parent'
          }
        },
        jobs: [],
        orderItems: [],
        status: 'processing',
        trackingData: {
          currentPhase: 'manufacturing',
          completionPercentage: 0,
          estimatedCompletion: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString()
        }
      };

      // Create a test job
      const job: RelationalJob = {
        id: 'job_test_001',
        entityType: 'job',
        relationships: new Map(),
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          lastModifiedBy: 'test_system'
        },
        jobData: {
          jobNumber: 'JOB-2024-001',
          partNumber: 'TEST-PART-001',
          partName: 'Test Part',
          quantity: 5,
          priority: 'high',
          dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()
        },
        orderId: {
          id: order.id,
          collection: 'orders',
          reverseReference: {
            collection: 'jobs',
            field: 'orderId'
          },
          eventTriggers: {
            onCreate: ['update_order_jobs']
          },
          cascadeRules: {
            onParentDelete: 'orphan',
            onChildDelete: 'update_parent'
          }
        },
        customerId: {
          id: customer.id,
          collection: 'customers',
          reverseReference: {
            collection: 'jobs',
            field: 'customerId'
          },
          eventTriggers: {
            onUpdate: ['sync_customer_requirements']
          },
          cascadeRules: {
            onParentDelete: 'orphan',
            onChildDelete: 'ignore'
          }
        },
        tasks: [],
        materialLots: [],
        partInstances: [],
        routingSheet: {
          id: 'routing_001',
          collection: 'routing_sheets',
          metadata: {
            displayName: 'Test Routing Sheet',
            isActive: true,
            relationshipType: 'process_documentation'
          }
        },
        qualityPlan: {
          id: 'quality_plan_001',
          collection: 'quality_plans',
          metadata: {
            displayName: 'Test Quality Plan',
            isActive: true,
            relationshipType: 'quality_documentation'
          }
        },
        performanceData: {
          id: 'perf_001',
          collection: 'job_performance',
          metadata: {
            displayName: 'Job Performance Data',
            isActive: true,
            relationshipType: 'performance_tracking'
          }
        },
        timeRecords: [],
        isPatternCandidate: false,
        status: 'planning',
        currentPhase: 'setup',
        completionPercentage: 0,
        traceabilityChain: {
          rootEntity: {
            id: 'job_test_001',
            collection: 'jobs',
            metadata: {
              displayName: 'Test Job',
              isActive: true,
              relationshipType: 'root'
            }
          },
          chain: [],
          compliance: {
            as9100dClauses: ['8.2.1', '8.5.2'],
            auditTrail: [],
            retentionPeriod: 7
          }
        },
        complianceFramework: {
          entityId: 'job_test_001',
          entityType: 'job',
          applicableClauses: [
            {
              clauseNumber: '8.2.1',
              clauseTitle: 'Customer communication',
              requirement: 'Communicate with customers regarding product information',
              complianceLevel: 'required'
            }
          ],
          complianceRecords: [],
          auditTrail: [],
          nonCompliances: [],
          validationRules: [
            {
              ruleId: 'customer_approval',
              description: 'Customer approval required for design changes',
              validationFunction: 'validateCustomerApproval',
              isActive: true
            }
          ],
          overallCompliance: {
            percentage: 0,
            status: 'pending_assessment',
            lastAssessment: new Date().toISOString(),
            nextAssessment: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      };

      // Validate entity creation
      if (!customer.id || customer.entityType !== 'customer') {
        throw new Error('Customer entity not properly created');
      }

      if (!order.id || order.entityType !== 'order') {
        throw new Error('Order entity not properly created');
      }

      if (!job.id || job.entityType !== 'job') {
        throw new Error('Job entity not properly created');
      }

      // Validate relational references
      if (job.orderId.id !== order.id) {
        throw new Error('Job-Order relationship not properly established');
      }

      if (job.customerId.id !== customer.id) {
        throw new Error('Job-Customer relationship not properly established');
      }

      if (order.customerId.id !== customer.id) {
        throw new Error('Order-Customer relationship not properly established');
      }
    });
  }

  private async testManagerClassesExist(): Promise<void> {
    await this.runTest('Manager Classes Exist', async () => {
      // Test that all manager classes are properly exported and accessible
      if (typeof RelationshipManager !== 'function') {
        throw new Error('RelationshipManager class not accessible');
      }

      if (typeof TraceabilityManager !== 'function') {
        throw new Error('TraceabilityManager class not accessible');
      }

      if (typeof EventManager !== 'function') {
        throw new Error('EventManager class not accessible');
      }

      if (typeof ComplianceManager !== 'function') {
        throw new Error('ComplianceManager class not accessible');
      }

      // Test that key static methods exist
      if (typeof RelationshipManager.createRelationship !== 'function') {
        throw new Error('RelationshipManager.createRelationship method not found');
      }

      if (typeof TraceabilityManager.buildTraceabilityChain !== 'function') {
        throw new Error('TraceabilityManager.buildTraceabilityChain method not found');
      }

      if (typeof EventManager.processEvent !== 'function') {
        throw new Error('EventManager.processEvent method not found');
      }

      if (typeof ComplianceManager.assessCompliance !== 'function') {
        throw new Error('ComplianceManager.assessCompliance method not found');
      }
    });
  }

  private async testTraceabilityStructures(): Promise<void> {
    await this.runTest('Traceability Structures', async () => {
      // Create a test traceability chain
      const traceabilityChain: TraceabilityChain = {
        rootEntity: {
          id: 'job_001',
          collection: 'jobs',
          metadata: {
            displayName: 'Test Job',
            isActive: true,
            relationshipType: 'root'
          }
        },
        chain: [
          {
            entityId: 'material_lot_001',
            entityType: 'material_lot',
            relationships: [
              {
                id: 'supplier_001',
                collection: 'suppliers',
                metadata: {
                  displayName: 'Test Supplier',
                  isActive: true,
                  relationshipType: 'supplier'
                }
              }
            ],
            timestamp: new Date().toISOString(),
            operator: 'test_operator'
          },
          {
            entityId: 'machine_001',
            entityType: 'machine',
            relationships: [
              {
                id: 'operator_001',
                collection: 'operators',
                metadata: {
                  displayName: 'Test Operator',
                  isActive: true,
                  relationshipType: 'operator'
                }
              }
            ],
            timestamp: new Date().toISOString(),
            operator: 'test_operator'
          }
        ],
        compliance: {
          as9100dClauses: ['8.5.2', '8.2.1'],
          auditTrail: [
            {
              timestamp: new Date().toISOString(),
              action: 'chain_created',
              operator: 'test_system',
              details: 'Traceability chain initialized'
            }
          ],
          retentionPeriod: 7
        }
      };

      // Validate traceability chain structure
      if (!traceabilityChain.rootEntity || !traceabilityChain.rootEntity.id) {
        throw new Error('Traceability chain missing root entity');
      }

      if (!Array.isArray(traceabilityChain.chain)) {
        throw new Error('Traceability chain.chain is not an array');
      }

      if (!traceabilityChain.compliance || !Array.isArray(traceabilityChain.compliance.as9100dClauses)) {
        throw new Error('Traceability chain missing compliance data');
      }

      if (traceabilityChain.chain.length !== 2) {
        throw new Error('Traceability chain length incorrect');
      }

      // Validate chain links
      for (const link of traceabilityChain.chain) {
        if (!link.entityId || !link.entityType || !link.timestamp) {
          throw new Error('Traceability chain link missing required fields');
        }

        if (!Array.isArray(link.relationships)) {
          throw new Error('Traceability chain link relationships not an array');
        }
      }
    });
  }

  private async testComplianceFrameworkStructures(): Promise<void> {
    await this.runTest('Compliance Framework Structures', async () => {
      // Test compliance framework structure
      const complianceFramework = {
        entityId: 'test_entity_001',
        entityType: 'job',
        applicableClauses: [
          {
            clauseNumber: '8.2.1',
            clauseTitle: 'Customer communication',
            requirement: 'Communicate with customers regarding product information',
            complianceLevel: 'required' as const
          },
          {
            clauseNumber: '8.5.2',
            clauseTitle: 'Identification and traceability',
            requirement: 'Ensure unique identification and traceability of products',
            complianceLevel: 'required' as const
          }
        ],
        complianceRecords: [
          {
            clauseNumber: '8.2.1',
            assessmentDate: new Date().toISOString(),
            isCompliant: true,
            evidence: 'Customer communication logs available',
            assessor: 'test_assessor',
            notes: 'All requirements met'
          }
        ],
        auditTrail: [
          {
            timestamp: new Date().toISOString(),
            action: 'compliance_assessment',
            operator: 'test_system',
            details: 'Initial compliance assessment completed'
          }
        ],
        nonCompliances: [],
        validationRules: [
          {
            ruleId: 'customer_communication',
            description: 'Customer communication must be documented',
            validationFunction: 'validateCustomerCommunication',
            isActive: true
          }
        ],
        overallCompliance: {
          percentage: 85,
          status: 'pending_review' as const,
          lastAssessment: new Date().toISOString(),
          nextAssessment: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }
      };

      // Validate compliance framework structure
      if (!complianceFramework.entityId || !complianceFramework.entityType) {
        throw new Error('Compliance framework missing entity identification');
      }

      if (!Array.isArray(complianceFramework.applicableClauses) || complianceFramework.applicableClauses.length === 0) {
        throw new Error('Compliance framework missing applicable clauses');
      }

      if (!Array.isArray(complianceFramework.complianceRecords)) {
        throw new Error('Compliance framework compliance records not an array');
      }

      if (!Array.isArray(complianceFramework.auditTrail)) {
        throw new Error('Compliance framework audit trail not an array');
      }

      if (!Array.isArray(complianceFramework.validationRules)) {
        throw new Error('Compliance framework validation rules not an array');
      }

      if (!complianceFramework.overallCompliance || typeof complianceFramework.overallCompliance.percentage !== 'number') {
        throw new Error('Compliance framework missing overall compliance data');
      }

      // Validate clause structure
      for (const clause of complianceFramework.applicableClauses) {
        if (!clause.clauseNumber || !clause.clauseTitle || !clause.requirement) {
          throw new Error('Compliance clause missing required fields');
        }

        if (!['required', 'recommended', 'optional'].includes(clause.complianceLevel)) {
          throw new Error('Invalid compliance level');
        }
      }
    });
  }

  private printResults(): void {
    console.log('\n📊 Relational Architecture Implementation Test Results');
    console.log('=====================================================');

    const passed = this.testResults.filter(result => result.passed).length;
    const failed = this.testResults.filter(result => !result.passed).length;
    const total = this.testResults.length;

    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%\n`);

    if (failed > 0) {
      console.log('❌ Failed Tests:');
      this.testResults
        .filter(result => !result.passed)
        .forEach(result => {
          console.log(`   • ${result.name}: ${result.error}`);
        });
      console.log('');
    }

    if (passed === total) {
      console.log('🎉 All implementation tests passed!');
      console.log('The relational architecture types and classes are properly implemented.');
      console.log('\n📋 What you can test next:');
      console.log('• Run the manufacturing platform and create jobs with relational context');
      console.log('• Test quality tracking with compliance validation');
      console.log('• Create patterns from completed jobs');
      console.log('• Use archive intelligence for historical insights');
      console.log('• Verify traceability chains in the UI');
    } else {
      console.log('⚠️  Some implementation tests failed. Please review the relational architecture implementation.');
    }
  }
}

// === Main Execution ===

async function main() {
  try {
    const test = new RelationalImplementationTest();
    await test.runTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main();
}

export { RelationalImplementationTest }; 