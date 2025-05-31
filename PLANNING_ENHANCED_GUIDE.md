# Enhanced Production Planning System

## 🚀 **New Features Implemented**

### **Multiple Process Instances**
- Add multiple setups of the same operation type (Turning 1, Turning 2, Milling 1, Milling 2, etc.)
- Each instance has independent setup and cycle times
- Duplicate operations with custom times for complex parts

### **Manual Process Ordering**
- Full control over operation sequence
- Up/down arrows to reorder operations
- Custom dependencies (e.g., Turning 1 → Milling 1 → Turning 2 → 5-axis → Milling 2)
- Real-time cost and time calculations

### **Enhanced UI Features**
- ✅ **Add Operation Buttons** - Quick access to add more instances
- ✅ **Duplicate Function** - Copy existing operations with all settings
- ✅ **Remove Operations** - Delete unwanted process instances
- ✅ **Manual Reordering** - Up/down arrows for sequence control
- ✅ **Instance Numbering** - Automatic numbering (Turning 1, Turning 2, etc.)

## 📋 **How to Use**

### **1. Access Enhanced Planning**
1. Go to `/offers/new` or edit an existing offer
2. Add an item and select machining processes
3. The Enhanced Planning section appears automatically

### **2. Adding Multiple Process Instances**

#### **Basic Usage:**
- Select "Turning" in the main process selector
- Expand the planning section
- Click "+ Turning" to add additional turning operations
- Each instance gets automatic numbering: "Turning 1", "Turning 2", etc.

#### **Example Workflow:**
```
1. Select "Turning" and "3-Axis Milling" in main selector
2. Expand planning section
3. Click "+ Turning" to add "Turning 2"
4. Click "+ 3-Axis Milling" to add "3-Axis Milling 2"
5. Use up/down arrows to reorder as needed
```

### **3. Manual Process Ordering**

#### **Reordering Operations:**
- Use ↑ and ↓ arrows in the "Order" column
- Operations update automatically with new sequence numbers
- Real-time cost recalculation based on new order

#### **Example Sequences:**
- **Simple:** Turning 1 → 3-Axis Milling 1 → 5-Axis Milling 1
- **Complex:** Turning 1 → 3-Axis Milling 1 → Turning 2 → 5-Axis Milling 1 → 3-Axis Milling 2

### **4. Process Instance Management**

#### **Duplicate Operations:**
- Click the 📋 (copy) icon to duplicate an operation
- Maintains all settings (setup time, cycle time, etc.)
- Auto-increments instance number

#### **Remove Operations:**
- Click the 🗑️ (trash) icon to remove unwanted operations
- Order numbers automatically adjust

#### **Edit Time Settings:**
- Modify setup time (minutes) for each instance
- Adjust cycle time (minutes per piece) individually
- Real-time total time and cost calculations

## 🔧 **Technical Features**

### **Process Instance Structure**
```typescript
interface ProcessInstance {
  id: string;                    // Unique identifier
  baseProcessName: string;       // e.g., "Turning"
  instanceNumber: number;        // 1, 2, 3, etc.
  displayName: string;          // "Turning 1", "Turning 2"
  machineType: MachineType;     // turning, milling, 5-axis
  setupTimeMinutes: number;     // Setup time for this instance
  cycleTimeMinutes: number;     // Cycle time per piece
  orderIndex: number;           // Manual ordering (1, 2, 3...)
  estimatedCost: number;        // Calculated cost
}
```

### **Automatic Calculations**
- **Total Time:** Setup + (Cycle × Quantity) for each instance
- **Cost Estimation:** Based on machine hourly rates and total time
- **Order Management:** Automatic reindexing when operations are moved

### **Machine Type Integration**
- **Turning Machines:** NEX110, TNC2000
- **Milling Machines:** AWEA, Sunmill, Spinner MVC, Quaser MV154
- **5-Axis Machines:** Fanuc Robodrill, Matsuura, Spinner U1520

## 📊 **Real-World Examples**

### **Example 1: Complex Automotive Part**
```
Order | Operation          | Setup | Cycle | Machine Type
------|-------------------|-------|-------|-------------
1     | Turning 1         | 30min | 5min  | turning
2     | 3-Axis Milling 1  | 45min | 15min | milling
3     | Turning 2         | 25min | 8min  | turning
4     | 5-Axis Milling 1  | 90min | 30min | 5-axis
5     | 3-Axis Milling 2  | 40min | 12min | milling
```

### **Example 2: Aerospace Component**
```
Order | Operation          | Setup | Cycle | Machine Type
------|-------------------|-------|-------|-------------
1     | Turning 1         | 45min | 8min  | turning
2     | 5-Axis Milling 1  | 120min| 45min | 5-axis
3     | Grinding 1        | 25min | 8min  | milling
4     | 5-Axis Milling 2  | 60min | 25min | 5-axis
```

## 🎯 **Benefits**

### **For Production Planning:**
- ✅ Realistic operation sequences
- ✅ Multiple setups for complex parts
- ✅ Accurate time and cost estimation
- ✅ Flexible dependency management

### **For Quote Accuracy:**
- ✅ Detailed operation breakdown
- ✅ Machine-specific cost calculations
- ✅ Real-time pricing updates
- ✅ Professional planning documentation

### **For Workflow Management:**
- ✅ Clear operation sequence
- ✅ Setup-specific planning
- ✅ Easy reordering and adjustments
- ✅ Integration with existing offer system

## 🔄 **Integration Status**

### **Completed Features:**
- ✅ Multiple process instances
- ✅ Manual ordering with up/down arrows
- ✅ Duplicate and remove operations
- ✅ Real-time cost calculations
- ✅ Integration with offer form
- ✅ Machine type compatibility
- ✅ Instance numbering system

### **Next Steps (Future Enhancements):**
- 🔄 **Auto-scheduling Algorithm** (Step 2 in roadmap)
- 🔄 **Machine Assignment** (specific machine selection)
- 🔄 **Dependency Validation** (ensure logical sequences)
- 🔄 **Gantt Chart Visualization** (timeline view)
- 🔄 **Real-time Planning Dashboard** (capacity monitoring)

## 📁 **Files Modified**

### **Core Components:**
- `src/components/offers/enhanced-planning-section.tsx` - New enhanced component
- `src/components/offers/offer-form.tsx` - Updated to use enhanced planning
- `src/types/planning.ts` - Added ProcessInstance interface

### **Key Features Files:**
- Multiple instance management
- Manual ordering system
- Process duplication and removal
- Real-time calculations and UI updates

---

**Status:** ✅ **Enhanced Planning System Fully Implemented**  
**Ready for:** Production use in offer creation and editing workflows 