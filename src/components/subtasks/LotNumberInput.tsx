'use client';

import { useState, useEffect } from 'react';
import { generateLotNumber } from '@/lib/lot-number-generator';
import { updateSubtaskInFirestore } from '@/lib/firebase-tasks';
import type { JobSubtask } from '@/types/tasks';

interface LotNumberInputProps {
  subtask: JobSubtask;
  onUpdate: (lotNumber: string) => void;
}

export default function LotNumberInput({ subtask, onUpdate }: LotNumberInputProps) {
  const [lotNumber, setLotNumber] = useState(subtask.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Auto-generate lot number on component mount if none exists
  useEffect(() => {
    if (!hasInitialized && !lotNumber.trim()) {
      setHasInitialized(true);
      generateNewLotNumber();
    } else if (!hasInitialized) {
      setHasInitialized(true);
    }
  }, [hasInitialized, lotNumber]);

  const generateNewLotNumber = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const newLotNumber = await generateLotNumber(
        subtask.jobId,
        subtask.taskId,
        'Raw Material', // Default material type
        subtask.name
      );
      setLotNumber(newLotNumber);
      // Auto-save the generated lot number
      await saveLotNumber(newLotNumber);
    } catch (e) {
      console.error('Failed to generate lot number:', e);
      
      // Generate a fallback lot number if the main generation fails
      const fallbackLotNumber = `RM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      setLotNumber(fallbackLotNumber);
      
      try {
        await saveLotNumber(fallbackLotNumber);
        setError('Generated fallback lot number due to system issue.');
      } catch (saveError) {
        setError('Failed to generate lot number. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const saveLotNumber = async (lotNumberToSave: string) => {
    try {
      // Use the same Firebase function that the main system uses for consistency
      const updatedSubtask: JobSubtask = {
        ...subtask,
        notes: lotNumberToSave,
        status: 'completed',
        updatedAt: new Date().toISOString()
      };
      
      await updateSubtaskInFirestore(updatedSubtask);
      onUpdate(lotNumberToSave);
    } catch (e) {
      console.error('Failed to save lot number:', e);
      throw e;
    }
  };

  const handleSave = async () => {
    if (!lotNumber.trim()) {
      setError('Lot number cannot be empty.');
      return;
    }
    setIsSaving(true);
    setError(null);

    try {
      await saveLotNumber(lotNumber);
    } catch (e) {
      setError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50">
      <label htmlFor="lotNumber" className="text-sm font-medium text-gray-700">
        Lot Number:
      </label>
      <input
        id="lotNumber"
        type="text"
        value={lotNumber}
        readOnly
        placeholder={isGenerating ? "Generating..." : "Auto-generated lot number"}
        className="flex-grow p-1 border border-gray-300 rounded-md shadow-sm bg-gray-100 font-mono text-sm"
      />
      {lotNumber && !isGenerating && (
        <button
          onClick={generateNewLotNumber}
          disabled={isGenerating}
          className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          Regenerate
        </button>
      )}
      {isGenerating && (
        <div className="px-3 py-1 text-xs text-gray-500">
          Generating...
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
} 