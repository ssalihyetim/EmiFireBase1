# 🏭 CNC Planning Module - User Guide

## How to Edit Planning in Offers

### 📍 **Access Points**
- **New Offer**: `/en/offers/new` 
- **Edit Offer**: `/en/offers` → Click "Edit" on any offer

---

## 🎯 **Step-by-Step Planning Configuration**

### 1. **Basic Offer Setup**
Fill in the standard offer fields:
- Offer number
- Client name  
- Currency
- VAT rate

### 2. **Add Items with Processes**
In the items table:
- Add part name, materials, costs
- **Select machining processes** from the dropdown:
  - Turning
  - 3-Axis Milling
  - 4-Axis Milling  
  - 5-Axis Milling
  - Grinding
  - Deburring
  - Quality Check

### 3. **Planning Section Appears**
Once processes are selected, a planning section automatically appears below the items table for each item.

---

## ⚙️ **Planning Configuration Options**

### **Setup Time** (minutes)
- Time required to set up the machine
- Includes fixturing, tooling, coordinate setting
- **Default values**:
  - Turning: 30 min
  - 3-Axis Milling: 45 min
  - 5-Axis Milling: 90 min

### **Cycle Time** (minutes per piece)
- Time to machine one piece
- **Default values**:
  - Turning: 5 min/pc
  - 3-Axis Milling: 15 min/pc
  - 5-Axis Milling: 30 min/pc

### **Process Dependencies**
Automatically enforced:
- **5-Axis Milling** requires: Turning, 3-Axis Milling
- **4-Axis Milling** requires: Turning
- **Grinding** requires: Turning, 3-Axis Milling
- **Deburring** requires: All machining operations

---

## 📊 **Real-Time Calculations**

### **Total Time Calculation**
```
Total Time = Setup Time + (Cycle Time × Quantity)
```

### **Cost Estimation**
- Based on machine hourly rates from database
- Automatically calculates cost per process
- Updates in real-time when times change

### **Machine Type Matching**
- **Turning** → Turning machines (NEX110, TNC2000)
- **Milling** → Milling machines (AWEA, Sunmill, Spinner MVC, Quaser)
- **5-Axis** → 5-axis machines (Fanuc Robodrill, Matsuura, Spinner U1520)

---

## 🎛️ **Interface Features**

### **Expand/Collapse**
- Click "Expand" to see detailed planning table
- Click "Collapse" to hide details (summary still visible)

### **Quick Summary**
Always visible:
- Total estimated time
- Total estimated cost  
- Quantity

### **Detailed Planning Table**
When expanded:
- Process order (dependency-based)
- Machine type assignment
- Editable setup/cycle times
- Cost breakdown per process
- Process dependencies visualization

---

## 💡 **Tips for Effective Planning**

### **Process Selection**
1. Start with rough operations (Turning)
2. Add finishing operations (Milling)
3. Include post-processing (Grinding, Deburring)
4. Always end with Quality Check

### **Time Estimation**
- Use conservative estimates for setup times
- Consider part complexity for cycle times
- Account for tool changes in setup time
- Add buffer time for quality checks

### **Cost Optimization**
- Planning automatically selects most cost-effective machines
- Balance setup time vs. cycle time for optimal efficiency
- Consider batch sizes when planning quantities

---

## 🔧 **Machine Utilization**

The planning system considers:
- **Machine capabilities** (turning, milling, 5-axis)
- **Hourly rates** for cost calculation
- **Availability** (only active machines)
- **Process requirements** (special capabilities)

---

## 📈 **Planning Data Usage**

Planning data is used for:
1. **Cost estimation** in offers
2. **Workload planning** across machines
3. **Delivery time** calculation
4. **Resource allocation** optimization
5. **Production scheduling** when offers become orders

---

## ❓ **Troubleshooting**

### **Planning Section Not Appearing?**
- Ensure machining processes are selected for the item
- Check that processes include CNC operations (Turning, Milling)
- Non-machining processes (Procurement, Packaging) don't show planning

### **Cost Calculations Incorrect?**
- Verify machine data is loaded (check `/planning/machines`)
- Ensure machines have hourly rates configured
- Check machine type assignments are correct

### **Process Dependencies Issues?**
- Dependencies are automatically enforced
- Cannot manually override dependency order
- Contact admin if dependency rules need adjustment

---

## 🚀 **Next Steps**

After configuring planning in offers:
1. **Submit offer** to save planning data
2. **Convert to order** when accepted
3. **Use auto-scheduling** to optimize production
4. **Track progress** in real-time production dashboard 