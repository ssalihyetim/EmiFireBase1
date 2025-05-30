# Task Automation System Testing Guide

## Overview

The task automation system has been implemented and is ready for testing. This guide covers different testing approaches to validate the automatic task and subtask generation functionality.

## What's Been Implemented

### ✅ Phase 1 & 2 Complete
- **Data Architecture**: Complete type definitions, task templates, subtask templates
- **Core Logic**: Task generation engine, quality integration, progress tracking
- **17 Task Templates**: 7 compulsory + 10 process-specific
- **35+ Subtask Templates**: All linked to AS9100D quality documents
- **Quality Integration**: AS9100D compliance validation

### 🎯 Key Features
- **Automatic Task Generation**: Jobs automatically create appropriate tasks based on `assignedProcesses`
- **Milling Subtasks**: Setup sheet (FRM-851-001), tool list (FRM-851-005), CAM program (FRM-851-006), first article inspection (FRM-852-001)
- **Dependencies**: Smart workflow sequencing (contract review → planning → production → inspection)
- **Progress Tracking**: Real-time completion percentage calculation
- **Quality Compliance**: Automatic AS9100D validation

## Testing Methods

### 1. 🖥️ Browser-Based Testing (Recommended)

**Start the development server:**
```bash
npm run dev
```

**Navigate to the test page:**
```
http://localhost:3000/test-automation
```

**Features:**
- Interactive test buttons for each test scenario
- Real-time results display
- Sample job data overview
- Visual task/subtask validation

### 2. 📝 Command Line Quick Check

**Run the setup script:**
```bash
node scripts/test-automation.js
```

This will validate that the system is ready and show you how to proceed with browser testing.

### 3. 🧪 Manual Code Testing

You can import and test individual functions in your own scripts:

```typescript
import { generateJobTasks } from '@/lib/task-automation';
import { sampleJobs } from '@/lib/test-automation';

const job = sampleJobs[0]; // Aerospace job with milling
const tasks = generateJobTasks(job);

console.log(`Generated ${tasks.length} tasks for ${job.item.partName}`);
```

## Test Scenarios

### 📋 Test Job Data

The system includes 3 sample jobs for comprehensive testing:

1. **Landing Gear Bracket** (Aerospace Corp)
   - Processes: Turning, 3-Axis Milling, Anodizing
   - Material: Aluminum 7075-T6
   - Expected: 10 tasks (7 compulsory + 3 process-specific)

2. **Turbine Impeller** (Defense Systems)
   - Processes: 5-Axis Milling, Heat Treatment, Grinding
   - Material: Titanium Ti-6Al-4V
   - Expected: 10 tasks with complex 5-axis requirements

3. **Simple Shaft** (Automotive Inc)
   - Processes: Turning only
   - Material: Steel 4140
   - Expected: 8 tasks (7 compulsory + 1 turning)

### 🔧 Milling Validation

The system specifically validates milling requirements as requested:

**For jobs with milling processes, verify:**
- ✅ Setup Sheet subtask (FRM-851-001)
- ✅ Tool List subtask (FRM-851-005)  
- ✅ CAM Program & Revision subtask (FRM-851-006)
- ✅ First Article Inspection subtask (FRM-852-001)

### 📊 Expected Results

**Task Generation Test:**
- Should create 7-10 tasks per job depending on processes
- All compulsory tasks present for every job
- Process-specific tasks only for assigned processes

**Dependency Test:**
- Only "Contract & Drawing Review" can start initially
- Other tasks unlock as dependencies complete
- Final inspection depends on all production tasks

**Quality Compliance Test:**
- All subtasks should have quality template links
- AS9100D clause references present
- Compliance validation should pass

**Progress Calculation Test:**
- 0% initially (all tasks pending)
- Progressive completion as subtasks are marked done
- 100% when all required subtasks completed

## Validation Checklist

### ✅ Basic Functionality
- [ ] Tasks generate automatically for jobs
- [ ] Correct number of tasks created based on processes
- [ ] All compulsory tasks present
- [ ] Process-specific tasks only appear when relevant

### ✅ Milling Requirements
- [ ] 3-axis milling creates required 4 subtasks
- [ ] 5-axis milling includes operator qualification check
- [ ] All milling subtasks have correct quality templates
- [ ] CAM program subtask not printable (as expected)

### ✅ Quality Integration
- [ ] Subtasks link to correct FRM-* documents
- [ ] AS9100D clauses properly assigned
- [ ] Quality validation identifies missing items
- [ ] Special processes have approval requirements

### ✅ Workflow Logic
- [ ] Dependencies prevent tasks starting too early
- [ ] Parallel tasks can run simultaneously
- [ ] Final inspection waits for all production tasks
- [ ] Progress calculation updates correctly

## Troubleshooting

### Common Issues

**"Module not found" errors:**
- Ensure you're running from the project root
- Check that all dependencies are installed: `npm install`

**TypeScript compilation errors:**
- The test page runs in the browser (Next.js handles TypeScript)
- For direct Node.js testing, TypeScript files need compilation

**Missing quality templates:**
- Check that `src/lib/quality-system-data.ts` contains expected documents
- Verify quality template IDs match between subtasks and documents

### Debug Mode

Enable detailed logging by modifying test functions to include more console output:

```typescript
// Add this to any test function for detailed debugging
console.log('DEBUG: Task templates loaded:', getAllTaskTemplates().length);
console.log('DEBUG: Subtask templates loaded:', ALL_SUBTASK_TEMPLATES.length);
```

## Next Steps

After successful testing, the system is ready for:

1. **Phase 3**: UI Development - Create actual task management interface
2. **Firebase Integration**: Connect to Firestore for persistence
3. **User Interface**: Build components for task creation, editing, completion
4. **Real Job Integration**: Connect to existing job management system

## Contact

If you encounter issues or need modifications to the testing setup, please check the implementation in:
- `src/lib/task-automation.ts` - Core automation logic
- `src/lib/test-automation.ts` - Test scenarios and sample data
- `src/app/test-automation/page.tsx` - Browser test interface 