# Order-Based Jobs Workflow

## Overview

The job management system has been completely redesigned to be **order-based** instead of automatically generating jobs from orders. This provides better control over job creation and ensures proper due date management.

## 🔄 Workflow Changes

### Previous Workflow
- Jobs were automatically created from order items
- No due date selection
- Manual task generation required

### New Workflow
1. **Orders exist** in the system
2. **Select order items** to convert to jobs
3. **Set due dates** for each job
4. **Tasks are automatically generated** upon job creation
5. **Manufacturing forms** (Routing Sheets, Setup Sheets, Tool Lists) are ready immediately

## 🏗️ Implementation Details

### New Components

#### 1. OrderToJobConverter Component
- **Location**: `src/components/jobs/OrderToJobConverter.tsx`
- **Purpose**: Convert order items to jobs with due date selection
- **Features**:
  - Visual order item selection
  - Due date picker with business day suggestions
  - Priority setting (normal, urgent, critical)
  - Schedule estimation and validation
  - Batch job creation

#### 2. Firebase Jobs Module
- **Location**: `src/lib/firebase-jobs.ts`
- **Purpose**: CRUD operations for jobs collection
- **Functions**:
  - `saveJob()` - Create/update jobs
  - `loadAllJobs()` - Load all jobs
  - `deleteJob()` - Remove jobs
  - `getJobsByOrder()` - Query jobs by order

#### 3. Database Cleanup Script
- **Location**: `scripts/cleanup-jobs-database.ts`
- **Purpose**: Clean slate for new workflow
- **Usage**:
  ```bash
  CONFIRM_CLEANUP=YES_DELETE_ALL_JOBS npm run cleanup-jobs
  ```

### Updated Types

#### Job Interface
```typescript
interface Job {
  id: string;
  orderId: string;
  orderNumber: string;
  clientName: string;
  item: OfferItem;
  status: JobStatus;
  dueDate?: string; // ISO date string (YYYY-MM-DD)
  priority?: 'normal' | 'urgent' | 'critical';
  specialInstructions?: string;
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}
```

## 🚀 Getting Started

### 1. Clean Existing Jobs (Optional)
```bash
# Warning: This deletes ALL job data
CONFIRM_CLEANUP=YES_DELETE_ALL_JOBS npm run cleanup-jobs
```

### 2. Create Jobs from Orders
1. Navigate to **Jobs** page
2. Click **"Create Jobs from Orders"**
3. Select order items to convert
4. Set due dates for each job
5. Set priority levels
6. Click **"Create Jobs"**

### 3. Automatic Task Generation
Upon job creation, the system automatically generates:
- ✅ **Contract Review** tasks
- ✅ **Material Approval** tasks (with traceability)
- ✅ **Lot-Based Production Planning** tasks (4 subtasks)
- ✅ **Manufacturing Process** tasks (5 subtasks each including FAI)
- ✅ **Final Inspection** tasks
- ✅ **Packaging & Shipping** tasks

### 4. Manufacturing Forms Ready
Each manufacturing process gets:
- 📋 **Routing Sheet** (Shop Traveler)
- ⚙️ **Setup Sheet** (per subtask)
- 🔧 **Tool List** (per process)
- ✅ **FAI Report** (First Article Inspection)

## 📊 Benefits

### 1. Better Planning
- **Due date management**: Set realistic delivery dates
- **Priority control**: Critical, urgent, or normal priority
- **Schedule validation**: Early warning for tight schedules

### 2. Automatic Task Generation
- **No manual work**: Tasks created instantly
- **Consistent structure**: Every job follows AS9100D compliance
- **Manufacturing ready**: All forms generated automatically

### 3. Enhanced Traceability
- **Lot numbers**: Automatic generation for material tracking
- **FAI integration**: First Article Inspection for every process
- **Complete documentation**: Full paper trail from order to delivery

### 4. Manufacturing Integration
- **Routing Sheets**: Complete shop travelers with lot tracking
- **Setup Sheets**: Detailed setup instructions per operation
- **Tool Lists**: Comprehensive tooling requirements
- **Quality Checkpoints**: Built-in quality control steps

## 🔧 Technical Features

### Database Structure
- **Jobs Collection**: Separate from orders
- **JobTasks Collection**: Task management
- **JobSubtasks Collection**: Detailed subtask tracking
- **Manufacturing Forms**: Routing sheets, setup sheets, tool lists

### Task Automation
- **5 Standard Manufacturing Subtasks**:
  1. Setup Sheet
  2. Tool List
  3. Tool Life Verification
  4. Machining (schedulable)
  5. FAI (First Article Inspection)

### Integration Points
- **Orders System**: Source of job creation
- **Scheduling System**: Manufacturing process scheduling
- **Quality System**: FAI and traceability requirements
- **Manufacturing Forms**: Pre-populated templates

## 📋 Manufacturing Forms

### Routing Sheet (Shop Traveler)
- **Purpose**: Complete job tracking document
- **Features**:
  - Part information and specifications
  - Raw material lot tracking
  - Operation sequence with timing
  - Quality checkpoints
  - Operator signatures

### Setup Sheet
- **Purpose**: Detailed setup instructions
- **Features**:
  - Machine-specific setup parameters
  - Tool positioning and offsets
  - Safety requirements
  - Quality specifications

### Tool List
- **Purpose**: Required tooling inventory
- **Features**:
  - Complete tool specifications
  - Tool life tracking
  - Replacement schedules
  - Cost tracking

## 🎯 Next Steps

1. **Test the workflow** with sample orders
2. **Verify form generation** for different process types
3. **Integrate with scheduling** for manufacturing processes
4. **Setup quality workflows** for FAI reports
5. **Train operators** on new forms and procedures

## ⚠️ Important Notes

- **One-way conversion**: Order items become jobs permanently
- **Due dates required**: Cannot create jobs without due dates
- **Task generation**: Happens automatically, no manual intervention
- **Manufacturing ready**: All forms pre-populated and ready to use

## 🔗 Related Documentation

- [Task Automation Updates](./TASK_AUTOMATION_UPDATES.md)
- [Manufacturing Forms Guide](./src/components/manufacturing/README.md)
- [Scheduling Integration](./src/lib/scheduling/README.md)

---

This new workflow provides a comprehensive, order-based approach to job management with automatic task generation and full manufacturing form preparation. 