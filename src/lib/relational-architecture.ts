import { 
  Reference, 
  BidirectionalReference, 
  EventDrivenReference, 
  RelationalEntity,
  TraceabilityChain,
  RelationshipEvent,
  CascadeUpdate,
  AS9100DComplianceFramework
} from '@/types/relational';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// === Relationship Management Core ===

export class RelationshipManager {
  /**
   * Create a bidirectional relationship between two entities
   */
  static async createRelationship<T, U>(
    sourceEntity: RelationalEntity,
    targetEntity: RelationalEntity,
    relationshipType: string,
    metadata?: any
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      // Create the reference
      const reference: Reference = {
        id: targetEntity.id,
        collection: this.getCollectionName(targetEntity.entityType),
        metadata: {
          displayName: this.getDisplayName(targetEntity),
          lastUpdated: timestamp,
          isActive: true,
          relationshipType,
          ...metadata
        }
      };

      // Add relationship to source entity
      if (!sourceEntity.relationships.has(relationshipType)) {
        sourceEntity.relationships.set(relationshipType, []);
      }
      sourceEntity.relationships.get(relationshipType)!.push(reference);

      // Update source entity in database
      await this.updateEntityRelationships(sourceEntity);

      // Create reverse relationship if bidirectional
      if (this.isBidirectionalRelationship(relationshipType)) {
        const reverseType = this.getReverseRelationshipType(relationshipType);
        const reverseReference: Reference = {
          id: sourceEntity.id,
          collection: this.getCollectionName(sourceEntity.entityType),
          metadata: {
            displayName: this.getDisplayName(sourceEntity),
            lastUpdated: timestamp,
            isActive: true,
            relationshipType: reverseType,
            ...metadata
          }
        };

        if (!targetEntity.relationships.has(reverseType)) {
          targetEntity.relationships.set(reverseType, []);
        }
        targetEntity.relationships.get(reverseType)!.push(reverseReference);

        // Update target entity in database
        await this.updateEntityRelationships(targetEntity);
      }

      // Create relationship event for audit trail
      const event: RelationshipEvent = {
        id: this.generateEventId(),
        eventType: 'create',
        sourceEntity: {
          id: sourceEntity.id,
          type: sourceEntity.entityType,
          collection: this.getCollectionName(sourceEntity.entityType)
        },
        targetEntity: {
          id: targetEntity.id,
          type: targetEntity.entityType,
          collection: this.getCollectionName(targetEntity.entityType)
        },
        relationship: relationshipType,
        timestamp,
        triggeredBy: 'system', // TODO: Get actual user
        cascadeRules: {
          updateRelated: true,
          notifyStakeholders: false,
          auditTrail: true
        }
      };

      await this.logRelationshipEvent(event);
      
    } catch (error) {
      console.error('Error creating relationship:', error);
      throw error;
    }
  }

  /**
   * Update a relationship and trigger cascade updates
   */
  static async updateRelationship<T, U>(
    sourceEntityId: string,
    sourceEntityType: string,
    relationshipType: string,
    targetEntityId: string,
    updates: Partial<Reference>,
    cascadeRules?: Partial<CascadeUpdate>
  ): Promise<void> {
    try {
      const sourceEntity = await this.getEntity(sourceEntityId, sourceEntityType);
      if (!sourceEntity) throw new Error('Source entity not found');

      const relationships = sourceEntity.relationships.get(relationshipType);
      if (!relationships) throw new Error('Relationship type not found');

      const referenceIndex = relationships.findIndex(ref => ref.id === targetEntityId);
      if (referenceIndex === -1) throw new Error('Target reference not found');

      // Update the reference
      const updatedReference = {
        ...relationships[referenceIndex],
        ...updates,
        metadata: {
          ...relationships[referenceIndex].metadata,
          ...updates.metadata,
          lastUpdated: new Date().toISOString()
        }
      };

      relationships[referenceIndex] = updatedReference;
      await this.updateEntityRelationships(sourceEntity);

      // Execute cascades if specified
      if (cascadeRules) {
        await this.executeCascadeUpdates(sourceEntity, updatedReference, cascadeRules);
      }

    } catch (error) {
      console.error('Error updating relationship:', error);
      throw error;
    }
  }

  /**
   * Delete a relationship and handle cleanup
   */
  static async deleteRelationship(
    sourceEntityId: string,
    sourceEntityType: string,
    relationshipType: string,
    targetEntityId: string,
    cleanupStrategy: 'cascade' | 'orphan' | 'reassign' = 'orphan'
  ): Promise<void> {
    try {
      const sourceEntity = await this.getEntity(sourceEntityId, sourceEntityType);
      if (!sourceEntity) throw new Error('Source entity not found');

      const relationships = sourceEntity.relationships.get(relationshipType);
      if (!relationships) return; // Nothing to delete

      const referenceIndex = relationships.findIndex(ref => ref.id === targetEntityId);
      if (referenceIndex === -1) return; // Reference not found

      // Remove the reference
      const removedReference = relationships[referenceIndex];
      relationships.splice(referenceIndex, 1);

      // Handle cleanup based on strategy
      switch (cleanupStrategy) {
        case 'cascade':
          await this.cascadeDelete(removedReference);
          break;
        case 'reassign':
          await this.reassignOrphanedReferences(removedReference);
          break;
        case 'orphan':
        default:
          // Leave orphaned references as-is
          break;
      }

      await this.updateEntityRelationships(sourceEntity);

      // Log deletion event
      const event: RelationshipEvent = {
        id: this.generateEventId(),
        eventType: 'delete',
        sourceEntity: {
          id: sourceEntity.id,
          type: sourceEntity.entityType,
          collection: this.getCollectionName(sourceEntity.entityType)
        },
        targetEntity: {
          id: targetEntityId,
          type: 'unknown',
          collection: removedReference.collection
        },
        relationship: relationshipType,
        timestamp: new Date().toISOString(),
        triggeredBy: 'system',
        cascadeRules: {
          updateRelated: true,
          notifyStakeholders: false,
          auditTrail: true
        }
      };

      await this.logRelationshipEvent(event);

    } catch (error) {
      console.error('Error deleting relationship:', error);
      throw error;
    }
  }

  /**
   * Validate relationship integrity across the system
   */
  static async validateIntegrity(
    entityId: string,
    entityType: string
  ): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const entity = await this.getEntity(entityId, entityType);
      if (!entity) {
        return {
          isValid: false,
          issues: ['Entity not found'],
          recommendations: ['Verify entity exists in database']
        };
      }

      // Validate each relationship
      for (const [relationshipType, references] of entity.relationships) {
        for (const reference of references) {
          // Check if referenced entity exists
          const referencedEntity = await this.getEntity(reference.id, this.getEntityTypeFromCollection(reference.collection));
          if (!referencedEntity) {
            issues.push(`Referenced entity ${reference.id} in ${reference.collection} not found`);
            recommendations.push(`Remove orphaned reference to ${reference.id} or restore the referenced entity`);
            continue;
          }

          // Check bidirectional relationships
          if (this.isBidirectionalRelationship(relationshipType)) {
            const reverseType = this.getReverseRelationshipType(relationshipType);
            const reverseReferences = referencedEntity.relationships.get(reverseType) || [];
            const hasReverseReference = reverseReferences.some(ref => ref.id === entityId);
            
            if (!hasReverseReference) {
              issues.push(`Missing reverse relationship ${reverseType} from ${reference.id} to ${entityId}`);
              recommendations.push(`Create missing reverse relationship or remove forward relationship`);
            }
          }

          // Validate reference metadata
          if (!reference.metadata?.lastUpdated) {
            issues.push(`Reference to ${reference.id} missing lastUpdated metadata`);
            recommendations.push(`Update reference metadata for ${reference.id}`);
          }
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error) {
      console.error('Error validating integrity:', error);
      return {
        isValid: false,
        issues: [`Validation error: ${error}`],
        recommendations: ['Check system logs and retry validation']
      };
    }
  }

  // === Private Helper Methods ===

  private static async getEntity(entityId: string, entityType: string): Promise<RelationalEntity | null> {
    try {
      const collectionName = this.getCollectionName(entityType);
      const docRef = doc(db, collectionName, entityId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      
      const data = docSnap.data();
      return {
        id: entityId,
        entityType,
        relationships: new Map(Object.entries(data.relationships || {})),
        metadata: data.metadata || {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        }
      } as RelationalEntity;
    } catch (error) {
      console.error('Error getting entity:', error);
      return null;
    }
  }

  private static async updateEntityRelationships(entity: RelationalEntity): Promise<void> {
    try {
      const collectionName = this.getCollectionName(entity.entityType);
      const docRef = doc(db, collectionName, entity.id);
      
      // Convert Map to object for Firestore
      const relationshipsObj = Object.fromEntries(entity.relationships);
      
      await updateDoc(docRef, {
        relationships: relationshipsObj,
        'metadata.updatedAt': new Date().toISOString(),
        'metadata.version': (entity.metadata.version || 0) + 1
      });
    } catch (error) {
      console.error('Error updating entity relationships:', error);
      throw error;
    }
  }

  private static async logRelationshipEvent(event: RelationshipEvent): Promise<void> {
    try {
      const docRef = doc(db, 'relationship_events', event.id);
      await setDoc(docRef, event);
    } catch (error) {
      console.error('Error logging relationship event:', error);
      // Don't throw - event logging shouldn't break the main operation
    }
  }

  private static async executeCascadeUpdates(
    sourceEntity: RelationalEntity,
    updatedReference: Reference,
    cascadeRules: Partial<CascadeUpdate>
  ): Promise<void> {
    // Implementation for cascade updates
    // This would trigger updates to related entities based on the cascade rules
    console.log('Executing cascade updates:', { sourceEntity, updatedReference, cascadeRules });
  }

  private static async cascadeDelete(reference: Reference): Promise<void> {
    // Implementation for cascade deletion
    console.log('Executing cascade delete:', reference);
  }

  private static async reassignOrphanedReferences(reference: Reference): Promise<void> {
    // Implementation for reassigning orphaned references
    console.log('Reassigning orphaned references:', reference);
  }

  private static getCollectionName(entityType: string): string {
    const collectionMap: Record<string, string> = {
      'customer': 'customers',
      'contract': 'contracts',
      'order': 'orders',
      'job': 'jobs',
      'job_task': 'job_tasks',
      'job_subtask': 'job_subtasks',
      'machine': 'machines',
      'operator': 'operators',
      'material_lot': 'material_lots',
      'part_instance': 'part_instances',
      'supplier': 'suppliers'
    };
    return collectionMap[entityType] || entityType + 's';
  }

  private static getEntityTypeFromCollection(collection: string): string {
    const typeMap: Record<string, string> = {
      'customers': 'customer',
      'contracts': 'contract',
      'orders': 'order',
      'jobs': 'job',
      'job_tasks': 'job_task',
      'job_subtasks': 'job_subtask',
      'machines': 'machine',
      'operators': 'operator',
      'material_lots': 'material_lot',
      'part_instances': 'part_instance',
      'suppliers': 'supplier'
    };
    return typeMap[collection] || collection.slice(0, -1); // Remove 's' suffix
  }

  private static getDisplayName(entity: RelationalEntity): string {
    // Extract display name based on entity type
    switch (entity.entityType) {
      case 'customer':
        return (entity as any).customerData?.name || entity.id;
      case 'job':
        return (entity as any).jobData?.jobNumber || entity.id;
      case 'machine':
        return (entity as any).machineData?.machineName || entity.id;
      case 'operator':
        return `${(entity as any).operatorData?.firstName} ${(entity as any).operatorData?.lastName}` || entity.id;
      default:
        return entity.id;
    }
  }

  private static isBidirectionalRelationship(relationshipType: string): boolean {
    const bidirectionalTypes = [
      'orders', 'jobs', 'tasks', 'subtasks', 'contracts',
      'materialLots', 'partInstances', 'currentJob', 'currentTask',
      'currentOperator', 'currentMachine'
    ];
    return bidirectionalTypes.includes(relationshipType);
  }

  private static getReverseRelationshipType(relationshipType: string): string {
    const reverseMap: Record<string, string> = {
      'orders': 'customerId',
      'jobs': 'orderId',
      'tasks': 'jobId',
      'subtasks': 'taskId',
      'contracts': 'customerId',
      'materialLots': 'jobsUsed',
      'partInstances': 'jobId',
      'currentJob': 'currentOperator',
      'currentTask': 'assignedOperator',
      'currentOperator': 'currentMachine',
      'currentMachine': 'currentOperator'
    };
    return reverseMap[relationshipType] || relationshipType + '_reverse';
  }

  private static generateEventId(): string {
    return `rel_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// === Traceability Management ===

export class TraceabilityManager {
  /**
   * Build complete traceability chain for an entity
   */
  static async buildTraceabilityChain(
    entityId: string,
    entityType: string
  ): Promise<TraceabilityChain> {
    try {
      const entity = await RelationshipManager['getEntity'](entityId, entityType);
      if (!entity) throw new Error('Entity not found');

      const chain: TraceabilityChain = {
        rootEntity: {
          id: entityId,
          collection: RelationshipManager['getCollectionName'](entityType),
          metadata: {
            displayName: RelationshipManager['getDisplayName'](entity),
            lastUpdated: new Date().toISOString(),
            isActive: true,
            relationshipType: 'root'
          }
        },
        chain: [],
        compliance: {
          as9100dClauses: [],
          auditTrail: [],
          retentionPeriod: 7 // Default 7 years
        }
      };

      // Build the chain recursively
      await this.buildChainRecursive(entity, chain, new Set([entityId]));

      return chain;
    } catch (error) {
      console.error('Error building traceability chain:', error);
      throw error;
    }
  }

  /**
   * Validate traceability completeness for AS9100D compliance
   */
  static async validateTraceability(
    entityId: string
  ): Promise<{
    isComplete: boolean;
    missingLinks: string[];
    complianceLevel: number;
  }> {
    try {
      const chain = await this.buildTraceabilityChain(entityId, 'part_instance');
      
      const requiredLinks = [
        'material_lot',
        'job',
        'order',
        'customer',
        'operator',
        'machine',
        'quality_record'
      ];

      const presentLinks = new Set(chain.chain.map(link => link.entityType));
      const missingLinks = requiredLinks.filter(link => !presentLinks.has(link));
      
      const complianceLevel = ((requiredLinks.length - missingLinks.length) / requiredLinks.length) * 100;

      return {
        isComplete: missingLinks.length === 0,
        missingLinks,
        complianceLevel: Math.round(complianceLevel)
      };
    } catch (error) {
      console.error('Error validating traceability:', error);
      return {
        isComplete: false,
        missingLinks: ['validation_error'],
        complianceLevel: 0
      };
    }
  }

  private static async buildChainRecursive(
    entity: RelationalEntity,
    chain: TraceabilityChain,
    visited: Set<string>,
    depth: number = 0
  ): Promise<void> {
    if (depth > 10) return; // Prevent infinite recursion

    for (const [relationshipType, references] of entity.relationships) {
      for (const reference of references) {
        if (visited.has(reference.id)) continue;
        visited.add(reference.id);

        const relatedEntity = await RelationshipManager['getEntity'](
          reference.id,
          RelationshipManager['getEntityTypeFromCollection'](reference.collection)
        );

        if (relatedEntity) {
          chain.chain.push({
            entityId: reference.id,
            entityType: relatedEntity.entityType,
            relationships: [reference],
            timestamp: reference.metadata?.lastUpdated || new Date().toISOString(),
            operator: 'system' // TODO: Extract actual operator
          });

          // Recursively build chain for related entity
          await this.buildChainRecursive(relatedEntity, chain, visited, depth + 1);
        }
      }
    }
  }
}

// === Event Management ===

export class EventManager {
  /**
   * Process relationship events and trigger cascades
   */
  static async processEvent(
    event: RelationshipEvent
  ): Promise<CascadeUpdate[]> {
    try {
      const cascades: CascadeUpdate[] = [];

      // Determine what cascades to trigger based on event type
      switch (event.eventType) {
        case 'create':
          cascades.push(...await this.createCascadesForCreation(event));
          break;
        case 'update':
          cascades.push(...await this.createCascadesForUpdate(event));
          break;
        case 'delete':
          cascades.push(...await this.createCascadesForDeletion(event));
          break;
      }

      // Execute cascades in order
      for (const cascade of cascades) {
        await this.executeCascade(cascade);
      }

      return cascades;
    } catch (error) {
      console.error('Error processing event:', error);
      throw error;
    }
  }

  /**
   * Execute cascade updates in proper order
   */
  static async executeCascades(
    cascades: CascadeUpdate[]
  ): Promise<void> {
    // Sort by execution order
    const sortedCascades = cascades.sort((a, b) => a.executionOrder - b.executionOrder);

    for (const cascade of sortedCascades) {
      await this.executeCascade(cascade);
    }
  }

  private static async createCascadesForCreation(event: RelationshipEvent): Promise<CascadeUpdate[]> {
    // Implementation for creation cascades
    return [];
  }

  private static async createCascadesForUpdate(event: RelationshipEvent): Promise<CascadeUpdate[]> {
    // Implementation for update cascades
    return [];
  }

  private static async createCascadesForDeletion(event: RelationshipEvent): Promise<CascadeUpdate[]> {
    // Implementation for deletion cascades
    return [];
  }

  private static async executeCascade(cascade: CascadeUpdate): Promise<void> {
    try {
      cascade.status = 'executing';
      
      for (const target of cascade.cascadeTargets) {
        const docRef = doc(db, target.collection, target.entityId);
        await updateDoc(docRef, target.updates);
      }

      cascade.status = 'completed';
    } catch (error) {
      cascade.status = 'failed';
      console.error('Error executing cascade:', error);
      throw error;
    }
  }
}

// === AS9100D Compliance Management ===

export class ComplianceManager {
  /**
   * Initialize compliance framework for an entity
   */
  static async initializeComplianceFramework(
    entityId: string,
    entityType: string
  ): Promise<AS9100DComplianceFramework> {
    const framework: AS9100DComplianceFramework = {
      entityId,
      entityType,
      applicableClauses: this.getApplicableClauses(entityType),
      complianceRecords: [],
      auditTrail: [],
      nonCompliances: [],
      validationRules: this.getValidationRules(entityType),
      overallCompliance: {
        percentage: 0,
        status: 'pending_review',
        lastAssessment: new Date().toISOString(),
        nextAssessment: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
      }
    };

    // Store framework in database
    const docRef = doc(db, 'compliance_frameworks', entityId);
    await setDoc(docRef, framework);

    return framework;
  }

  /**
   * Assess compliance for an entity
   */
  static async assessCompliance(
    entityId: string
  ): Promise<{
    percentage: number;
    status: 'compliant' | 'non_compliant' | 'pending_review';
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const frameworkDoc = await getDoc(doc(db, 'compliance_frameworks', entityId));
      if (!frameworkDoc.exists()) {
        return {
          percentage: 0,
          status: 'pending_review',
          issues: ['No compliance framework found'],
          recommendations: ['Initialize compliance framework']
        };
      }

      const framework = frameworkDoc.data() as AS9100DComplianceFramework;
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Assess each applicable clause
      let compliantClauses = 0;
      for (const clause of framework.applicableClauses) {
        const isCompliant = await this.assessClauseCompliance(entityId, clause.clauseNumber);
        if (isCompliant) {
          compliantClauses++;
        } else {
          issues.push(`Non-compliant with clause ${clause.clauseNumber}: ${clause.clauseTitle}`);
          recommendations.push(`Address requirements for clause ${clause.clauseNumber}`);
        }
      }

      const percentage = Math.round((compliantClauses / framework.applicableClauses.length) * 100);
      const status = percentage >= 95 ? 'compliant' : 
                    percentage >= 70 ? 'pending_review' : 'non_compliant';

      return {
        percentage,
        status,
        issues,
        recommendations
      };
    } catch (error) {
      console.error('Error assessing compliance:', error);
      return {
        percentage: 0,
        status: 'non_compliant',
        issues: [`Assessment error: ${error}`],
        recommendations: ['Check system logs and retry assessment']
      };
    }
  }

  private static getApplicableClauses(entityType: string): AS9100DComplianceFramework['applicableClauses'] {
    // Define applicable AS9100D clauses based on entity type
    const commonClauses = [
      {
        clauseNumber: '4.1',
        clauseTitle: 'Understanding the organization and its context',
        requirement: 'Determine external and internal issues relevant to purpose',
        complianceLevel: 'required' as const
      },
      {
        clauseNumber: '8.1',
        clauseTitle: 'Operational planning and control',
        requirement: 'Plan, implement and control processes needed to meet requirements',
        complianceLevel: 'required' as const
      }
    ];

    const entitySpecificClauses: Record<string, any[]> = {
      'job': [
        {
          clauseNumber: '8.2.1',
          clauseTitle: 'Customer communication',
          requirement: 'Communicate with customers regarding product information',
          complianceLevel: 'required'
        }
      ],
      'part_instance': [
        {
          clauseNumber: '8.5.2',
          clauseTitle: 'Identification and traceability',
          requirement: 'Identify outputs by suitable means throughout production',
          complianceLevel: 'required'
        }
      ]
    };

    return [...commonClauses, ...(entitySpecificClauses[entityType] || [])];
  }

  private static getValidationRules(entityType: string): AS9100DComplianceFramework['validationRules'] {
    return [
      {
        ruleId: 'traceability_complete',
        description: 'Complete traceability chain must be maintained',
        validationFunction: 'validateTraceabilityChain',
        isActive: true
      },
      {
        ruleId: 'documentation_current',
        description: 'All documentation must be current and controlled',
        validationFunction: 'validateDocumentationCurrency',
        isActive: true
      }
    ];
  }

  private static async assessClauseCompliance(entityId: string, clauseNumber: string): Promise<boolean> {
    // Implement specific compliance checks based on clause
    // This is a simplified implementation
    switch (clauseNumber) {
      case '8.5.2': // Identification and traceability
        const traceability = await TraceabilityManager.validateTraceability(entityId);
        return traceability.isComplete;
      default:
        return true; // Default to compliant for now
    }
  }
} 