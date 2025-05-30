'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Wrench, Printer, Save, Edit3, Search, Download } from 'lucide-react';
import { ToolList, ToolListEntry, Tool } from '@/types/manufacturing-templates';
import { createToolList, updateToolList, getAllTools, createTool } from '@/lib/firebase-manufacturing';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ToolListFormProps {
  processName: string;
  machineNumber: string;
  subtaskId?: string;
  jobId: string;
  taskId: string;
  initialData?: ToolList;
  onSave?: (toolList: ToolList) => void;
  onPrint?: (toolList: ToolList) => void;
}

export default function ToolListForm({
  processName,
  machineNumber,
  subtaskId,
  jobId,
  taskId,
  initialData,
  onSave,
  onPrint
}: ToolListFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!initialData);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [newToolDialogOpen, setNewToolDialogOpen] = useState(false);
  const [newToolData, setNewToolData] = useState<Partial<Tool>>({
    toolNumber: '',
    toolType: 'end_mill',
    diameter: 0,
    length: 0,
    material: 'Carbide',
    coating: '',
    manufacturer: '',
    partNumber: '',
    description: '',
    location: '',
    condition: 'new',
    notes: ''
  });
  
  // Form state
  const [formData, setFormData] = useState<Partial<ToolList>>({
    processName,
    machineNumber,
    subtaskId,
    jobId,
    taskId,
    programNumber: '',
    setupInstructions: '',
    safetyNotes: '',
    status: 'draft',
    createdBy: 'Current User', // This should come from auth
    ...initialData
  });

  const [toolEntries, setToolEntries] = useState<ToolListEntry[]>(
    initialData?.tools || []
  );

  // Load available tools
  useEffect(() => {
    loadAvailableTools();
  }, []);

  const loadAvailableTools = async () => {
    try {
      const tools = await getAllTools();
      setAvailableTools(tools);
    } catch (error) {
      console.error('Error loading tools:', error);
      toast.error('Failed to load available tools');
    }
  };

  const addTool = () => {
    const newEntry: ToolListEntry = {
      id: `entry-${Date.now()}`,
      toolId: '',
      tool: {} as Tool,
      position: toolEntries.length + 1,
      offsetNumber: '',
      spindleSpeed: 0,
      feedRate: 0,
      depthOfCut: 0,
      operation: '',
      notes: ''
    };
    setToolEntries([...toolEntries, newEntry]);
  };

  const updateToolEntry = (index: number, field: keyof ToolListEntry, value: any) => {
    const updatedEntries = [...toolEntries];
    
    if (field === 'toolId' && value) {
      // Find the selected tool and update the tool object
      const selectedTool = availableTools.find(tool => tool.id === value);
      if (selectedTool) {
        updatedEntries[index] = { 
          ...updatedEntries[index], 
          toolId: value,
          tool: selectedTool
        };
      }
    } else {
      updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    }
    
    setToolEntries(updatedEntries);
  };

  const removeToolEntry = (index: number) => {
    const updatedEntries = toolEntries.filter((_, i) => i !== index);
    // Renumber positions
    updatedEntries.forEach((entry, i) => {
      entry.position = i + 1;
    });
    setToolEntries(updatedEntries);
  };

  const moveToolEntry = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= toolEntries.length) return;

    const updatedEntries = [...toolEntries];
    [updatedEntries[index], updatedEntries[newIndex]] = [updatedEntries[newIndex], updatedEntries[index]];
    
    // Update positions
    updatedEntries.forEach((entry, i) => {
      entry.position = i + 1;
    });
    
    setToolEntries(updatedEntries);
  };

  const handleCreateNewTool = async () => {
    try {
      if (!newToolData.toolNumber || !newToolData.description || !newToolData.material) {
        toast.error('Please fill in required fields: Tool Number, Description, and Material');
        return;
      }

      const toolId = await createTool(newToolData as Omit<Tool, 'id'>);
      
      // Reload available tools to include the new one
      await loadAvailableTools();
      
      // Reset form and close dialog
      setNewToolData({
        toolNumber: '',
        toolType: 'end_mill',
        diameter: 0,
        length: 0,
        material: 'Carbide',
        coating: '',
        manufacturer: '',
        partNumber: '',
        description: '',
        location: '',
        condition: 'new',
        notes: ''
      });
      setNewToolDialogOpen(false);
      
      toast.success('Tool created successfully');
    } catch (error) {
      console.error('Error creating tool:', error);
      toast.error('Failed to create tool');
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const toolListData = {
        ...formData,
        tools: toolEntries,
        totalTools: toolEntries.length
      } as ToolList;

      let savedId = initialData?.id;
      
      if (initialData?.id) {
        // Update existing
        await updateToolList(initialData.id, toolListData);
        toast.success('Tool list updated successfully');
      } else {
        // Create new
        savedId = await createToolList(toolListData);
        toast.success('Tool list created successfully');
      }

      const savedToolList = { ...toolListData, id: savedId! };
      
      setIsEditing(false);
      onSave?.(savedToolList);
    } catch (error) {
      console.error('Error saving tool list:', error);
      toast.error('Failed to save tool list');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (formData.id) {
      const toolList = {
        ...formData,
        tools: toolEntries,
        totalTools: toolEntries.length
      } as ToolList;
      
      onPrint?.(toolList);
      window.print();
    }
  };

  const handleDownload = () => {
    const toolList = {
      ...formData,
      tools: toolEntries,
      totalTools: toolEntries.length
    } as ToolList;

    // Generate downloadable content
    const content = generateToolListContent(toolList);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `tool-list-${toolList.processName || 'document'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Tool list downloaded successfully');
  };

  const generateToolListContent = (toolList: ToolList): string => {
    return `
TOOL LIST - ${toolList.processName || 'N/A'}
${'='.repeat(20 + (toolList.processName?.length || 3))}

SETUP INFORMATION
----------------
Process Name: ${toolList.processName || 'N/A'}
Machine Number: ${toolList.machineNumber || 'N/A'}
Program Number: ${toolList.programNumber || 'N/A'}
Job ID: ${toolList.jobId || 'N/A'}
Task ID: ${toolList.taskId || 'N/A'}
Status: ${toolList.status || 'Draft'}
Total Tools: ${toolList.totalTools || 0}

TOOL LIST
---------
${toolEntries.map(entry => `
Position ${entry.position}: ${entry.tool?.toolNumber || 'N/A'} - ${entry.tool?.description || 'N/A'}
Type: ${entry.tool?.toolType?.replace('_', ' ') || 'N/A'}
Material: ${entry.tool?.material || 'N/A'}
Diameter: ${entry.tool?.diameter || 'N/A'}"
Length: ${entry.tool?.length || 'N/A'}"
Condition: ${entry.tool?.condition || 'N/A'}
Location: ${entry.tool?.location || 'N/A'}
Offset Number: ${entry.offsetNumber || 'N/A'}
Spindle Speed: ${entry.spindleSpeed || 0} RPM
Feed Rate: ${entry.feedRate || 0} IPM
Depth of Cut: ${entry.depthOfCut || 0}"
Operation: ${entry.operation || 'N/A'}
Notes: ${entry.notes || 'N/A'}
`).join('\n')}

SETUP INSTRUCTIONS
------------------
${toolList.setupInstructions || 'No setup instructions provided.'}

SAFETY NOTES
------------
${toolList.safetyNotes || 'No safety notes provided.'}

APPROVAL INFORMATION
-------------------
${toolList.status === 'approved' ? `
Approved By: ${toolList.approvedBy || 'N/A'}
Approved At: ${toolList.approvedAt || 'N/A'}
` : 'Document not yet approved.'}

Generated: ${new Date().toLocaleString()}
Document ID: ${toolList.id || 'Draft'}
Created By: ${toolList.createdBy || 'N/A'}
`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'in_use': return 'secondary';
      default: return 'outline';
    }
  };

  const getToolTypeColor = (toolType: string) => {
    switch (toolType) {
      case 'end_mill': return 'bg-blue-100 text-blue-800';
      case 'drill': return 'bg-green-100 text-green-800';
      case 'tap': return 'bg-purple-100 text-purple-800';
      case 'insert': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Tool List - {processName}
          </CardTitle>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </>
            ) : (
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="processName">Process Name</Label>
              <Input
                id="processName"
                value={formData.processName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, processName: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="machineNumber">Machine Number</Label>
              <Input
                id="machineNumber"
                value={formData.machineNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, machineNumber: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="programNumber">Program Number</Label>
              <Input
                id="programNumber"
                value={formData.programNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, programNumber: e.target.value }))}
                disabled={!isEditing}
                placeholder="e.g., O1234"
              />
            </div>
            <div>
              <Label>Status</Label>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(formData.status || 'draft')}>
                  {formData.status}
                </Badge>
                {isEditing && (
                  <Select 
                    value={formData.status || 'draft'} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="in_use">In Use</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Total Tools</Label>
              <div className="text-2xl font-bold">{toolEntries.length}</div>
            </div>
            <div>
              <Label>Available Tools Database</Label>
              <div className="text-2xl font-bold">{availableTools.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tool Entries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tools</CardTitle>
          {isEditing && (
            <div className="flex gap-2">
              <Dialog open={newToolDialogOpen} onOpenChange={setNewToolDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Tool
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Tool</DialogTitle>
                    <DialogDescription>
                      Add a new tool to the database
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newToolNumber">Tool Number *</Label>
                        <Input
                          id="newToolNumber"
                          value={newToolData.toolNumber || ''}
                          onChange={(e) => setNewToolData(prev => ({ ...prev, toolNumber: e.target.value }))}
                          placeholder="e.g., T001, EM-1/2-4F"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newToolType">Tool Type *</Label>
                        <Select 
                          value={newToolData.toolType || 'end_mill'} 
                          onValueChange={(value) => setNewToolData(prev => ({ ...prev, toolType: value as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="end_mill">End Mill</SelectItem>
                            <SelectItem value="drill">Drill</SelectItem>
                            <SelectItem value="tap">Tap</SelectItem>
                            <SelectItem value="reamer">Reamer</SelectItem>
                            <SelectItem value="boring_bar">Boring Bar</SelectItem>
                            <SelectItem value="insert">Insert</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="newDiameter">Diameter (inches)</Label>
                        <Input
                          id="newDiameter"
                          type="number"
                          step="0.001"
                          value={newToolData.diameter || 0}
                          onChange={(e) => setNewToolData(prev => ({ ...prev, diameter: parseFloat(e.target.value) }))}
                          placeholder="0.500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newLength">Length (inches)</Label>
                        <Input
                          id="newLength"
                          type="number"
                          step="0.001"
                          value={newToolData.length || 0}
                          onChange={(e) => setNewToolData(prev => ({ ...prev, length: parseFloat(e.target.value) }))}
                          placeholder="2.000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCondition">Condition</Label>
                        <Select 
                          value={newToolData.condition || 'new'} 
                          onValueChange={(value) => setNewToolData(prev => ({ ...prev, condition: value as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="worn">Worn</SelectItem>
                            <SelectItem value="damaged">Damaged</SelectItem>
                            <SelectItem value="retired">Retired</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newMaterial">Material *</Label>
                        <Input
                          id="newMaterial"
                          value={newToolData.material || ''}
                          onChange={(e) => setNewToolData(prev => ({ ...prev, material: e.target.value }))}
                          placeholder="e.g., HSS, Carbide, Cobalt"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCoating">Coating</Label>
                        <Input
                          id="newCoating"
                          value={newToolData.coating || ''}
                          onChange={(e) => setNewToolData(prev => ({ ...prev, coating: e.target.value }))}
                          placeholder="e.g., TiN, TiAlN, None"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newManufacturer">Manufacturer</Label>
                        <Input
                          id="newManufacturer"
                          value={newToolData.manufacturer || ''}
                          onChange={(e) => setNewToolData(prev => ({ ...prev, manufacturer: e.target.value }))}
                          placeholder="e.g., Sandvik, Kennametal"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newPartNumber">Part Number</Label>
                        <Input
                          id="newPartNumber"
                          value={newToolData.partNumber || ''}
                          onChange={(e) => setNewToolData(prev => ({ ...prev, partNumber: e.target.value }))}
                          placeholder="Manufacturer part number"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="newDescription">Description *</Label>
                      <Input
                        id="newDescription"
                        value={newToolData.description || ''}
                        onChange={(e) => setNewToolData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="e.g., 1/2 inch 4-Flute End Mill"
                      />
                    </div>

                    <div>
                      <Label htmlFor="newLocation">Location</Label>
                      <Input
                        id="newLocation"
                        value={newToolData.location || ''}
                        onChange={(e) => setNewToolData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="e.g., Tool Crib A-15"
                      />
                    </div>

                    <div>
                      <Label htmlFor="newNotes">Notes</Label>
                      <Textarea
                        id="newNotes"
                        value={newToolData.notes || ''}
                        onChange={(e) => setNewToolData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        placeholder="Any additional notes..."
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setNewToolDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleCreateNewTool}>
                        Create Tool
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button onClick={addTool} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Tool
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {toolEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tools added yet. Click "Add Tool" to start.
            </div>
          ) : (
            <div className="space-y-4">
              {toolEntries.map((entry, index) => (
                <Card key={entry.id} className="relative">
                  <CardContent className="pt-4">
                    {isEditing && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveToolEntry(index, 'up')}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveToolEntry(index, 'down')}
                          disabled={index === toolEntries.length - 1}
                        >
                          ↓
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeToolEntry(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div>
                        <Label>Position</Label>
                        <Input
                          value={entry.position}
                          disabled
                          className="font-mono text-center"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Tool</Label>
                        {isEditing ? (
                          <Select 
                            value={entry.toolId} 
                            onValueChange={(value) => updateToolEntry(index, 'toolId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a tool" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTools.map((tool) => (
                                <SelectItem key={tool.id} value={tool.id}>
                                  <div className="flex items-center gap-2">
                                    <Badge className={getToolTypeColor(tool.toolType)}>
                                      {tool.toolType.replace('_', ' ')}
                                    </Badge>
                                    {tool.toolNumber} - {tool.description}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2 p-2 border rounded">
                            {entry.tool?.toolType && (
                              <Badge className={getToolTypeColor(entry.tool.toolType)}>
                                {entry.tool.toolType.replace('_', ' ')}
                              </Badge>
                            )}
                            <span>{entry.tool?.toolNumber} - {entry.tool?.description}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <Label>Offset #</Label>
                        <Input
                          value={entry.offsetNumber || ''}
                          onChange={(e) => updateToolEntry(index, 'offsetNumber', e.target.value)}
                          disabled={!isEditing}
                          placeholder="H01, D01"
                        />
                      </div>
                      <div>
                        <Label>Spindle (RPM)</Label>
                        <Input
                          type="number"
                          value={entry.spindleSpeed || 0}
                          onChange={(e) => updateToolEntry(index, 'spindleSpeed', parseFloat(e.target.value))}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>Feed (IPM)</Label>
                        <Input
                          type="number"
                          value={entry.feedRate || 0}
                          onChange={(e) => updateToolEntry(index, 'feedRate', parseFloat(e.target.value))}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <Label>Depth of Cut</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={entry.depthOfCut || 0}
                          onChange={(e) => updateToolEntry(index, 'depthOfCut', parseFloat(e.target.value))}
                          disabled={!isEditing}
                          placeholder="in inches"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Operation</Label>
                        <Input
                          value={entry.operation}
                          onChange={(e) => updateToolEntry(index, 'operation', e.target.value)}
                          disabled={!isEditing}
                          placeholder="e.g., Face mill top surface"
                        />
                      </div>
                    </div>

                    {/* Tool Details */}
                    {entry.tool?.id && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <Label className="text-sm font-semibold">Tool Details</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                          <div>
                            <span className="font-medium">Material:</span> {entry.tool.material}
                          </div>
                          {entry.tool.diameter && (
                            <div>
                              <span className="font-medium">Diameter:</span> {entry.tool.diameter}"
                            </div>
                          )}
                          {entry.tool.length && (
                            <div>
                              <span className="font-medium">Length:</span> {entry.tool.length}"
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Condition:</span> 
                            <Badge variant={entry.tool.condition === 'good' ? 'default' : 'secondary'} className="ml-1 text-xs">
                              {entry.tool.condition}
                            </Badge>
                          </div>
                        </div>
                        {entry.tool.location && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Location:</span> {entry.tool.location}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4">
                      <Label>Notes</Label>
                      <Textarea
                        value={entry.notes || ''}
                        onChange={(e) => updateToolEntry(index, 'notes', e.target.value)}
                        disabled={!isEditing}
                        rows={2}
                        placeholder="Any specific notes for this tool..."
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.setupInstructions || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, setupInstructions: e.target.value }))}
            disabled={!isEditing}
            rows={4}
            placeholder="Step-by-step setup instructions for this tool list..."
          />
        </CardContent>
      </Card>

      {/* Safety Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Safety Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.safetyNotes || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, safetyNotes: e.target.value }))}
            disabled={!isEditing}
            rows={3}
            placeholder="Important safety considerations for this tool setup..."
          />
        </CardContent>
      </Card>

      {/* Approval Section */}
      {formData.status === 'approved' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-green-500" />
              Approval Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="approvedBy">Approved By</Label>
              <Input
                id="approvedBy"
                value={formData.approvedBy || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, approvedBy: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="approvedAt">Approved At</Label>
              <Input
                id="approvedAt"
                type="datetime-local"
                value={formData.approvedAt || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, approvedAt: e.target.value }))}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 