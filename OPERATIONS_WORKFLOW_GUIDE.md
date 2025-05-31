# Operations Management Demo Guide

## 🎯 **How to Add Turning, Milling, 5-Axis Operations**

### **Step 1: Access Operations Management**
1. Go to **http://localhost:3000/en/jobs**
2. Find any active job in the table
3. Click the **"Operations"** button in the Actions column
4. You'll be taken to the Operations Management page

### **Step 2: Add Manufacturing Operations**

#### **Adding a Turning Operation:**
1. Click **"Add Operation"** button
2. Select **"Turning"** from Operation Type dropdown
3. System auto-fills:
   - Setup Time: 30 minutes
   - Cycle Time: 5 minutes per piece
   - Machine Type: turning
   - Required Capabilities: ["turning"]
4. Optionally customize times and add notes
5. Click **"Add Operation"**

#### **Adding 3-Axis Milling:**
1. Click **"Add Operation"** button  
2. Select **"3-Axis Milling"**
3. System auto-fills:
   - Setup Time: 45 minutes
   - Cycle Time: 15 minutes per piece
   - Machine Type: milling
   - Required Capabilities: ["3-axis-milling"]
4. Click **"Add Operation"**

#### **Adding 5-Axis Milling:**
1. Click **"Add Operation"** button
2. Select **"5-Axis Milling"**
3. System auto-fills:
   - Setup Time: 90 minutes
   - Cycle Time: 30 minutes per piece
   - Machine Type: 5-axis
   - Required Capabilities: ["5-axis-milling", "complex-geometry"]
4. Click **"Add Operation"**

### **Step 3: Schedule Operations**
1. After adding operations, click **"Schedule All"**
2. System calls enhanced auto-scheduler API
3. Operations get assigned to specific machines:
   - **Turning** → NEX110-001 or TNC2000 machines
   - **3-Axis Milling** → AWEA, Quaser, or Sunmill machines  
   - **5-Axis Milling** → Fanuc Robodrill, Matsuura, or Spinner machines
4. View results in **Schedule View** tab

### **Step 4: Next Operations Intelligence**
1. Go to **"Next Operations"** tab
2. System analyzes current operations and suggests:
   - If no operations: "Material Preparation"
   - After Turning: "3-Axis Milling" 
   - After basic milling: "5-Axis Milling"
3. Click **"Add"** on any suggestion to quickly add it

## 📊 **What You'll See**

### **Current Operations Tab**
```
Order | Operation       | Machine Type | Times        | Status     | Assigned Machine | Progress
------|----------------|--------------|--------------|------------|------------------|----------
1     | Turning 1      | turning      | 30m + 5m/pc | Pending    | Not assigned     | 0%
2     | 3-Axis Mill 1  | milling      | 45m + 15m/pc| Pending    | Not assigned     | 0%
3     | 5-Axis Mill 1  | 5-axis       | 90m + 30m/pc| Pending    | Not assigned     | 0%
```

### **After Scheduling**
```
Order | Operation       | Machine Type | Times        | Status     | Assigned Machine | Progress
------|----------------|--------------|--------------|------------|------------------|----------
1     | Turning 1      | turning      | 30m + 5m/pc | Scheduled  | NEX110-001       | 0%
2     | 3-Axis Mill 1  | milling      | 45m + 15m/pc| Scheduled  | AWEA-VM6         | 0%
3     | 5-Axis Mill 1  | 5-axis       | 90m + 30m/pc| Scheduled  | Fanuc Robodrill  | 0%
```

### **Schedule View Tab**
```
Turning 1
├── Machine: NEX110-001
├── Start: Today 8:00 AM  
├── End: Today 8:55 AM
└── Duration: 55 minutes

3-Axis Milling 1  
├── Machine: AWEA-VM6
├── Start: Today 9:15 AM
├── End: Today 11:30 AM
└── Duration: 135 minutes

5-Axis Milling 1
├── Machine: Fanuc Robodrill
├── Start: Today 1:00 PM
├── End: Today 3:30 PM  
└── Duration: 150 minutes
```

## 🤖 **Advanced Features**

### **Smart Suggestions**
The system analyzes your workflow and suggests logical next steps:

- **After adding Turning** → Suggests "3-Axis Milling"
- **After basic operations** → Suggests "5-Axis Milling" for complex geometry
- **Dependencies handled** → Won't suggest operations that can't start yet

### **Enhanced Scheduling**
When you click "Schedule All", the system uses advanced algorithms:

- **Priority Calculation** → Due date urgency (40%), customer priority (30%), dependencies (20%), setup optimization (10%)
- **Machine Matching** → Capability matching (40%), load balancing (30%), setup optimization (20%), efficiency (10%)
- **Dependency Resolution** → Topological sorting, critical path analysis, conflict detection
- **Real-time Assignment** → Considers working hours (8am-5pm), machine availability, maintenance windows

### **Operation Templates Available**
- **Turning** → 30min setup, 5min cycle
- **3-Axis Milling** → 45min setup, 15min cycle
- **4-Axis Milling** → 60min setup, 20min cycle
- **5-Axis Milling** → 90min setup, 30min cycle
- **Grinding** → 25min setup, 8min cycle
- **Deburring** → 15min setup, 3min cycle

## 🎯 **Business Impact**

### **Before**
❌ "How do I add turning operations to this job?"  
❌ "What should I do after turning is complete?"  
❌ "Which machine should handle the 5-axis work?"  
❌ "When can we start the milling operations?"  

### **After** 
✅ **Clear Interface** → "Add Operation" with dropdown selection  
✅ **Smart Guidance** → "Next Operations" tab with AI suggestions  
✅ **Automatic Assignment** → "Schedule All" assigns optimal machines  
✅ **Real-time Visibility** → Schedule view shows exact timing and machines  

## 🔗 **Integration Points**

This connects seamlessly with:
- **21 CNC Machines** → Real machine database with capabilities
- **Enhanced Scheduling** → Phase 2 algorithms with multi-objective optimization
- **Task Management** → Links to shop floor execution
- **Job Management** → Operations button on every job

You now have a **complete manufacturing workflow** from job creation to machine assignment! 