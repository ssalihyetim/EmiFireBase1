import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  RoutingSheet, 
  SetupSheet, 
  ToolList, 
  Tool, 
  TemplateWorkflow 
} from '@/types/manufacturing-templates';
import { generateLotNumber } from './lot-number-generator';

// Collections
const ROUTING_SHEETS_COLLECTION = 'routing_sheets';
const SETUP_SHEETS_COLLECTION = 'setup_sheets';
const TOOL_LISTS_COLLECTION = 'tool_lists';
const TOOLS_COLLECTION = 'tools';
const TEMPLATE_WORKFLOWS_COLLECTION = 'template_workflows';

// ===== ROUTING SHEETS =====

export async function createRoutingSheet(
  routingSheet: Omit<RoutingSheet, 'id' | 'createdAt' | 'updatedAt' | 'rawMaterialLot'>
): Promise<string> {
  try {
    // Generate lot number for raw material
    const lotNumber = await generateLotNumber(
      routingSheet.jobId,
      routingSheet.taskId,
      'Raw Material', // Default material type
      routingSheet.partName
    );

    const now = new Date().toISOString();
    const newRoutingSheet: Omit<RoutingSheet, 'id'> = {
      ...routingSheet,
      rawMaterialLot: {
        lotNumber,
        materialType: 'Steel', // Default, can be customized
        dimension: '',
        supplier: '',
        receivedDate: now.split('T')[0]
      },
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(collection(db, ROUTING_SHEETS_COLLECTION), newRoutingSheet);
    return docRef.id;
  } catch (error) {
    console.error('Error creating routing sheet:', error);
    throw new Error('Failed to create routing sheet');
  }
}

export async function getRoutingSheet(id: string): Promise<RoutingSheet | null> {
  try {
    const docRef = doc(db, ROUTING_SHEETS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as RoutingSheet;
    }
    return null;
  } catch (error) {
    console.error('Error fetching routing sheet:', error);
    return null;
  }
}

export async function getRoutingSheetsByJob(jobId: string): Promise<RoutingSheet[]> {
  try {
    const q = query(
      collection(db, ROUTING_SHEETS_COLLECTION),
      where('jobId', '==', jobId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as RoutingSheet[];
  } catch (error) {
    console.error('Error fetching routing sheets by job:', error);
    return [];
  }
}

export async function getRoutingSheetsByTask(taskId: string): Promise<RoutingSheet[]> {
  try {
    const q = query(
      collection(db, ROUTING_SHEETS_COLLECTION),
      where('taskId', '==', taskId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as RoutingSheet[];
  } catch (error) {
    console.error('Error fetching routing sheets by task:', error);
    return [];
  }
}

export async function updateRoutingSheet(id: string, updates: Partial<RoutingSheet>): Promise<void> {
  try {
    const docRef = doc(db, ROUTING_SHEETS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating routing sheet:', error);
    throw new Error('Failed to update routing sheet');
  }
}

// ===== SETUP SHEETS =====

export async function createSetupSheet(setupSheet: Omit<SetupSheet, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const now = new Date().toISOString();
    const newSetupSheet: Omit<SetupSheet, 'id'> = {
      ...setupSheet,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(collection(db, SETUP_SHEETS_COLLECTION), newSetupSheet);
    return docRef.id;
  } catch (error) {
    console.error('Error creating setup sheet:', error);
    throw new Error('Failed to create setup sheet');
  }
}

export async function getSetupSheet(id: string): Promise<SetupSheet | null> {
  try {
    const docRef = doc(db, SETUP_SHEETS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SetupSheet;
    }
    return null;
  } catch (error) {
    console.error('Error fetching setup sheet:', error);
    return null;
  }
}

export async function getSetupSheetsBySubtask(subtaskId: string): Promise<SetupSheet[]> {
  try {
    const q = query(
      collection(db, SETUP_SHEETS_COLLECTION),
      where('subtaskId', '==', subtaskId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SetupSheet[];
  } catch (error) {
    console.error('Error fetching setup sheets by subtask:', error);
    return [];
  }
}

export async function updateSetupSheet(id: string, updates: Partial<SetupSheet>): Promise<void> {
  try {
    const docRef = doc(db, SETUP_SHEETS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating setup sheet:', error);
    throw new Error('Failed to update setup sheet');
  }
}

// ===== TOOL LISTS =====

export async function createToolList(toolList: Omit<ToolList, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const now = new Date().toISOString();
    const newToolList: Omit<ToolList, 'id'> = {
      ...toolList,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(collection(db, TOOL_LISTS_COLLECTION), newToolList);
    return docRef.id;
  } catch (error) {
    console.error('Error creating tool list:', error);
    throw new Error('Failed to create tool list');
  }
}

export async function getToolList(id: string): Promise<ToolList | null> {
  try {
    const docRef = doc(db, TOOL_LISTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ToolList;
    }
    return null;
  } catch (error) {
    console.error('Error fetching tool list:', error);
    return null;
  }
}

export async function getToolListsByJob(jobId: string): Promise<ToolList[]> {
  try {
    const q = query(
      collection(db, TOOL_LISTS_COLLECTION),
      where('jobId', '==', jobId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ToolList[];
  } catch (error) {
    console.error('Error fetching tool lists by job:', error);
    return [];
  }
}

export async function getToolListsBySubtask(subtaskId: string): Promise<ToolList[]> {
  try {
    const q = query(
      collection(db, TOOL_LISTS_COLLECTION),
      where('subtaskId', '==', subtaskId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ToolList[];
  } catch (error) {
    console.error('Error fetching tool lists by subtask:', error);
    return [];
  }
}

export async function getToolListsByTask(taskId: string): Promise<ToolList[]> {
  try {
    const q = query(
      collection(db, TOOL_LISTS_COLLECTION),
      where('taskId', '==', taskId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ToolList[];
  } catch (error) {
    console.error('Error fetching tool lists by task:', error);
    return [];
  }
}

export async function updateToolList(id: string, updates: Partial<ToolList>): Promise<void> {
  try {
    const docRef = doc(db, TOOL_LISTS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating tool list:', error);
    throw new Error('Failed to update tool list');
  }
}

// ===== TOOLS =====

export async function createTool(tool: Omit<Tool, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, TOOLS_COLLECTION), tool);
    return docRef.id;
  } catch (error) {
    console.error('Error creating tool:', error);
    throw new Error('Failed to create tool');
  }
}

export async function getTool(id: string): Promise<Tool | null> {
  try {
    const docRef = doc(db, TOOLS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Tool;
    }
    return null;
  } catch (error) {
    console.error('Error fetching tool:', error);
    return null;
  }
}

export async function getAllTools(): Promise<Tool[]> {
  try {
    const q = query(
      collection(db, TOOLS_COLLECTION),
      orderBy('toolNumber', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Tool[];
  } catch (error) {
    console.error('Error fetching all tools:', error);
    return [];
  }
}

export async function updateTool(id: string, updates: Partial<Tool>): Promise<void> {
  try {
    const docRef = doc(db, TOOLS_COLLECTION, id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating tool:', error);
    throw new Error('Failed to update tool');
  }
}

export async function deleteTool(id: string): Promise<void> {
  try {
    const docRef = doc(db, TOOLS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting tool:', error);
    throw new Error('Failed to delete tool');
  }
}

// ===== TEMPLATE WORKFLOWS =====

export async function createTemplateWorkflow(workflow: Omit<TemplateWorkflow, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, TEMPLATE_WORKFLOWS_COLLECTION), workflow);
    return docRef.id;
  } catch (error) {
    console.error('Error creating template workflow:', error);
    throw new Error('Failed to create template workflow');
  }
}

export async function updateTemplateWorkflow(id: string, updates: Partial<TemplateWorkflow>): Promise<void> {
  try {
    const docRef = doc(db, TEMPLATE_WORKFLOWS_COLLECTION, id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating template workflow:', error);
    throw new Error('Failed to update template workflow');
  }
}

// ===== UTILITY FUNCTIONS =====

export async function deleteRoutingSheet(id: string): Promise<void> {
  try {
    const docRef = doc(db, ROUTING_SHEETS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting routing sheet:', error);
    throw new Error('Failed to delete routing sheet');
  }
}

export async function deleteSetupSheet(id: string): Promise<void> {
  try {
    const docRef = doc(db, SETUP_SHEETS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting setup sheet:', error);
    throw new Error('Failed to delete setup sheet');
  }
}

export async function deleteToolList(id: string): Promise<void> {
  try {
    const docRef = doc(db, TOOL_LISTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting tool list:', error);
    throw new Error('Failed to delete tool list');
  }
} 