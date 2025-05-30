'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  runAllTests,
  testTaskGeneration,
  testTaskDependencies,
  testQualityCompliance,
  testQualityPackage,
  testProgressCalculation,
  testMillingRequirements,
  sampleJobs
} from '@/lib/test-automation';

export default function TestAutomationPage() {
  const [testResults, setTestResults] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  // Capture console.log output
  const captureConsoleOutput = (testFunction: () => void): string => {
    const originalLog = console.log;
    const originalError = console.error;
    const logs: string[] = [];

    console.log = (...args) => {
      logs.push(args.join(' '));
    };
    
    console.error = (...args) => {
      logs.push('ERROR: ' + args.join(' '));
    };

    try {
      testFunction();
    } catch (error) {
      logs.push('EXCEPTION: ' + String(error));
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }

    return logs.join('\n');
  };

  const runTest = async (testName: string, testFunction: () => void) => {
    setIsRunning(true);
    setTestResults('Running test: ' + testName + '...\n\n');
    
    // Give UI a moment to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const output = captureConsoleOutput(testFunction);
    setTestResults(output);
    setIsRunning(false);
  };

  const testButtons = [
    { name: 'All Tests', fn: runAllTests },
    { name: 'Task Generation', fn: testTaskGeneration },
    { name: 'Task Dependencies', fn: testTaskDependencies },
    { name: 'Quality Compliance', fn: testQualityCompliance },
    { name: 'Quality Package', fn: testQualityPackage },
    { name: 'Progress Calculation', fn: testProgressCalculation },
    { name: 'Milling Requirements', fn: testMillingRequirements },
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Task Automation System Test Suite</h1>
        <p className="text-muted-foreground">
          Test the automatic task and subtask generation system for manufacturing jobs
        </p>
      </div>

      {/* Sample Data Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Test Data Overview</CardTitle>
          <CardDescription>
            Sample jobs used for testing the automation system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {sampleJobs.map((job, index) => (
              <div key={job.id} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">{job.item.partName}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {job.clientName} • {job.orderNumber}
                </p>
                <div className="flex flex-wrap gap-1">
                  {job.item.assignedProcesses?.map(process => (
                    <Badge key={process} variant="secondary" className="text-xs">
                      {process}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm mt-2">
                  Material: {job.item.rawMaterialType}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
          <CardDescription>
            Run individual tests or the complete test suite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            {testButtons.map(test => (
              <Button 
                key={test.name}
                onClick={() => runTest(test.name, test.fn)}
                disabled={isRunning}
                variant={test.name === 'All Tests' ? 'default' : 'outline'}
              >
                {test.name}
              </Button>
            ))}
          </div>
          {isRunning && (
            <div className="mt-4 text-sm text-muted-foreground">
              🔄 Running tests... Please wait.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Output from the automation system tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-96 whitespace-pre-wrap">
              {testResults}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Key Test Areas */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>🧪 What We're Testing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium">Task Generation</h4>
              <p className="text-sm text-muted-foreground">
                Automatic creation of compulsory + process-specific tasks
              </p>
            </div>
            <div>
              <h4 className="font-medium">Milling Subtasks</h4>
              <p className="text-sm text-muted-foreground">
                Setup sheet, tool list, CAM program, first article inspection
              </p>
            </div>
            <div>
              <h4 className="font-medium">AS9100D Compliance</h4>
              <p className="text-sm text-muted-foreground">
                Quality template integration and validation
              </p>
            </div>
            <div>
              <h4 className="font-medium">Workflow Dependencies</h4>
              <p className="text-sm text-muted-foreground">
                Task sequencing and parallel execution
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📊 Expected Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium">7 Compulsory Tasks</h4>
              <p className="text-sm text-muted-foreground">
                Contract review → planning → production → inspection
              </p>
            </div>
            <div>
              <h4 className="font-medium">Process-Specific Tasks</h4>
              <p className="text-sm text-muted-foreground">
                Additional tasks based on assigned manufacturing processes
              </p>
            </div>
            <div>
              <h4 className="font-medium">Quality Integration</h4>
              <p className="text-sm text-muted-foreground">
                Subtasks linked to FRM-* quality documents
              </p>
            </div>
            <div>
              <h4 className="font-medium">Progress Tracking</h4>
              <p className="text-sm text-muted-foreground">
                Real-time completion percentage calculation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 