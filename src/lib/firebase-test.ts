import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Test Firebase connection by trying to write and read a simple document
 */
export async function testFirebaseConnection(): Promise<{
  success: boolean;
  message: string;
  error?: any;
}> {
  try {
    console.log('Testing Firebase connection...');
    
    // Test collection name
    const testCollection = 'connectionTest';
    
    // Test data
    const testData = {
      timestamp: new Date().toISOString(),
      message: 'Connection test',
      randomId: Math.random().toString(36).substr(2, 9)
    };
    
    // Try to write a document
    console.log('Attempting to write test document...');
    const docRef = await addDoc(collection(db, testCollection), testData);
    console.log('Test document written with ID:', docRef.id);
    
    // Try to read documents from the collection
    console.log('Attempting to read from test collection...');
    const querySnapshot = await getDocs(collection(db, testCollection));
    console.log('Read', querySnapshot.size, 'documents from test collection');
    
    return {
      success: true,
      message: `Firebase connection successful. Written doc ID: ${docRef.id}, Read ${querySnapshot.size} docs.`
    };
    
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return {
      success: false,
      message: 'Firebase connection failed',
      error: error
    };
  }
} 