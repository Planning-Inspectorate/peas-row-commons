# Procedures
- This is the directory for handling the dynamic procedure management on cases.

## Overview
- Procedures are a dynamic, unlimited list of items (Hearing, Inquiry, Admin, Written Reps, Site Visit) that can be added to a case.
- Each procedure has a type, status, optional inspector, and type-specific detail fields (dates, venues, metrics).
- The system uses the `ProcedureSectionBuilder` to dynamically generate one summary card per procedure on the case details page.

## Adding Procedures
- Procedures are added via a manage list flow with 5 steps: Type → Admin type (conditional) → Site visit type (conditional) → Inspector (conditional) → Status.
- The inspector step is skipped for Admin (In house) + Case Officer procedures.
- "Not allocated yet" is available as an inspector option. This value (`not-allocated`) cannot be stored in the DB as `inspectorId` is a foreign key to the `User` table, so it persists as `null` and is mapped back to `not-allocated` on read.

## Dynamic Sections
- `ProcedureSectionBuilder` extends `DynamicSectionBuilder` to generate one section per procedure.
- Each section is titled `<Type> (<Status>)` e.g. "Hearing (Active)".
- Field names are flattened using the pattern `procedureDetails_<index>_<fieldName>` to allow individual fields to be edited independently.
- The section segment follows the pattern `procedure-<n>` (1-indexed) and is used for routing edit and remove URLs.

## Type-Specific Field Filtering
- `PROCEDURE_TYPE_FIELD_MAP` defines which fields belong to each procedure type.
- Fields not listed in any type-specific list are considered "common" and display for all types (e.g. `siteVisitDate`).
- The builder filters questions per procedure, only showing fields relevant to that procedure's type.

## Create-Flow vs Detail Fields
- Create-flow fields (`procedureTypeId`, `procedureStatusId`, `adminProcedureType`, `inspectorId`) are shown on the case details summary but are **not editable** from there — the user must go through the manage list "Change" link.
- Detail fields (dates, venues, metrics) are editable directly from the case details page via "Change" links that route to `procedure-<n>/<field-url>`.
- `siteVisitTypeId` is a special case: non-editable for Site Visit procedures (create-flow), editable for all other types (detail field). This is handled via two question instances with the same `fieldName` but different URLs and inverse display conditions.

## Ordering
- Procedures are sorted chronologically by `createdDate` (ascending).
- When two procedures share the same `createdDate`, Site Visit procedures are pushed to the top.
- The same `sortProceduresChronologically` function must be used in both the display path (controller) and the save path (update-case) to ensure index consistency.

## Saving & Persistence
- Uses Prisma upsert pattern with frontend-generated GUIDs as IDs.
- Relation fields (e.g. `HearingFormat`, `ConferenceFormat`) use `connect` on create and `connect` or `disconnect` on update, to support "Remove and save" functionality.
- Scalar date fields use `toDateOrNull` to safely handle empty or invalid date submissions from the form.
- The `deleteMany: { id: { notIn: providedIds } }` pattern handles procedure removal — any procedure not in the current array is deleted.

## Remove and Save
- Detail fields have a "Remove and save" button that clears the value.
- The remove route (`/:section/:question/remove`) must be registered **above** the generic edit route in Express to avoid being shadowed.
- The `guardEmptyRemove` middleware checks for date sub- fields (`_day`, `_month`, `_year`) to avoid incorrectly treating date submissions as empty.
- `clearAnswer` must run **before** the flattened field remap so that the nulled values are picked up by the remap and flow through to `handleProcedureDetails`.

## Inspector Display Logic
- Real inspector ID → displays the inspector's name (resolved via radio options)
- `not-allocated` / `null` → displays "Not allocated yet" on the case details summary cards
- Admin (In house) + Case Officer → displays "N/A" in the check procedure details table (inspector question was never shown)