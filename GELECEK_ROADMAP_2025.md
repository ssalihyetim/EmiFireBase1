# 🚀 **2025 SİSTEM GELİŞTİRME ROADMAP'İ**

## 📋 **YÖNETİCİ ÖZETİ**

**Tarih**: 1.07.2025 Eksikler Listesi Bazlı Roadmap  
**Durum**: Mevcut sistem sağlam temel üzerine kritik eksikliklerin giderilmesi  
**Hedef**: Tam AS9100D uyumlu, QR kodlu, kalite odaklı üretim yönetim sistemi

---

## 🎯 **ÖNCELİK 1: QR KODLU ROUTING SHEET SİSTEMİ**

### **📱 QR Code Tabanlı Unified Task View**

#### **Hedef Özellik**
```
Order to Job → QR Kodlu Routing Sheet Ekranı → QR Tarama → Otomatik Unified Task View Açılır
```

#### **Teknik Uygulama**
- **Konum**: `src/app/[locale]/jobs/[jobId]/qr-routing/page.tsx` (YENİ)
- **QR Kod Oluşturma**: Job ID + Task ID kombinasyonu
- **QR Tarama**: Kamera izni + WebRTC API entegrasyonu
- **Fotoğraf Upload**: Camera API + Firebase Storage
- **FAI Ölçüleri**: Manuel giriş formu entegrasyonu

#### **Geliştirme Adımları**
1. **QR Code Generator Modülü** (`src/lib/qr-code-generator.ts`)
2. **Camera Permission Handler** (`src/components/camera/CameraPermissionHandler.tsx`)
3. **QR Scanner Component** (`src/components/camera/QRCodeScanner.tsx`)
4. **Photo Upload System** (`src/components/shared/PhotoUploader.tsx`)
5. **FAI Measurement Form** (`src/components/forms/FAIMeasurementForm.tsx`)

#### **Entegrasyon Noktaları**
- Mevcut `JobTaskDisplay.tsx` ile entegrasyon
- `manufacturing-forms.ts` ile form data bağlantısı
- `firebase-storage.ts` ile photo upload integration

---

## 🎯 **ÖNCELİK 2: MÜŞTERİ ŞİKAYET ve GERİ BİLDİRİM SİSTEMİ**

### **📞 Customer Complaint Management**

#### **Yeni Modüller**
- **Lokasyon**: `src/app/[locale]/customer-feedback/page.tsx` (YENİ)
- **Şikayet Takibi**: NCR sistemi ile entegrasyon
- **CAPA Süreci**: Düzeltici faaliyetler otomasyonu
- **Müşteri Bildirimleri**: E-mail entegrasyonu

#### **Veri Modeli**
```typescript
interface CustomerComplaint {
  id: string;
  customerId: string;
  jobId: string;
  partName: string;
  complaintType: 'quality' | 'delivery' | 'documentation' | 'other';
  severity: 'minor' | 'major' | 'critical';
  description: string;
  rootCauseAnalysis?: RootCauseAnalysis;
  correctiveActions: CorrectiveAction[];
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  as9100dClause: string[];
}
```

---

## 🎯 **ÖNCELİK 3: CHECKLIST ve ONAY SİSTEMLERİ**

### **✅ Contract Review Checklist System**

#### **Contract Review Tamamlandığında**
```
Contract Review → Job'a Uygun Checklist Oluştur → Manuel Checkbox Kontrolü → Açıklama Yazma → 10/10 Puan
```

#### **Teknik Uygulama**
- **Lokasyon**: `src/components/quality/ContractReviewChecklist.tsx` (MEVCUT - GELİŞTİR)
- **Checklist Templates**: Contract türüne göre otomatik checklist
- **Progressive Completion**: Adım adım checkbox + açıklama
- **Automatic Scoring**: Tüm adımlar tamamlandığında 10/10

### **🏭 Lot Based Production & Planning Checklist**

#### **Lot Planning Tamamlandığında**
```
Lot Based Planning → Job'a Uygun Checklist → Manuel Checkbox → Açıklama → 10/10 Puan
```

#### **Veri Modeli Genişletme**
```typescript
interface JobChecklist {
  jobId: string;
  checklistType: 'contract_review' | 'lot_planning' | 'pre_production' | 'quality_control';
  requirements: ChecklistRequirement[];
  completionStatus: {
    completedItems: number;
    totalItems: number;
    score: number; // Out of 10
    overallStatus: 'pending' | 'partial' | 'complete';
  };
}

interface ChecklistRequirement {
  id: string;
  description: string;
  isCompleted: boolean;
  notes: string;
  completedBy: string;
  completedAt?: string;
  evidence?: string[]; // File attachments
}
```

---

## 🎯 **ÖNCELİK 4: ATTACHMENT ve REVİZYON KONTROL**

### **📎 Job Attachments Visibility**

#### **Görünürlük Gereksinimleri**
- **Jobs Sayfasında**: Her job için attachment indicator
- **Manufacturing Calendar'da**: Attachment icon + preview
- **Revision Control**: Rev numarası kontrolü

#### **Teknik Entegrasyon**
```typescript
// Mevcut Job interface'e ekleme
interface Job {
  // ... existing fields
  attachments: JobAttachment[];
  currentRevision: string;
  revisionHistory: RevisionHistory[];
}

interface JobAttachment {
  id: string;
  fileName: string;
  fileType: 'technical_drawing' | 'specification' | 'certificate' | 'other';
  revisionNumber: string;
  uploadDate: string;
  uploadedBy: string;
  isCurrentRevision: boolean;
  storageUrl: string;
}
```

### **🔄 Revision Level Integration**

#### **Lot Number + Revision Level**
```
Mevcut: Lot Number yanında
Yeni: Lot Number + Revision Level (örn: LOT-001-R2)
Order to Job: Revision girişi zorunlu
```

---

## 🎯 **ÖNCELİK 5: MALZEME ONAY SİSTEMİ**

### **📋 Material Approval Integration**

#### **Material Change Approval**
- **Lokasyon**: `src/components/quality/MaterialApprovalDialog.tsx` (YENİ)
- **Entegrasyon**: Mevcut `RelationalMaterialLot` sistemi ile
- **Approval Workflow**: Multi-level approval (Operatör → Supervisor → QA)

#### **Veri Modeli**
```typescript
interface MaterialChangeRequest {
  id: string;
  jobId: string;
  originalMaterial: MaterialSpec;
  requestedMaterial: MaterialSpec;
  changeReason: string;
  approvalWorkflow: ApprovalStep[];
  status: 'pending' | 'approved' | 'rejected';
  as9100dDocumentation: string[];
}
```

---

## 🎯 **ÖNCELİK 6: KALİBRASYON ve BAKIM KONTROL SİSTEMİ**

### **🔧 Calibration Control System**

#### **Dashboard Integration**
- **Lokasyon**: Dashboard'a uyarı widget'ı
- **Kontrol Listesi**: Ekipman bazlı kalibrasyon takvimi
- **Otomatik Uyarılar**: Kalibrasyon süresi dolduğunda

#### **Teknik Uygulama**
```typescript
interface CalibrationRecord {
  equipmentId: string;
  equipmentName: string;
  lastCalibrationDate: string;
  nextCalibrationDate: string;
  calibrationFrequency: number; // months
  calibrationCertificate: string;
  status: 'current' | 'due_soon' | 'overdue';
  responsiblePerson: string;
}

// Dashboard component'e ekleme
const CalibrationAlerts = () => {
  // Overdue ve due_soon items için uyarı göster
};
```

### **🔧 Maintenance Control System**

#### **Systematic Maintenance Tracking**
```
Bakım Kontrol Listesi:
- Daily coolant check
- Monthly holders & pens kontrolü (bozukları at/tamir et)
- Monthly Spindle Check
```

#### **Veri Modeli**
```typescript
interface MaintenanceSchedule {
  equipmentId: string;
  maintenanceType: 'daily_coolant' | 'monthly_holders' | 'monthly_spindle' | 'custom';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  lastPerformed: string;
  nextDue: string;
  checklistItems: MaintenanceChecklistItem[];
  status: 'current' | 'due' | 'overdue';
}
```

---

## 🎯 **ÖNCELİK 7: TOOL LIFE KONTROL MODÜLÜ**

### **🔧 Tool Life Management**

#### **Systematic Tool Tracking**
- **Lokasyon**: `src/app/[locale]/manufacturing/tool-life/page.tsx` (YENİ)
- **Tool Usage Tracking**: Her kullanımda tool life azaltma
- **Replacement Alerts**: Tool life bittiğinde uyarı
- **Cost Tracking**: Tool replacement cost monitoring

#### **Entegrasyon**
```typescript
// Mevcut ToolList entegrasyonu
interface ToolLifeRecord {
  toolId: string;
  toolDescription: string;
  totalLifeExpectancy: number; // hours or cycles
  currentUsage: number;
  remainingLife: number;
  lastUsedJobId: string;
  replacementCost: number;
  status: 'good' | 'warning' | 'replace_soon' | 'expired';
}
```

---

## 🎯 **ÖNCELİK 8: SHİPPİNG COMPLETION SİSTEMİ**

### **📦 Shipping Procedures Automation**

#### **Shipping Completion Checklist**
- **Pre-shipment Documentation**: Sertifikalar, labellar, ölçümler
- **ESD Procedures**: Anti-static container kontrolü
- **Limited Life Materials**: Expiration date coding
- **Final Quality Check**: Customer acceptance documentation

#### **Teknik Uygulama**
```typescript
interface ShippingCompletion {
  jobId: string;
  packingList: PackingListItem[];
  certificates: CertificateDocument[];
  labels: LabelDocument[];
  finalMeasurements: MeasurementRecord[];
  esdCompliance: ESDComplianceRecord;
  limitedLifeMaterials: LimitedLifeMaterialRecord[];
  customerAcceptance: boolean;
  shippingDate: string;
  trackingNumber: string;
}
```

---

## 🎯 **ÖNCELİK 9: CAR (CORRECTIVE ACTION REQUEST) MODÜLÜ**

### **📋 CAR System Integration**

#### **CAR Workflow**
```
Kalite Problemi → Otomatik CAR Oluştur → Root Cause Analysis → Corrective Action → Verification → Closure
```

#### **Mevcut Kalite Sistemi ile Entegrasyon**
- **NCR Integration**: Mevcut NonConformanceReport ile bağlantı
- **CAPA Process**: Sistematik düzeltici faaliyet takibi
- **Effectiveness Review**: Düzeltici faaliyetin etkinlik kontrolü

---

## 🎯 **KÜÇÜK DEĞİŞİKLİKLER (Hızlı Uygulanabilir)**

### **👨‍🔧 Manufacturing Process Enhancements**

#### **1. Operatör Adı Ekleme**
```typescript
// manufacturing-completion interface'e ekleme
interface ProcessCompletion {
  // ... existing fields
  completedByOperator: string; // YENİ
  operatorSignature?: string; // YENİ
}
```

#### **2. Final Inspection Measurement Requirements**
```typescript
// Final inspection için otomatik hesaplama
const requiredMeasurements = 2 + Math.ceil(quantity * 5 / 100);
```

#### **3. Scrap Count Entry**
```typescript
interface ProcessCompletion {
  // ... existing fields
  scrapCount: number; // ZORUNLU
  scrapReason: string; // ZORUNLU if scrapCount > 0
}
```

#### **4. CAM/Software Change Control**
```typescript
interface SubtaskCompletion {
  // ... existing fields
  ncProgramDate: string; // NC tarihi
  simulationApproval: boolean; // Simulasyon onayı
  faiControlApproval: boolean; // FAI kontrol onayı
  approvedByEmre: boolean; // Emre onayı
}
```

#### **5. Critical Points on Routing Sheet**
```typescript
interface RoutingSheetOperation {
  // ... existing fields
  criticalPoints: CriticalPoint[]; // İlgili operasyona göre
  appearInFAI: boolean; // FAI'de görünsün
  approvalRequired: boolean; // Process completion'da onay zorunlu
}
```

---

## 📅 **UYGULAMA TİMELINE'I**

### **Faz 1: Temel QR ve Checklist Sistemi (2-3 Hafta)**
- ✅ QR Code Routing Sheet sistemi
- ✅ Contract Review ve Lot Planning checklists
- ✅ Camera permission ve photo upload
- ✅ FAI measurement entegrasyonu

### **Faz 2: Attachment ve Revision Control (1-2 Hafta)**
- ✅ Job attachments visibility (jobs page + calendar)
- ✅ Revision control sistemi
- ✅ Lot number + revision level entegrasyonu

### **Faz 3: Kalibrasyon ve Bakım Sistemi (2 Hafta)**
- ✅ Calibration control listesi + dashboard alerts
- ✅ Maintenance control sistemi
- ✅ Tool life management modülü

### **Faz 4: Shipping ve CAR Sistemi (2-3 Hafta)**
- ✅ Shipping completion procedures
- ✅ ESD ve limited life materials procedures
- ✅ CAR (Corrective Action Request) modülü

### **Faz 5: Customer Complaint Sistemi (1-2 Hafta)**
- ✅ Customer feedback/complaint management
- ✅ CAPA entegrasyonu
- ✅ Customer notification sistemi

### **Faz 6: Küçük Değişiklikler (1 Hafta)**
- ✅ Operatör adı ekleme
- ✅ Measurement requirements automation
- ✅ Scrap count mandatory
- ✅ CAM/software change control
- ✅ Critical points routing sheet

---

## 🎯 **BAŞARI KRİTERLERİ**

### **Operasyonel KPI'lar**
- **QR Tarama Süresi**: < 5 saniye (hedef)
- **Checklist Completion**: %100 completion rate
- **Revision Control**: %0 wrong revision usage
- **Calibration Compliance**: %100 on-time calibration
- **Shipping Documentation**: %100 complete documentation

### **AS9100D Uyumluluk KPI'ları**
- **Traceability**: %100 malzeme-parça izlenebilirliği
- **Documentation Control**: %100 revision control
- **Calibration Management**: %100 calibration current
- **Corrective Actions**: < 48 saat CAR response time

### **Kalite KPI'ları**
- **First Pass Yield**: %95+ (hedef artış)
- **Customer Complaints**: %50 azalma
- **NCR'lar**: %30 azalma
- **Delivery Performance**: %98+ on-time delivery

---

## 🚀 **SONUÇ**

Bu roadmap, mevcut sağlam sistem temelini koruyarak, 1.07.2025 eksiklerini sistematik olarak gidermektedir. QR kod entegrasyonu, checklist otomasyonu, ve kapsamlı kalite kontrol sistemleri ile tam AS9100D uyumlu modern üretim yönetim sistemi hedeflenmektedir.

**Toplam Süre**: 8-12 Hafta  
**Yatırım**: Mevcut altyapı üzerine incremental development  
**ROI**: İlk 6 ayda operasyonel verimlilik %25+ artış beklentisi 