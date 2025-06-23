"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Target,
  Shield,
  Zap
} from 'lucide-react';
import type { Job, JobTask } from '@/types';

interface PatternCreationDialogProps {
  job: Job;
  tasks: JobTask[];
  isOpen: boolean;
  onClose: () => void;
  onPatternCreated: (patternId: string, patternName: string) => void;
}

interface PatternValidation {
  canBecomePattern: boolean;
  validationScore: number;
  qualityScore: number;
  efficiencyScore: number;
  onTimeCompletion: boolean;
  criticalIssues: number;
  recommendations: string[];
  requirements: {
    qualityScore: { required: number; actual: number; passed: boolean };
    efficiency: { required: number; actual: number; passed: boolean };
    onTime: { required: boolean; actual: boolean; passed: boolean };
    criticalIssues: { required: number; actual: number; passed: boolean };
  };
}

export default function PatternCreationDialog({
  job,
  tasks,
  isOpen,
  onClose,
  onPatternCreated
}: PatternCreationDialogProps) {
  const { toast } = useToast();
  const [patternName, setPatternName] = useState('');
  const [qualityLevel, setQualityLevel] = useState<'proven' | 'experimental' | 'under_review'>('under_review');
  const [approvedBy, setApprovedBy] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [complianceVerified, setComplianceVerified] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [validation, setValidation] = useState<PatternValidation | null>(null);
  const [isLoadingValidation, setIsLoadingValidation] = useState(false);

  // Initialize pattern name from job
  useEffect(() => {
    if (job && !patternName) {
      setPatternName(`${job.item.partName} - Rev A`);
    }
  }, [job, patternName]);

  // Load pattern validation when dialog opens
  useEffect(() => {
    if (isOpen && job) {
      loadPatternValidation();
    }
  }, [isOpen, job]);

  const loadPatternValidation = async () => {
    setIsLoadingValidation(true);
    try {
      const response = await fetch(`/api/patterns/create?jobId=${job.id}`);
      const result = await response.json();
      
      if (result.success) {
        setValidation(result.data);
      } else {
        toast({
          title: "Validation Error",
          description: "Could not validate job for pattern creation",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading pattern validation:', error);
      toast({
        title: "Validation Error",
        description: "Could not validate job for pattern creation",
        variant: "destructive",
      });
    } finally {
      setIsLoadingValidation(false);
    }
  };

  const handleCreatePattern = async () => {
    if (!patternName.trim() || !approvedBy.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide pattern name and approver",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/patterns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceJobId: job.id,
          patternName: patternName.trim(),
          approvedBy: approvedBy.trim(),
          qualityLevel,
          complianceVerified,
          specialNotes: specialNotes.trim(),
          tasks: tasks,
          subtasks: tasks.flatMap(task => task.subtasks || [])
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Pattern Created Successfully",
          description: `Pattern "${patternName}" has been created and is ready for use`,
        });
        
        onPatternCreated(result.data.patternId, patternName);
        onClose();
      } else {
        toast({
          title: "Pattern Creation Failed",
          description: result.error || "Could not create pattern",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating pattern:', error);
      toast({
        title: "Pattern Creation Failed",
        description: "Could not create pattern. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getValidationColor = (passed: boolean) => passed ? 'text-green-600' : 'text-red-600';
  const getValidationIcon = (passed: boolean) => passed ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Create Manufacturing Pattern
          </DialogTitle>
          <DialogDescription>
            This job was completed successfully. Create a reusable manufacturing pattern for future similar jobs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Pattern Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pattern Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="patternName">Pattern Name</Label>
                  <Input
                    id="patternName"
                    value={patternName}
                    onChange={(e) => setPatternName(e.target.value)}
                    placeholder="e.g., Landing Gear Bracket - Rev A"
                  />
                </div>

                <div>
                  <Label htmlFor="qualityLevel">Quality Level</Label>
                  <Select value={qualityLevel} onValueChange={(value: any) => setQualityLevel(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proven">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          Proven (Ready for production)
                        </div>
                      </SelectItem>
                      <SelectItem value="experimental">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-600" />
                          Experimental (Needs validation)
                        </div>
                      </SelectItem>
                      <SelectItem value="under_review">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          Under Review (Quality pending)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="approvedBy">Approved By</Label>
                  <Input
                    id="approvedBy"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    placeholder="Quality Engineer / Supervisor"
                  />
                </div>

                <div>
                  <Label htmlFor="specialNotes">Special Notes (Optional)</Label>
                  <Textarea
                    id="specialNotes"
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    placeholder="Special considerations, critical parameters, etc."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="complianceVerified"
                    checked={complianceVerified}
                    onChange={(e) => setComplianceVerified(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="complianceVerified" className="text-sm">
                    AS9100D compliance verified
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Validation Results */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Pattern Validation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingValidation ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : validation ? (
                  <div className="space-y-4">
                    {/* Overall Score */}
                    <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {validation.validationScore}/100
                      </div>
                      <div className="text-sm text-muted-foreground">Pattern Readiness Score</div>
                      <Badge 
                        variant={validation.canBecomePattern ? "default" : "destructive"}
                        className="mt-2"
                      >
                        {validation.canBecomePattern ? "Ready for Pattern Creation" : "Needs Improvement"}
                      </Badge>
                    </div>

                    {/* Validation Details */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Quality Score</span>
                        <div className={`flex items-center gap-2 ${getValidationColor(validation.requirements.qualityScore.passed)}`}>
                          {getValidationIcon(validation.requirements.qualityScore.passed)}
                          <span className="font-medium">
                            {validation.requirements.qualityScore.actual}/10
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm">Efficiency</span>
                        <div className={`flex items-center gap-2 ${getValidationColor(validation.requirements.efficiency.passed)}`}>
                          {getValidationIcon(validation.requirements.efficiency.passed)}
                          <span className="font-medium">
                            {validation.requirements.efficiency.actual}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm">On-Time Completion</span>
                        <div className={`flex items-center gap-2 ${getValidationColor(validation.requirements.onTime.passed)}`}>
                          {getValidationIcon(validation.requirements.onTime.passed)}
                          <span className="font-medium">
                            {validation.requirements.onTime.actual ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm">Critical Issues</span>
                        <div className={`flex items-center gap-2 ${getValidationColor(validation.requirements.criticalIssues.passed)}`}>
                          {getValidationIcon(validation.requirements.criticalIssues.passed)}
                          <span className="font-medium">
                            {validation.requirements.criticalIssues.actual}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    {validation.recommendations.length > 0 && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <h4 className="font-medium text-amber-800 mb-2">Recommendations:</h4>
                        <ul className="text-sm text-amber-700 space-y-1">
                          {validation.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <TrendingUp className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Could not load validation data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreatePattern} 
            disabled={isCreating || !validation?.canBecomePattern}
            className="min-w-[120px]"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Create Pattern
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 