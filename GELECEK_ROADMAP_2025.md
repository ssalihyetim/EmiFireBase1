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
Routing Sheet → QR Code Tarama → Unified Task View Açılır → Mobil Uyumlu İşlem
```

#### **📱 Mobil Uyumluluk ve Kullanıcı Yetkilendirmesi**

##### **1. Responsive Mobile Design**
```typescript
// Mobile-first design approach
const QRScannerMobile = {
  screenSizes: {
    mobile: '375px - 768px',
    tablet: '768px - 1024px', 
    desktop: '1024px+'
  },
  touchOptimized: true,
  gestureSupport: {
    pinchToZoom: true,  // QR code yakınlaştırma
    swipeNavigation: true, // Task'ler arası geçiş
    tapToFocus: true // Kamera odaklama
  }
};

// Progressive Web App (PWA) features
interface PWAFeatures {
  installable: boolean; // Ana ekrana ekleme
  offlineSupport: boolean; // Çevrimdışı çalışma
  pushNotifications: boolean; // Task bildirimleri
  backgroundSync: boolean; // Arka plan senkronizasyon
}
```

**📍 Uygulama Lokasyonu**: `src/components/mobile/QRScannerMobile.tsx`

##### **2. Kullanıcı Yetkilendirme Sistemi**
```typescript
interface QRAccessControl {
  userId: string;
  userRole: 'operator' | 'supervisor' | 'quality_inspector' | 'manager';
  permissions: QRPermission[];
  allowedOperations: string[]; // Hangi operasyonlara erişebilir
  restrictedTasks: string[]; // Kısıtlı task'ler
  shiftRestrictions: ShiftAccess; // Vardiya bazlı erişim
}

interface QRPermission {
  taskType: 'machining' | 'inspection' | 'assembly' | 'packaging';
  canView: boolean;
  canEdit: boolean;
  canComplete: boolean;
  requiresSupervisorApproval: boolean;
}

interface ShiftAccess {
  allowedShifts: ('morning' | 'afternoon' | 'night')[];
  timeRestrictions: {
    startTime: string; // "06:00"
    endTime: string;   // "14:00"
  };
  weekendAccess: boolean;
}

// QR Tarama öncesi yetki kontrolü
const validateQRAccess = async (
  qrData: QRData, 
  userId: string
): Promise<AccessValidationResult> => {
  const userPermissions = await getUserPermissions(userId);
  const taskRequirements = await getTaskRequirements(qrData.taskId);
  
  return {
    hasAccess: checkUserPermissions(userPermissions, taskRequirements),
    restrictions: getAccessRestrictions(userPermissions, taskRequirements),
    requiredApprovals: getRequiredApprovals(taskRequirements),
    alternativeActions: getAlternativeActions(userPermissions)
  };
};
```

**📍 Uygulama Lokasyonu**: `src/lib/qr-access-control.ts`

##### **3. Güvenli QR Code Authentication**
```typescript
interface SecureQRData {
  jobId: string;
  taskId: string;
  operationId: string;
  timestamp: string;
  securityHash: string; // Tamper protection
  expirationTime: string; // QR code geçerlilik süresi
  restrictedAccess: {
    requiredRole: string[];
    locationRestriction?: string; // Sadece belirli lokasyonlarda
    timeWindow?: string; // Belirli zaman diliminde
  };
}

// QR Code oluşturma (güvenli)
const generateSecureQR = (
  jobId: string, 
  taskId: string, 
  permissions: QRPermission[]
): string => {
  const qrData: SecureQRData = {
    jobId,
    taskId,
    operationId: generateOperationId(),
    timestamp: new Date().toISOString(),
    securityHash: generateSecurityHash(jobId, taskId),
    expirationTime: calculateExpirationTime(),
    restrictedAccess: mapPermissionsToRestrictions(permissions)
  };
  
  return JSON.stringify(qrData);
};

// QR Decode ve güvenlik kontrolü
const decodeAndValidateQR = async (
  qrString: string, 
  scannedBy: string
): Promise<QRValidationResult> => {
  const qrData = JSON.parse(qrString) as SecureQRData;
  
  // Güvenlik kontrolleri
  const securityChecks = {
    hashValid: validateSecurityHash(qrData),
    notExpired: checkExpiration(qrData.expirationTime),
    locationValid: await validateLocation(qrData.restrictedAccess),
    timeWindowValid: validateTimeWindow(qrData.restrictedAccess),
    userAuthorized: await validateUserAccess(scannedBy, qrData.restrictedAccess)
  };
  
  return {
    isValid: Object.values(securityChecks).every(check => check),
    qrData: qrData,
    securityResults: securityChecks,
    unifiedTaskUrl: generateUnifiedTaskUrl(qrData)
  };
};
```

##### **4. Mobile Navigation & UX**
```typescript
// Mobile unified task interface
interface MobileUnifiedTask {
  taskId: string;
  jobInfo: JobSummary;
  currentStep: number;
  totalSteps: number;
  
  // Mobile-optimized navigation
  navigation: {
    previousTask?: string;
    nextTask?: string;
    parentJob: string;
    quickActions: QuickAction[];
  };
  
  // Touch-friendly controls
  mobileControls: {
    swipeEnabled: boolean;
    voiceInput: boolean; // Sesli giriş
    barcodeScanner: boolean; // Ek barcode tarama
    photoCapture: boolean; // Hızlı foto çekimi
  };
  
  // Offline capability
  offlineMode: {
    syncRequired: boolean;
    cachedData: CachedTaskData;
    conflictResolution: ConflictStrategy;
  };
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: 'complete_step' | 'add_note' | 'take_photo' | 'request_help';
  requiresConfirmation: boolean;
}

// Mobile URL generation
const generateUnifiedTaskUrl = (qrData: SecureQRData): string => {
  const baseUrl = '/mobile/unified-task';
  const params = new URLSearchParams({
    jobId: qrData.jobId,
    taskId: qrData.taskId,
    operation: qrData.operationId,
    mode: 'mobile',
    source: 'qr_scan'
  });
  
  return `${baseUrl}?${params.toString()}`;
};
```

**📍 Uygulama Lokasyonu**: `src/app/mobile/unified-task/page.tsx`

#### **Teknik Uygulama Genişletilmiş**
- **Ana Konum**: `src/app/[locale]/jobs/[jobId]/qr-routing/page.tsx` (DESKTOP)
- **Mobil Konum**: `src/app/mobile/unified-task/page.tsx` (MOBİL)
- **QR Kod Oluşturma**: Güvenli hash + role-based access
- **QR Tarama**: Kamera izni + güvenlik validasyonu
- **Unified Task**: Mobil uyumlu task interface
- **Yetkilendirme**: Role-based access control (RBAC)

#### **Geliştirme Adımları Güncellenmiş**
1. **QR Code Generator Modülü** (`src/lib/qr-code-generator.ts`)
2. **Access Control System** (`src/lib/qr-access-control.ts`) 
3. **Mobile Camera Handler** (`src/components/mobile/MobileCameraHandler.tsx`)
4. **Secure QR Scanner** (`src/components/camera/SecureQRScanner.tsx`)
5. **Mobile Unified Task** (`src/components/mobile/MobileUnifiedTask.tsx`)
6. **PWA Configuration** (`public/manifest.json` + service worker)
7. **User Permission Manager** (`src/lib/user-permission-manager.ts`)

#### **🔐 Güvenlik ve Yetkilendirme Timeline**
- **3 gün**: User role system + permissions
- **2 gün**: Secure QR generation + validation  
- **2 gün**: Mobile responsive design
- **2 gün**: PWA features + offline support
- **1 gün**: Testing + security audit

#### **Entegrasyon Noktaları Genişletilmiş**
- Mevcut `JobTaskDisplay.tsx` ile entegrasyon
- `user-management.ts` ile role-based access
- `mobile-navigation.ts` ile mobil navigasyon
- `firebase-auth.ts` ile kimlik doğrulama
- `firebase-storage.ts` ile photo upload integration
- `service-worker.ts` ile offline capability

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

### **Faz 3: QR ve Checklist Sistemi (3-4 Hafta)**
- ✅ **QR Code Routing Sheet**: Güvenli tarama + mobil uyumluluk
- ✅ **User Authorization System**: Role-based access control
- ✅ **Mobile PWA Features**: Offline support + push notifications  
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

**Toplam Süre**: 9-11 Hafta (QR mobil uyumluluk + yetkilendirme eklendi)  
**İlk Hafta ROI**: Operasyonel kontrol %40+ iyileşme  
**İlk Ay ROI**: Kalite takibi ve revision control %60+ iyileşme  
**Mobil ROI**: QR tarama verimliliği %80+ artış + güvenlik artışı 