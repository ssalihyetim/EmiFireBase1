# 🚀 **2025 SİSTEM GELİŞTİRME ROADMAP'İ**

## 📋 **YÖNETİCİ ÖZETİ**

**Tarih**: 1.07.2025 Eksikler Listesi Bazlı Roadmap  
**Durum**: Mevcut sistem sağlam temel üzerine kritik eksikliklerin giderilmesi  
**Hedef**: Tam AS9100D uyumlu, QR kodlu, kalite odaklı üretim yönetim sistemi

**🎯 YENİ ÖNCELİKLENDİRME:**
1. **KÜÇÜK DEĞİŞİKLİKLER** (Hızlı uygulanabilir - 1 hafta)
2. **ATTACHMENT & REVİZYON KONTROL** (Kritik kalite - 1-2 hafta)
3. **CAR (Corrective Action) MODÜLÜ** (AS9100D core - 2 hafta)
4. Diğer büyük modüller

---

## 🎯 **ÖNCELİK 1: KÜÇÜK DEĞİŞİKLİKLER (Hızlı Uygulanabilir)**

### **⚡ Immediate Implementation Items**

#### **1. Manufacturing Process Completion - Operatör Adı Ekleme**
```typescript
// manufacturing-completion interface'e ekleme
interface ProcessCompletion {
  // ... existing fields
  completedByOperator: string; // YENİ - ZORUNLU
  operatorSignature?: string; // YENİ
  completionTimestamp: string; // ENHANCED
}
```

**📍 Uygulama Lokasyonu**: `src/components/manufacturing/ProcessCompletionForm.tsx`

#### **2. Final Inspection - Ölçüm Zorunluluğu (2+quantity*5/100 adet)**
```typescript
// Final inspection için otomatik hesaplama
const calculateRequiredMeasurements = (quantity: number): number => {
  return 2 + Math.ceil(quantity * 5 / 100);
};

// Form validation
const validateMeasurements = (measurements: number, required: number): boolean => {
  return measurements >= required;
};
```

**📍 Uygulama Lokasyonu**: `src/components/quality/FinalInspectionForm.tsx`

#### **3. Hurdaya Atılan Parça Sayısı - Zorunlu Giriş**
```typescript
interface ProcessCompletion {
  // ... existing fields
  scrapCount: number; // ZORUNLU - 0 veya pozitif
  scrapReason: string; // ZORUNLU if scrapCount > 0
  scrapCategories: ScrapCategory[]; // Hurda kategorileri
  scrapCost: number; // Hurda maliyeti hesaplama
}

interface ScrapCategory {
  type: 'material_defect' | 'machine_error' | 'operator_error' | 'design_issue';
  count: number;
  description: string;
}
```

**📍 Uygulama Lokasyonu**: `src/components/manufacturing/ScrapTrackingForm.tsx`

#### **4. CAM/Software Değişiklikleri - Simulasyon ve FAI Kontrolü**
```typescript
interface SubtaskCompletion {
  // ... existing fields
  ncProgramDate: string; // NC program tarihi - ZORUNLU
  simulationCompleted: boolean; // Simulasyon yapıldı mı?
  simulationApproval: boolean; // Simulasyon onayı
  faiControlRequired: boolean; // FAI kontrolü gerekli mi?
  faiControlCompleted: boolean; // FAI kontrolü tamamlandı mı?
  qualityManagerApproval: boolean; // Emre tarafından onay
  approvalDate: string; // Onay tarihi
  approvalNotes: string; // Onay notları
}
```

**📍 Uygulama Lokasyonu**: `src/components/manufacturing/CAMSoftwareChangeForm.tsx`

#### **5. Routing Sheet - Kritik Noktalar Operasyona Göre**
```typescript
interface RoutingSheetOperation {
  // ... existing fields
  criticalPoints: CriticalPoint[]; // Operasyona özel kritik noktalar
  criticalInFAI: boolean; // FAI'de görünsün
  processCompletionApproval: boolean; // Process completion'da onay zorunlu
  operationCriticality: 'low' | 'medium' | 'high' | 'critical';
}

interface CriticalPoint {
  id: string;
  description: string;
  measurementType: 'dimensional' | 'visual' | 'functional' | 'material';
  tolerance: string;
  controlMethod: string;
  frequency: 'every_part' | 'sampling' | 'first_article';
  appearInFAI: boolean;
}
```

**📍 Uygulama Lokasyonu**: `src/components/manufacturing/CriticalPointsManager.tsx`

#### **6. Lot Number + Revision Level Entegrasyonu**
```typescript
// Order to Job yaparken Revision Level zorunlu
interface OrderToJobForm {
  // ... existing fields
  revisionLevel: string; // ZORUNLU - örn: "R1", "R2", "Rev A"
  revisionDate: string; // Revizyon tarihi
  revisionDescription: string; // Revizyon açıklaması
}

// Lot number format'ına revision ekleme
const generateLotWithRevision = (baseLot: string, revision: string): string => {
  return `${baseLot}-${revision}`; // örn: LOT-20250107-001-R2
};
```

**📍 Uygulama Lokasyonu**: `src/lib/lot-revision-management.ts`

### **📋 Küçük Değişiklikler Timeline**
- **Hafta 1**: Operatör adı + Hurda sayısı (2 gün)
- **Hafta 1**: Final inspection ölçüm zorunluluğu (1 gün)
- **Hafta 1**: CAM/Software change control (2 gün)
- **Hafta 1**: Routing sheet kritik noktalar (2 gün)

---

## 🎯 **ÖNCELİK 2: ATTACHMENT ve REVİZYON KONTROL SİSTEMİ**

### **📎 Job Attachments Comprehensive Visibility**

#### **Jobs Sayfasında Attachment Görünürlüğü**
```typescript
// Jobs list interface enhancement
interface JobListItem {
  // ... existing fields
  attachmentCount: number;
  hasCurrentRevision: boolean;
  revisionStatus: 'current' | 'outdated' | 'missing';
  attachmentIndicator: AttachmentIndicator;
}

interface AttachmentIndicator {
  technicalDrawings: number;
  specifications: number;
  certificates: number;
  revisionMismatch: boolean; // Rev numarası uyumsuzluğu
}
```

**📍 Uygulama Lokasyonu**: `src/components/jobs/JobAttachmentIndicator.tsx`

#### **Manufacturing Calendar'da Attachment Integration**
```typescript
// Calendar event'e attachment bilgisi ekleme
interface CalendarEvent {
  // ... existing fields
  attachments: {
    count: number;
    hasDrawings: boolean;
    currentRevision: string;
    revisionMatch: boolean; // Sipariş Rev vs Attachment Rev
  };
  attachmentPreview: AttachmentPreview[];
}

interface AttachmentPreview {
  fileName: string;
  fileType: 'technical_drawing' | 'specification' | 'certificate';
  revisionNumber: string;
  thumbnailUrl?: string;
  quickViewUrl: string;
}
```

**📍 Uygulama Lokasyonu**: `src/components/calendar/AttachmentCalendarIntegration.tsx`

#### **Revision Control System**
```typescript
interface RevisionControl {
  jobId: string;
  orderRevision: string; // Siparişteki Rev numarası
  attachmentRevisions: RevisionMapping[];
  currentActiveRevision: string;
  revisionHistory: RevisionHistoryEntry[];
  revisionStatus: 'aligned' | 'mismatch' | 'pending_update';
}

interface RevisionMapping {
  attachmentId: string;
  fileName: string;
  revisionNumber: string;
  isCurrentRevision: boolean;
  uploadDate: string;
  approvedBy: string;
}

interface RevisionHistoryEntry {
  previousRevision: string;
  newRevision: string;
  changeDate: string;
  changedBy: string;
  changeReason: string;
  affectedJobs: string[]; // Bu revision change'den etkilenen joblar
}
```

**📍 Uygulama Lokasyonu**: `src/lib/revision-control-system.ts`

#### **Teknik Resim Rev Kontrolü Enhancement**
```typescript
// Automatic revision checking
const checkRevisionMatch = async (
  jobId: string, 
  orderRevision: string
): Promise<RevisionCheckResult> => {
  const attachments = await getJobAttachments(jobId);
  const technicalDrawings = attachments.filter(att => 
    att.fileType === 'technical_drawing'
  );
  
  const revisionMatches = technicalDrawings.every(drawing => 
    drawing.revisionNumber === orderRevision
  );
  
  return {
    isMatched: revisionMatches,
    mismatches: findRevisionMismatches(technicalDrawings, orderRevision),
    recommendedActions: generateRevisionActions(revisionMatches)
  };
};
```

### **📋 Attachment & Revision Timeline**
- **Hafta 1**: Jobs page attachment indicators (3 gün)
- **Hafta 1**: Manufacturing calendar integration (2 gün)
- **Hafta 2**: Revision control system (5 gün)

---

## 🎯 **ÖNCELİK 3: CAR (CORRECTIVE ACTION REQUEST) MODÜLÜ**

### **📋 Comprehensive CAR System Integration**

#### **CAR Workflow Architecture**
```
Kalite Problemi Tespit → Otomatik CAR Oluştur → Root Cause Analysis → 
Corrective Action Plan → Implementation → Verification → Effectiveness Review → Closure
```

#### **CAR Veri Modeli**
```typescript
interface CorrectiveActionRequest {
  id: string; // CAR-YYYY-XXXX format
  jobId?: string; // Hangi job'dan kaynaklandı
  customerId?: string; // Müşteri şikayeti ise
  initiatedBy: string; // CAR'ı başlatan kişi
  initiationDate: string;
  
  // Problem Definition
  problemDescription: string;
  problemType: 'customer_complaint' | 'internal_ncr' | 'audit_finding' | 'management_review';
  severity: 'minor' | 'major' | 'critical';
  affectedProducts: string[]; // Etkilenen ürünler
  potentialImpact: string;
  
  // Root Cause Analysis
  rootCauseAnalysis: RootCauseAnalysis;
  
  // Corrective Actions
  correctiveActions: CorrectiveAction[];
  
  // Verification & Effectiveness
  verification: VerificationRecord;
  effectivenessReview: EffectivenessReview;
  
  // Status & Workflow
  status: 'open' | 'investigating' | 'action_plan' | 'implementing' | 'verifying' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  targetCloseDate: string;
  actualCloseDate?: string;
  
  // AS9100D Compliance
  as9100dClause: string[]; // İlgili AS9100D maddeleri
  regulatoryRequirements: string[];
}

interface RootCauseAnalysis {
  method: 'fishbone' | '5_why' | 'fault_tree' | 'pareto' | 'other';
  analysisDetails: string;
  rootCauses: RootCause[];
  contributingFactors: string[];
  analysisCompletedBy: string;
  analysisDate: string;
}

interface RootCause {
  category: 'man' | 'machine' | 'material' | 'method' | 'environment' | 'measurement';
  description: string;
  evidence: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

interface CorrectiveAction {
  id: string;
  description: string;
  actionType: 'immediate' | 'short_term' | 'long_term' | 'systemic';
  assignedTo: string;
  targetDate: string;
  completionDate?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'verified';
  evidence: string[]; // Dokümanlar, fotoğraflar
  cost: number;
  resources: string[];
}

interface VerificationRecord {
  verificationMethod: string;
  verificationDate: string;
  verifiedBy: string;
  verificationResults: string;
  objectiveEvidences: string[]; // Objektif kanıtlar
  isEffective: boolean;
}

interface EffectivenessReview {
  reviewDate: string;
  reviewedBy: string;
  effectivenessRating: 'ineffective' | 'partially_effective' | 'effective' | 'highly_effective';
  measurableResults: MeasurableResult[];
  recommendationsForImprovement: string[];
  furtherActionsRequired: boolean;
}

interface MeasurableResult {
  metric: string;
  beforeValue: number;
  afterValue: number;
  improvementPercentage: number;
  measurementDate: string;
}
```

#### **CAR Otomatik Tetikleme**
```typescript
// CAR otomatik oluşturma triggerları
const CARTriggers = {
  customerComplaint: async (complaint: CustomerComplaint) => {
    if (complaint.severity === 'major' || complaint.severity === 'critical') {
      return await createAutoCAR(complaint, 'customer_complaint');
    }
  },
  
  internalNCR: async (ncr: NonConformanceReport) => {
    if (ncr.disposition === 'scrap' || ncr.recurrenceRisk === 'high') {
      return await createAutoCAR(ncr, 'internal_ncr');
    }
  },
  
  auditFinding: async (finding: AuditFinding) => {
    if (finding.severity === 'major' || finding.severity === 'critical') {
      return await createAutoCAR(finding, 'audit_finding');
    }
  }
};

const createAutoCAR = async (
  source: any, 
  type: CARType
): Promise<CorrectiveActionRequest> => {
  const carId = generateCARId(); // CAR-2025-001 format
  
  return {
    id: carId,
    jobId: source.jobId,
    initiatedBy: 'SYSTEM_AUTO',
    initiationDate: new Date().toISOString(),
    problemDescription: generateProblemDescription(source, type),
    problemType: type,
    severity: mapSeverity(source.severity),
    status: 'open',
    priority: calculatePriority(source),
    // ... other fields
  };
};
```

#### **CAR Dashboard Integration**
```typescript
// Dashboard'a CAR widgets ekleme
interface CARDashboardMetrics {
  openCARs: number;
  overdueCARs: number;
  criticalCARs: number;
  monthlyTrend: CARTrendData[];
  effectivenessRate: number; // %
  averageCloseTime: number; // days
  costOfQuality: CostOfQualityMetrics;
}

interface CostOfQualityMetrics {
  preventionCosts: number;
  appraisalCosts: number;
  internalFailureCosts: number;
  externalFailureCosts: number;
  totalCOQ: number;
  caqAsPercentageOfSales: number;
}
```

#### **Mevcut Sistem ile Entegrasyon**
```typescript
// NCR ile entegrasyon
interface NonConformanceReport {
  // ... existing fields
  relatedCAR?: string; // CAR ID'si
  carRequired: boolean;
  carCreationReason: string;
}

// Customer complaint ile entegrasyon
interface CustomerComplaint {
  // ... existing fields
  associatedCAR?: string;
  carEscalation: boolean;
}

// Quality audit ile entegrasyon
interface QualityAuditFinding {
  // ... existing fields
  triggersCAR: boolean;
  carReference?: string;
}
```

### **📋 CAR Modülü Timeline**
- **Hafta 1**: CAR veri modeli ve temel CRUD (3 gün)
- **Hafta 1**: Otomatik tetikleme sistemi (2 gün)
- **Hafta 2**: Root cause analysis tools (3 gün)
- **Hafta 2**: Dashboard integration ve reporting (2 gün)

---

## 🎯 **ÖNCELİK 4: QR KODLU ROUTING SHEET SİSTEMİ**

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

## 🎯 **ÖNCELİK 5: CHECKLIST ve ONAY SİSTEMLERİ**

### **✅ Contract Review & Lot Planning Checklists**

#### **Contract Review Tamamlandığında**
```
Contract Review → Job'a Uygun Checklist Oluştur → Manuel Checkbox Kontrolü → Açıklama Yazma → 10/10 Puan
```

#### **Lot Based Production & Planning Checklist**
```
Lot Based Planning → Job'a Uygun Checklist → Manuel Checkbox → Açıklama → 10/10 Puan
```

---

## 🎯 **ÖNCELİK 6: MALZEME ONAY SİSTEMİ**

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

## 🎯 **ÖNCELİK 7: KALİBRASYON ve BAKIM KONTROL SİSTEMİ**

### **🔧 Calibration & Maintenance Control**

#### **Dashboard Integration**
- **Lokasyon**: Dashboard'a uyarı widget'ı
- **Kontrol Listesi**: Ekipman bazlı kalibrasyon takvimi
- **Otomatik Uyarılar**: Kalibrasyon süresi dolduğunda

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

## 🎯 **ÖNCELİK 8: TOOL LIFE KONTROL MODÜLÜ**

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

## 🎯 **ÖNCELİK 9: SHİPPİNG COMPLETION SİSTEMİ**

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

## 🎯 **ÖNCELİK 10: MÜŞTERİ ŞİKAYET ve GERİ BİLDİRİM SİSTEMİ**

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

## 📅 **YENİ UYGULAMA TİMELINE'I**

### **Faz 1: Hızlı Kazançlar (1 Hafta)**
- ✅ **Küçük Değişiklikler**: Operatör adı, hurda sayısı, ölçüm zorunluluğu
- ✅ **CAM/Software kontrol**: Simulasyon + FAI onayı
- ✅ **Routing sheet kritik noktalar**

### **Faz 2: Kalite Altyapısı (2 Hafta)**
- ✅ **Attachment ve Revision Control**: Jobs page + calendar integration
- ✅ **CAR Modülü**: Temel workflow + otomatik tetikleme

### **Faz 3: QR ve Checklist Sistemi (2-3 Hafta)**
- ✅ **QR Code Routing Sheet**: Tarama + photo upload
- ✅ **Contract Review ve Lot Planning checklists**

### **Faz 4: Maintenance ve Tool Management (2 Hafta)**
- ✅ **Calibration control + dashboard alerts**
- ✅ **Maintenance control sistemi**
- ✅ **Tool life management modülü**

### **Faz 5: Shipping ve Material Control (2 Hafta)**
- ✅ **Material approval workflow**
- ✅ **Shipping completion procedures**
- ✅ **ESD ve limited life materials**

### **Faz 6: Customer Management (1-2 Hafta)**
- ✅ **Customer feedback/complaint management**
- ✅ **CAPA entegrasyonu**

---

## 🎯 **BAŞARI KRİTERLERİ**

### **İlk Hafta (Küçük Değişiklikler) KPI'ları**
- **Operatör Takibi**: %100 operatör adı girişi
- **Hurda Kontrolü**: %100 hurda sayısı kayıt
- **Ölçüm Uyumluluğu**: %100 gerekli ölçüm sayısı karşılama
- **CAM/Software Onayı**: %100 quality manager approval

### **İkinci-Üçüncü Hafta (Attachment/CAR) KPI'ları**
- **Revision Control**: %0 wrong revision usage
- **CAR Response Time**: < 24 saat CAR oluşturma
- **Attachment Visibility**: %100 attachment status gösterimi

### **Genel AS9100D Uyumluluk KPI'ları**
- **Traceability**: %100 malzeme-parça izlenebilirliği
- **Documentation Control**: %100 revision control
- **Corrective Actions**: < 48 saat CAR response time
- **Customer Satisfaction**: %95+ (complaint azalma hedefi)

---

## 🚀 **SONUÇ**

Bu yeniden önceliklendirilmiş roadmap, hızlı kazançlarla başlayıp kritik kalite kontrol sistemlerine odaklanmaktadır. İlk haftalarda görünür iyileştirmeler sağlanırken, sistematik olarak AS9100D uyumlu tam kalite yönetim sistemine ulaşılacaktır.

**Toplam Süre**: 8-10 Hafta (3 hafta öne çıkarıldı)  
**İlk Hafta ROI**: Operasyonel kontrol %40+ iyileşme  
**İlk Ay ROI**: Kalite takibi ve revision control %60+ iyileşme 