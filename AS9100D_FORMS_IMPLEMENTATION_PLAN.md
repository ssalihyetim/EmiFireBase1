# AS9100D Compliance Forms: A "How-To" Guide

This document explains how the application's existing, data-driven form management system works. This system is centered around the detailed **Task Management Page**.

---

## 1. The Core Concept: Data-Driven Forms

Instead of generating static, non-editable PDF files, the application uses a more powerful approach:

- **Interactive Forms:** Users input data into forms within the application.
- **Data is Stored:** This data is saved into dedicated collections in Firestore (e.g., `setup_sheets`, `tool_lists`).
- **Documents from Data:** Printable documents can then be generated from this saved, structured data.

This means forms are **editable, versionable, and the source of truth**, which is a much more robust system for quality management.

---

## 2. How to Create and Manage Forms

All form management is handled on the detailed **Task Management Page**.

### Step 1: Navigate to the Task Management Page
- From the main `/jobs/[jobId]/operations` page, click the **"View Unified Tasks"** button. This will take you to `/jobs/[jobId]/tasks`. This is the central hub for this workflow.

### Step 2: Find the Relevant Subtask
- On the Task Management page, each task is shown in a card. Inside each card is a list of its subtasks.
- Certain subtasks, based on their `templateId`, are designed to have forms associated with them. For example, a subtask named "Setup Sheet" will have form-related actions.

### Step 3: Use the Form Action Buttons
- Next to these specific subtasks, you will find buttons like:
    - **"Create Setup Sheet"**: Opens a dialog (`SetupSheetForm`) where you can enter all the setup details.
    - **"Edit"**: If a form has already been created for a subtask, this button will appear, allowing you to edit the previously saved data.
    - **"Delete"**: Removes the saved form data.

This workflow provides a complete CRUD (Create, Read, Update, Delete) interface for your quality documents, all linked directly to the job's task structure.

---

## 3. The Role of the `/operations` Page

Based on this architecture, the `/jobs/[jobId]/operations` page serves as a **high-level dashboard and planning area**. Its purpose is to:
- View the overall job summary.
- Plan and sequence the manufacturing operations.
- Run the auto-scheduler.
- Provide a quick, read-only overview of the tasks involved.

For detailed work on tasks and their associated quality forms, the correct workflow is to use the dedicated **Task Management Page** (`/jobs/[jobId]/tasks`).

This plan has been fully implemented. 