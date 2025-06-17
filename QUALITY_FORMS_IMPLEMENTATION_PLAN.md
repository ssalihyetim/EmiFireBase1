# AS9100D Quality Forms & Traceability: Implementation Plan

This document outlines the implementation plan for creating a comprehensive, data-driven system for managing AS9100D forms and ensuring full traceability within the application.

**Guiding Principles:**
-   **Data-Driven:** Forms are interactive and save data to Firestore. Printable documents are generated from this data.
-   **Subtask-Driven UI:** All actions (creating forms, uploading documents, entering data) are anchored to specific, automatically generated subtasks.
-   **Centralized & Reusable:** Common functionalities (like file uploads and tool management) are built as reusable components.

---

##  yaşayan Implementation Roadmap

I will update the status of each phase as it is completed.

### Phase 1: Establish the Data Foundation for Tools
-   **Status:** ✅ **Completed**
-   **Objective:** Create the backend structure to manage a central database of tools.
-   **Tasks:**
    1.  **Create `Tool` Type:** Define the data structure for tools in `src/types/tools.ts`, including default parameters (Ap, Ae, RPM, Feed, etc.).
    2.  **Plan `tools` Firestore Collection:** Designate a new top-level `tools` collection in Firestore for pre-populating standard tooling.
    3.  **Create Tool Management Library:** Create `src/lib/firebase-tools.ts` with functions like `getTools()` to fetch tool data.

### Phase 2: Enhance Task & Subtask Automation
-   **Status:** ✅ **Completed**
-   **Objective:** Automatically generate all necessary subtasks for every manufacturing job to act as triggers for quality documentation.
-   **Tasks:**
    1.  **Update Subtask Templates:** Modify the subtask configuration (`src/config/subtask-templates.ts`) to ensure all manufacturing tasks automatically get the following subtasks:
        -   `Setup Sheet` (existing)
        -   `First Article Inspection` (New)
        -   `Tool List` (New)
        -   `Tool Life Verification` (New)
    2.  **Identify Core Quality Tasks:** Locate the definitions for `Final Inspection`, `Material Approval`, and `Set Traceability & Lot Number` to prepare them for UI integration.

### Phase 3: Build a Reusable Attachment Component
-   **Status:** ✅ **Completed**
-   **Objective:** Build a single, robust component for handling all document uploads.
-   **Tasks:**
    1.  **Create `AttachmentUploader.tsx`:** Build a generic component for file uploads to Firebase Storage.
    2.  **Functionality:** It will support drag-and-drop, link the uploaded file's URL to the parent task/subtask, and provide feedback on the upload status.

### Phase 4: Build Forms and Input Components
-   **Status:** ✅ **Completed**
-   **Objective:** Create all the necessary interactive forms and input components for data entry.
-   **Tasks:**
    1.  **Enhance `SetupSheetForm.tsx`:** Update the existing form to match the detailed AS9100D template.
    2.  **Create `ToolListForm.tsx`:** Build the new form for managing a job's tool list, linking to the central `tools` database.
    3.  **Create `FAIReportForm.tsx`:** Build a new form for First Article Inspection reports.
    4.  **Create `ToolLifeVerificationLogTemplate.tsx`:** Create the printable, non-interactive template for the tool life log.
    5.  **Create `LotNumberInput.tsx`:** Create a simple, dedicated component for entering and saving a Lot Number.

### Phase 5: Integrate into the Task Management UI
-   **Status:** ✅ **Completed**
-   **Objective:** Wire all new components and logic into the detailed Task Management page (`/jobs/[jobId]/tasks`).
-   **Tasks:**
    1.  **Integrate Lot Number Input:** Add the `LotNumberInput` component to the "Set Traceability & Lot Number" subtask.
    2.  **Integrate File Uploads:**
        -   Add the `AttachmentUploader` to the "Material Approval" subtask for Material Certifications.
        -   Add the `AttachmentUploader` to the "Final Inspection" subtask for Measurement Reports.
    3.  **Integrate Form Buttons:**
        -   **Setup Sheet:** Add "Create/Edit Setup Sheet" buttons.
        -   **First Article Inspection:** Add "Create/Edit FAI Report" buttons.
        -   **Tool List:** Add "Create/Edit Tool List" buttons.
        -   **Tool Life Verification:** Add a "Print Log" button. 