'use client';

import { useState, useEffect } from 'react';
import type { JobSubtask } from '@/types/tasks';
import type { Tool, ToolListEntry } from '@/types/tools';
import { getTools } from '@/lib/firebase-tools';

interface ToolListFormProps {
  subtask: JobSubtask;
  existingToolList: ToolListEntry[];
  onSave: (toolList: ToolListEntry[]) => void;
  onClose: () => void;
}

export default function ToolListForm({ subtask, existingToolList, onSave, onClose }: ToolListFormProps) {
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [selectedTools, setSelectedTools] = useState<ToolListEntry[]>(existingToolList);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTools() {
      try {
        const tools = await getTools();
        setAvailableTools(tools);
      } catch (err) {
        setError('Failed to fetch tools from the database.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTools();
  }, []);
  
  const handleAddTool = (toolId: string) => {
    const toolToAdd = availableTools.find(t => t.id === toolId);
    if (toolToAdd && !selectedTools.some(t => t.id === toolId)) {
      // Add tool with default parameters, allowing overrides
      const newToolEntry: ToolListEntry = {
        ...toolToAdd,
        currentLife: 0, // Start with fresh life for this job
      };
      setSelectedTools(prev => [...prev, newToolEntry]);
    }
  };

  const handleRemoveTool = (toolId: string) => {
    setSelectedTools(prev => prev.filter(t => t.id !== toolId));
  };
  
  const handleSave = () => {
    onSave(selectedTools);
    onClose();
  };

  if (isLoading) {
    return <div className="p-6">Loading tools...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-xl max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Manage Tool List</h2>
      <p className="mb-4 text-sm text-gray-600">For Subtask: <span className="font-semibold">{subtask.name}</span></p>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Side: Available Tools */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Available Tools</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto border p-2 rounded-md">
            {availableTools.map(tool => (
              <div key={tool.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                <span>{tool.name}</span>
                <button
                  onClick={() => handleAddTool(tool.id)}
                  disabled={selectedTools.some(t => t.id === tool.id)}
                  className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-300"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Selected Tools for this Job */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Selected Tools for Job</h3>
          <div className="space-y-2 border p-2 rounded-md min-h-[10rem]">
            {selectedTools.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No tools selected.</p>
            ) : (
                selectedTools.map(tool => (
                  <div key={tool.id} className="flex justify-between items-center p-2 bg-blue-50 rounded-md">
                    <span>{tool.name}</span>
                    <button
                      onClick={() => handleRemoveTool(tool.id)}
                      className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
          Cancel
        </button>
        <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">
          Save Tool List
        </button>
      </div>
    </div>
  );
} 