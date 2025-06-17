import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { 
  Tool, 
  ToolFirestoreData, 
  ToolLifeVerification, 
  ToolPerformanceRecord,
  ToolVerificationEntry 
} from '@/types/tools';

const TOOLS_COLLECTION = 'tools';
const TOOL_LIFE_VERIFICATIONS_COLLECTION = 'toolLifeVerifications';
const TOOL_PERFORMANCE_COLLECTION = 'toolPerformance';

// === Type Conversion Helpers ===

function toolFromFirestore(snapshot: any): Tool {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name,
    partNumber: data.partNumber,
    description: data.description,
    diameter: data.diameter,
    length: data.length,
    flutes: data.flutes,
    defaultRpm: data.defaultRpm,
    defaultFeedRate: data.defaultFeedRate,
    defaultDepthOfCut: data.defaultDepthOfCut,
    defaultWidthOfCut: data.defaultWidthOfCut,
    lifeLimit: data.lifeLimit,
    lifeLimitUnit: data.lifeLimitUnit,
    currentLife: data.currentLife,
    totalLifeUsed: data.totalLifeUsed,
    riskLevel: data.riskLevel,
    criticalityFactor: data.criticalityFactor,
    lastInspectionDate: data.lastInspectionDate,
    nextInspectionDue: data.nextInspectionDue,
    condition: data.condition,
    performanceHistory: data.performanceHistory,
    createdAt: data.createdAt.toDate().toISOString(),
    updatedAt: data.updatedAt.toDate().toISOString(),
  };
}

function toolToFirestore(tool: Partial<Tool>): Partial<Omit<ToolFirestoreData, 'createdAt' | 'updatedAt'>> {
    const { id, createdAt, updatedAt, ...rest } = tool;
    return rest;
}


// === Firebase CRUD Operations ===

/**
 * Fetches all tools from the central tool database.
 * @returns A promise that resolves to an array of tools.
 */
export async function getAllTools(): Promise<Tool[]> {
  try {
    const q = query(collection(db, TOOLS_COLLECTION), orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(toolFromFirestore);
  } catch (error) {
    console.error('Error fetching tools:', error);
    throw error;
  }
}

/**
 * Fetches a single tool by its ID.
 * @param toolId The ID of the tool to fetch.
 * @returns A promise that resolves to the tool object, or null if not found.
 */
export async function getToolById(toolId: string): Promise<Tool | null> {
  try {
    const docRef = doc(db, TOOLS_COLLECTION, toolId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return toolFromFirestore(docSnap);
    }
    return null;
  } catch (error) {
    console.error('Error fetching tool:', error);
    throw error;
  }
}

/**
 * Adds a new tool to the database.
 * @param toolData The data for the new tool.
 * @returns The ID of the newly created tool.
 */
export async function createTool(toolData: Omit<Tool, 'id'>): Promise<string> {
  try {
    const firestoreData: ToolFirestoreData = {
      ...toolData,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    
    const docRef = await addDoc(collection(db, TOOLS_COLLECTION), firestoreData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating tool:', error);
    throw error;
  }
}

/**
 * Updates an existing tool in the database.
 * @param toolId The ID of the tool to update.
 * @param updates The partial data to update.
 */
export async function updateTool(toolId: string, updates: Partial<Tool>): Promise<void> {
  try {
    const docRef = doc(db, TOOLS_COLLECTION, toolId);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating tool:', error);
    throw error;
  }
}

/**
 * Deletes a tool from the database.
 * @param toolId The ID of the tool to delete.
 */
export async function deleteTool(toolId: string): Promise<void> {
  try {
    const docRef = doc(db, TOOLS_COLLECTION, toolId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting tool:', error);
    throw error;
  }
}

// === Tool Life Verification Operations ===

export async function createToolLifeVerification(
  verificationData: Omit<ToolLifeVerification, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const docData = {
      ...verificationData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const docRef = await addDoc(collection(db, TOOL_LIFE_VERIFICATIONS_COLLECTION), docData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating tool life verification:', error);
    throw error;
  }
}

export async function getToolLifeVerificationsByJob(jobId: string): Promise<ToolLifeVerification[]> {
  try {
    const q = query(
      collection(db, TOOL_LIFE_VERIFICATIONS_COLLECTION),
      where('jobId', '==', jobId),
      orderBy('verificationDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ToolLifeVerification));
  } catch (error) {
    console.error('Error fetching tool life verifications:', error);
    throw error;
  }
}

export async function getToolLifeVerificationBySubtask(subtaskId: string): Promise<ToolLifeVerification | null> {
  try {
    const q = query(
      collection(db, TOOL_LIFE_VERIFICATIONS_COLLECTION),
      where('subtaskId', '==', subtaskId)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as ToolLifeVerification;
    }
    return null;
  } catch (error) {
    console.error('Error fetching tool life verification:', error);
    throw error;
  }
}

// === Tool Performance Tracking ===

export async function recordToolPerformance(
  performanceData: Omit<ToolPerformanceRecord, 'id' | 'recordedAt'>
): Promise<string> {
  try {
    const docData = {
      ...performanceData,
      id: `${performanceData.jobId}-${performanceData.taskId}-${Date.now()}`,
      recordedAt: new Date().toISOString(),
    };
    
    const docRef = await addDoc(collection(db, TOOL_PERFORMANCE_COLLECTION), docData);
    
    // Update tool's performance history
    const toolRef = doc(db, TOOLS_COLLECTION, performanceData.jobId);
    const toolDoc = await getDoc(toolRef);
    
    if (toolDoc.exists()) {
      const toolData = toolDoc.data();
      const performanceHistory = toolData.performanceHistory || [];
      performanceHistory.push(docData);
      
      await updateDoc(toolRef, {
        performanceHistory,
        totalLifeUsed: (toolData.totalLifeUsed || 0) + performanceData.actualLifeUsed,
        updatedAt: serverTimestamp(),
      });
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error recording tool performance:', error);
    throw error;
  }
}

export async function getToolPerformanceHistory(toolId: string): Promise<ToolPerformanceRecord[]> {
  try {
    const q = query(
      collection(db, TOOL_PERFORMANCE_COLLECTION),
      where('toolId', '==', toolId),
      orderBy('recordedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ToolPerformanceRecord));
  } catch (error) {
    console.error('Error fetching tool performance history:', error);
    throw error;
  }
}

// === Risk Assessment Helpers ===

export function calculateToolRiskLevel(
  tool: Tool,
  criticalityFactor: number = 5
): 'low' | 'medium' | 'high' {
  const lifeUsedPercentage = tool.lifeLimit 
    ? ((tool.totalLifeUsed || 0) / tool.lifeLimit) * 100 
    : 0;
  
  // Risk matrix based on life used and criticality
  if (criticalityFactor >= 8 && lifeUsedPercentage >= 70) return 'high';
  if (criticalityFactor >= 6 && lifeUsedPercentage >= 80) return 'high';
  if (lifeUsedPercentage >= 90) return 'high';
  
  if (criticalityFactor >= 6 && lifeUsedPercentage >= 50) return 'medium';
  if (lifeUsedPercentage >= 70) return 'medium';
  
  return 'low';
}

export function getNextInspectionDate(
  tool: Tool,
  riskLevel: 'low' | 'medium' | 'high'
): string {
  const now = new Date();
  let daysToAdd = 30; // Default for low risk
  
  switch (riskLevel) {
    case 'high':
      daysToAdd = 7;
      break;
    case 'medium':
      daysToAdd = 14;
      break;
    case 'low':
      daysToAdd = 30;
      break;
  }
  
  const nextDate = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
  return nextDate.toISOString();
} 