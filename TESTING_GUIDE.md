# 🧪 **Archival Task Strategy - Testing Guide**

## **📋 Overview**

This guide shows you how to test all the implemented archival task strategy features, including task tracking, job archival, pattern management, and manufacturing lots.

---

## **🚀 Quick Start Testing**

### **1. Access the Pattern Library Interface**
```bash
# Navigate to the patterns page
http://localhost:3000/en/patterns
```

**What you'll see:**
- Interactive pattern browser
- Search and filtering capabilities
- Pattern performance metrics
- Mock patterns with realistic data

### **2. Test Basic API Endpoints**
```bash
# Open your browser developer tools or use a tool like Postman/curl
```

---

## **🔧 Component-by-Component Testing**

### **✅ 1. Task Tracking System**

#### **Test Real-time Task Performance**
```typescript
// File: src/lib/task-tracking.ts
// Test starting task tracking

// 1. Start tracking a task
const taskId = "test_task_001";
const jobId = "test_job_001";

// API call to start tracking
fetch('/api/tasks/tracking/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskId,
    jobId,
    assignedOperator: "Test Operator",
    estimatedDurationHours: 4
  })
});
```

#### **Expected Results:**
- ✅ Task tracking record created
- ✅ Start time recorded
- ✅ Performance monitoring initiated

### **✅ 2. Job Archival System**

#### **Test Job Archival**
```bash
# Test archiving a completed job
curl -X POST http://localhost:3000/api/archives/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "test_job_001",
    "archiveReason": "Testing archival system",
    "archivedBy": "Test User"
  }'
```

#### **Expected Response:**
```json
{
  "success": true,
  "message": "Job archived successfully",
  "data": {
    "archiveId": "archive_test_job_001_1704067200000",
    "jobId": "test_job_001",
    "metrics": {
      "processingTime": 150,
      "dataSize": 5432,
      "formsArchived": 2,
      "qualityRecords": 1
    }
  }
}
```

#### **Test Archive Search**
```bash
# Search archived jobs
curl "http://localhost:3000/api/archives/jobs?partNumber=Demo%20Part&maxResults=10"
```

#### **Test Archive Statistics**
```bash
# Get archive statistics
curl "http://localhost:3000/api/archives/jobs?stats=true"
```

### **✅ 3. Pattern Management System**

#### **Test Pattern Creation**
```bash
# Create a pattern from a successful job
curl -X POST http://localhost:3000/api/patterns/create \
  -H "Content-Type: application/json" \
  -d '{
    "sourceJobId": "test_job_001",
    "patternName": "Test Landing Gear Bracket",
    "approvedBy": "Quality Manager",
    "qualityLevel": "proven",
    "complianceVerified": true
  }'
```

#### **Expected Response:**
```json
{
  "success": true,
  "message": "Pattern created successfully",
  "data": {
    "patternId": "pattern_test_landing_gear_bracket_1704067200000",
    "patternName": "Test Landing Gear Bracket",
    "sourceJobId": "test_job_001",
    "qualityValidation": {
      "passed": true,
      "score": 85,
      "issues": []
    }
  }
}
```

#### **Test Pattern Search**
```bash
# Search patterns by criteria
curl -X POST http://localhost:3000/api/patterns/search \
  -H "Content-Type: application/json" \
  -d '{
    "searchType": "criteria",
    "criteria": {
      "qualityLevel": ["proven"],
      "minQualityScore": 8
    }
  }'
```

#### **Test Pattern Similarity Search**
```bash
# Find similar patterns
curl -X POST http://localhost:3000/api/patterns/search \
  -H "Content-Type: application/json" \
  -d '{
    "searchType": "similarity",
    "targetData": {
      "partNumber": "LG-BRACKET-001",
      "assignedProcesses": ["Turning", "3-Axis Milling"],
      "quantity": 1
    }
  }'
```

### **✅ 4. Pattern Library UI Testing**

#### **Navigate to Pattern Library**
```bash
# Open in browser
http://localhost:3000/en/patterns
```

#### **Test UI Features:**

1. **Search Functionality**
   - Enter "Landing Gear" in search box
   - Select quality filter "Proven"
   - Select process filter "3-Axis Milling"
   - Verify filtered results

2. **Pattern Details**
   - Click "View Details" on any pattern
   - Check all tabs: Overview, Processes, Performance, Quality
   - Verify data displays correctly

3. **Statistics Cards**
   - Verify total patterns count
   - Check average success rate
   - Validate usage statistics

#### **Expected UI Behavior:**
- ✅ Responsive design works on mobile/desktop
- ✅ Search filters work correctly
- ✅ Pattern cards show performance metrics
- ✅ Detail dialog shows comprehensive information
- ✅ Statistics update in real-time

---

## **🧪 End-to-End Testing Scenarios**

### **Scenario 1: Complete Job Lifecycle**

#### **Step 1: Create a Job with Pattern**
```typescript
// Use enhanced job creation
import { createJobFromPattern } from '@/lib/enhanced-job-creation';

const result = await createJobFromPattern(
  "pattern_landing_gear_bracket_rev_a_1704067200000",
  {
    customJobName: "LG Bracket - Customer ABC",
    quantity: 5,
    priority: "high",
    targetDeliveryDate: "2024-02-15"
  }
);
```

#### **Step 2: Track Task Performance**
```typescript
// Start task tracking
import { startTaskTracking } from '@/lib/task-tracking';

await startTaskTracking({
  taskId: result.tasks[0].id,
  jobId: result.jobId,
  assignedOperator: "John Smith",
  estimatedDurationHours: 6
});
```

#### **Step 3: Complete with Quality Data**
```typescript
// Complete task with quality results
import { completeTaskTracking } from '@/lib/task-tracking';

await completeTaskTracking(
  "tracking_id_here",
  {
    actualDurationHours: 5.5,
    qualityScore: 9.2,
    operatorNotes: ["Excellent surface finish achieved"],
    lessonsLearned: ["New coolant setting improved efficiency"]
  }
);
```

#### **Step 4: Archive the Job**
```typescript
// Archive completed job
import { archiveCompletedJob } from '@/lib/job-archival';

const archiveResult = await archiveCompletedJob(
  jobData,
  tasksData,
  subtasksData,
  "Job completed successfully - high quality",
  "Production Manager"
);
```

#### **Expected Results:**
- ✅ Job created using pattern template
- ✅ Tasks inherit quality parameters
- ✅ Performance tracked in real-time
- ✅ Complete archive created with all data

### **Scenario 2: Pattern Creation from Successful Job**

#### **Step 1: Identify Pattern Candidate**
```typescript
// Check if job can become pattern
import { analyzePatternReadiness } from '@/lib/enhanced-task-automation';

const analysis = await analyzePatternReadiness("completed_job_id");
// Should return: { ready: true, score: 92, issues: [] }
```

#### **Step 2: Create Pattern**
```typescript
// Create pattern from job
import { createJobPattern } from '@/lib/job-patterns';

const patternResult = await createJobPattern(
  jobData,
  tasksData,
  subtasksData,
  {
    patternName: "High-Quality Engine Mount",
    approvedBy: "Quality Engineer",
    qualityLevel: "proven",
    complianceVerified: true
  }
);
```

#### **Step 3: Verify Pattern Quality**
- Pattern should only be created if quality score ≥ 8.0
- All critical control points preserved
- Best practices captured

### **Scenario 3: Manufacturing Lot Creation**

#### **Step 1: Create Manufacturing Lot**
```typescript
// Create lot for batch production
import { createManufacturingLot } from '@/lib/manufacturing-lots';

const lotResult = await createManufacturingLot({
  lotName: "Engine Mounts - Batch Q1-2024",
  patternId: "pattern_engine_mount_precision_1704153600000",
  partNumber: "ENG-MOUNT-003",
  quantity: 25,
  priority: "high",
  requestedBy: "Production Planner",
  targetDeliveryDate: "2024-03-15"
});
```

#### **Step 2: Create Jobs for Lot**
```typescript
// Generate individual jobs for lot
import { createLotJobs } from '@/lib/manufacturing-lots';

const jobsResult = await createLotJobs(lotResult.lotId);
// Should create 25 individual jobs using the same pattern
```

#### **Expected Results:**
- ✅ Lot created with quality inheritance
- ✅ 25 jobs created from same pattern
- ✅ Quality parameters inherited consistently
- ✅ Lot progress tracking initialized

---

## **🔍 Validation Checklist**

### **✅ Data Integrity Tests**

#### **Archive Completeness**
```bash
# Verify archive contains all required data
curl "http://localhost:3000/api/archives/jobs?archiveId=archive_test_job_001_1704067200000"
```

**Check for:**
- ✅ Complete job snapshot
- ✅ All task and subtask data
- ✅ Manufacturing forms preserved
- ✅ Quality results included
- ✅ Performance metrics calculated

#### **Pattern Quality Validation**
```typescript
// Verify pattern creation requirements
const pattern = await getJobPattern("pattern_id_here");

// Validate:
assert(pattern.historicalPerformance.avgQualityScore >= 8.0);
assert(pattern.qualitySignoff.complianceVerified === true);
assert(pattern.frozenProcessData.assignedProcesses.length > 0);
```

### **✅ Performance Tests**

#### **API Response Times**
```bash
# Test pattern search performance
time curl "http://localhost:3000/api/patterns/search?partNumber=LG-BRACKET-001"
# Should complete in < 2 seconds
```

#### **Database Query Efficiency**
```typescript
// Test large dataset handling
const archives = await searchJobArchives({}, 1000);
// Should handle 1000+ records efficiently
```

### **✅ UI/UX Tests**

#### **Pattern Library Interface**
1. **Load Performance**
   - Page loads in < 3 seconds
   - Pattern cards render smoothly
   - Search is responsive

2. **Interactive Features**
   - Filters work correctly
   - Detail dialogs open/close properly
   - Statistics update correctly

3. **Mobile Responsiveness**
   - Test on various screen sizes
   - Touch interactions work
   - Layout adapts properly

---

## **🐛 Common Issues & Troubleshooting**

### **Issue 1: Type Conflicts in Manufacturing Lots**
```bash
# Current known issue - type mismatches
# Workaround: Use mock data for testing until resolved
```

### **Issue 2: Pattern Creation Validation**
```typescript
// If pattern creation fails validation:
// Check quality score >= 8.0
// Verify job is in "Completed" status
// Ensure performance data exists
```

### **Issue 3: Archive Search Empty Results**
```bash
# If no archives found:
# First create some test archives
# Check date range filters
# Verify part number matches exactly
```

---

## **📊 Test Data Examples**

### **Sample Job Data**
```json
{
  "id": "test_job_001",
  "orderNumber": "TEST-001",
  "clientName": "Test Client",
  "item": {
    "partName": "Test Landing Gear Bracket",
    "rawMaterialType": "Aluminum 7075-T6",
    "assignedProcesses": ["Turning", "3-Axis Milling", "Anodizing"]
  },
  "status": "Completed",
  "priority": "normal"
}
```

### **Sample Task Performance**
```json
{
  "taskId": "test_task_001",
  "jobId": "test_job_001",
  "estimatedDuration": 4,
  "actualDuration": 3.8,
  "qualityResult": {
    "score": 9.2,
    "result": "pass"
  },
  "efficiencyRating": 9.0,
  "as9100dCompliance": true
}
```

---

## **🎯 Success Criteria**

### **✅ System is Working If:**
1. **Pattern Library loads** and shows mock patterns
2. **API endpoints return** expected JSON responses
3. **Pattern creation** validates quality requirements
4. **Job archival** preserves complete manufacturing data
5. **Search functionality** filters results correctly
6. **UI components** render without errors

### **✅ Performance Targets:**
- Pattern search: < 2 seconds
- Archive creation: < 5 seconds
- UI page load: < 3 seconds
- API response: < 1 second

### **✅ Quality Targets:**
- Pattern quality threshold: ≥ 8.0/10
- Archive completeness: 100%
- Type safety: No runtime errors
- AS9100D compliance: Fully tracked

---

## **🚀 Next Steps After Testing**

1. **Report Issues**: Document any bugs or type conflicts found
2. **Performance Optimization**: Identify slow queries or UI lag
3. **User Feedback**: Test with actual manufacturing data
4. **Integration Testing**: Test with real Firebase database
5. **Production Readiness**: Validate with larger datasets

---

**Testing Guide Version**: 1.0  
**Last Updated**: Current Implementation  
**Test Coverage**: Phase 1 & 2 Complete, Phase 3 Partial 