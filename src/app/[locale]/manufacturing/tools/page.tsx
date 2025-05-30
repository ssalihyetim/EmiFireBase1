'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Edit3, Trash2, Wrench, Package, AlertTriangle } from 'lucide-react';
import { Tool } from '@/types/manufacturing-templates';
import { getAllTools, createTool, updateTool, deleteTool } from '@/lib/firebase-manufacturing';
import { toast } from 'sonner';

export default function ToolsManagementPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Tool>>({
    toolNumber: '',
    toolType: 'end_mill',
    diameter: 0,
    length: 0,
    material: '',
    coating: '',
    manufacturer: '',
    partNumber: '',
    description: '',
    location: '',
    condition: 'good',
    notes: ''
  });

  useEffect(() => {
    loadTools();
  }, []);

  useEffect(() => {
    filterTools();
  }, [tools, searchTerm, filterType, filterCondition]);

  const loadTools = async () => {
    setIsLoading(true);
    try {
      const loadedTools = await getAllTools();
      setTools(loadedTools);
    } catch (error) {
      console.error('Error loading tools:', error);
      toast.error('Failed to load tools');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTools = () => {
    let filtered = [...tools];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tool => 
        tool.toolNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.partNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(tool => tool.toolType === filterType);
    }

    // Condition filter
    if (filterCondition !== 'all') {
      filtered = filtered.filter(tool => tool.condition === filterCondition);
    }

    setFilteredTools(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTool) {
        // Update existing tool
        await updateTool(editingTool.id, formData);
        toast.success('Tool updated successfully');
      } else {
        // Create new tool
        await createTool(formData as Omit<Tool, 'id'>);
        toast.success('Tool created successfully');
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadTools();
    } catch (error) {
      console.error('Error saving tool:', error);
      toast.error('Failed to save tool');
    }
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    setFormData({ ...tool });
    setIsDialogOpen(true);
  };

  const handleDelete = async (tool: Tool) => {
    if (confirm(`Are you sure you want to delete tool ${tool.toolNumber}?`)) {
      try {
        await deleteTool(tool.id);
        toast.success('Tool deleted successfully');
        loadTools();
      } catch (error) {
        console.error('Error deleting tool:', error);
        toast.error('Failed to delete tool');
      }
    }
  };

  const resetForm = () => {
    setEditingTool(null);
    setFormData({
      toolNumber: '',
      toolType: 'end_mill',
      diameter: 0,
      length: 0,
      material: '',
      coating: '',
      manufacturer: '',
      partNumber: '',
      description: '',
      location: '',
      condition: 'good',
      notes: ''
    });
  };

  const getToolTypeColor = (toolType: string) => {
    switch (toolType) {
      case 'end_mill': return 'bg-blue-100 text-blue-800';
      case 'drill': return 'bg-green-100 text-green-800';
      case 'tap': return 'bg-purple-100 text-purple-800';
      case 'reamer': return 'bg-yellow-100 text-yellow-800';
      case 'boring_bar': return 'bg-red-100 text-red-800';
      case 'insert': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'worn': return 'bg-yellow-100 text-yellow-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      case 'retired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'new': return '🆕';
      case 'good': return '✅';
      case 'worn': return '⚠️';
      case 'damaged': return '❌';
      case 'retired': return '🚫';
      default: return '❓';
    }
  };

  const toolTypeOptions = [
    { value: 'end_mill', label: 'End Mill' },
    { value: 'drill', label: 'Drill' },
    { value: 'tap', label: 'Tap' },
    { value: 'reamer', label: 'Reamer' },
    { value: 'boring_bar', label: 'Boring Bar' },
    { value: 'insert', label: 'Insert' },
    { value: 'other', label: 'Other' }
  ];

  const conditionOptions = [
    { value: 'new', label: 'New' },
    { value: 'good', label: 'Good' },
    { value: 'worn', label: 'Worn' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'retired', label: 'Retired' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading tools database...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            Tools Database
          </h1>
          <p className="text-muted-foreground">
            Manage your manufacturing tools inventory
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tool
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTool ? 'Edit Tool' : 'Add New Tool'}
              </DialogTitle>
              <DialogDescription>
                {editingTool ? 'Update tool information' : 'Add a new tool to the database'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="toolNumber">Tool Number *</Label>
                  <Input
                    id="toolNumber"
                    value={formData.toolNumber || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, toolNumber: e.target.value }))}
                    required
                    placeholder="e.g., T001, EM-1/2-4F"
                  />
                </div>
                <div>
                  <Label htmlFor="toolType">Tool Type *</Label>
                  <Select 
                    value={formData.toolType || 'end_mill'} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, toolType: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {toolTypeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="diameter">Diameter (inches)</Label>
                  <Input
                    id="diameter"
                    type="number"
                    step="0.001"
                    value={formData.diameter || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, diameter: parseFloat(e.target.value) }))}
                    placeholder="0.500"
                  />
                </div>
                <div>
                  <Label htmlFor="length">Length (inches)</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.001"
                    value={formData.length || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, length: parseFloat(e.target.value) }))}
                    placeholder="2.000"
                  />
                </div>
                <div>
                  <Label htmlFor="condition">Condition</Label>
                  <Select 
                    value={formData.condition || 'good'} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="material">Material *</Label>
                  <Input
                    id="material"
                    value={formData.material || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                    required
                    placeholder="e.g., HSS, Carbide, Cobalt"
                  />
                </div>
                <div>
                  <Label htmlFor="coating">Coating</Label>
                  <Input
                    id="coating"
                    value={formData.coating || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, coating: e.target.value }))}
                    placeholder="e.g., TiN, TiAlN, None"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                    placeholder="e.g., Sandvik, Kennametal, Harvey"
                  />
                </div>
                <div>
                  <Label htmlFor="partNumber">Part Number</Label>
                  <Input
                    id="partNumber"
                    value={formData.partNumber || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, partNumber: e.target.value }))}
                    placeholder="Manufacturer part number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  placeholder="e.g., 1/2 inch 4-Flute End Mill"
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Tool Crib A-15, Machine M001"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Any additional notes about this tool..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTool ? 'Update' : 'Create'} Tool
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search tools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filterType">Tool Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {toolTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filterCondition">Condition</Label>
              <Select value={filterCondition} onValueChange={setFilterCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conditions</SelectItem>
                  {conditionOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterCondition('all');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tools</CardTitle>
            <Package className="h-4 w-4 ml-auto" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tools.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Good Condition</CardTitle>
            <Package className="h-4 w-4 ml-auto text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tools.filter(t => t.condition === 'good').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 ml-auto text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tools.filter(t => ['worn', 'damaged'].includes(t.condition)).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
            <Search className="h-4 w-4 ml-auto" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTools.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tools List */}
      <Card>
        <CardHeader>
          <CardTitle>Tools ({filteredTools.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tools found matching your criteria
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTools.map((tool) => (
                <Card key={tool.id} className="relative">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-mono font-bold text-lg">{tool.toolNumber}</div>
                          <Badge className={getToolTypeColor(tool.toolType)}>
                            {tool.toolType.replace('_', ' ')}
                          </Badge>
                          <Badge className={getConditionColor(tool.condition)}>
                            {getConditionIcon(tool.condition)} {tool.condition}
                          </Badge>
                        </div>
                        
                        <div className="text-lg font-medium">{tool.description}</div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Material:</span> {tool.material}
                          </div>
                          {tool.diameter && (
                            <div>
                              <span className="font-medium">Diameter:</span> {`${tool.diameter}"`}
                            </div>
                          )}
                          {tool.length && (
                            <div>
                              <span className="font-medium">Length:</span> {`${tool.length}"`}
                            </div>
                          )}
                          {tool.manufacturer && (
                            <div>
                              <span className="font-medium">Manufacturer:</span> {tool.manufacturer}
                            </div>
                          )}
                        </div>
                        
                        {tool.coating && (
                          <div className="text-sm">
                            <span className="font-medium">Coating:</span> {tool.coating}
                          </div>
                        )}
                        
                        {tool.location && (
                          <div className="text-sm">
                            <span className="font-medium">Location:</span> {tool.location}
                          </div>
                        )}
                        
                        {tool.partNumber && (
                          <div className="text-sm">
                            <span className="font-medium">Part Number:</span> {tool.partNumber}
                          </div>
                        )}
                        
                        {tool.notes && (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Notes:</span> {tool.notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(tool)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(tool)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 