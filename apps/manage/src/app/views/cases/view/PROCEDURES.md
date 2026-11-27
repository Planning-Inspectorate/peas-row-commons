# Procedures

- Dynamic procedure management is part of the case view journey.

## Overview

- Procedures are a dynamic, unlimited list of items (Hearing, Inquiry, Admin, Written Reps, Site Visit) that can be added to a case.
- Each procedure has a type, status, optional inspector, and type-specific detail fields (dates, venues, metrics).
- `getDynamicProcedureSections` generates one summary section per supported procedure on the case details page.

## Adding Procedures

- Procedures are added via a manage list flow with 5 steps: Type → Admin type (conditional) → Site visit type (conditional) → Inspector (conditional) → Status.
- The inspector step is skipped for Admin (In house) + Case Officer procedures.
- "Not allocated yet" is available as an inspector option. This value (`not-allocated`) cannot be stored in the DB as `inspectorId` is a foreign key to the `User` table, so the inspector relation is left unset or disconnected and mapped back to `not-allocated` on read.

## Dynamic Sections

- `getDynamicProcedureSections` in `journeys/procedure-journey.ts` creates a dynamic-forms `DynamicSection` for each supported procedure. Unrecognised procedure types do not produce a section.
- Each section is titled `<Type> (<Status>)` e.g. "Hearing (Active)"; the status is omitted when unavailable.
- Questions use their ordinary field names within the `procedureDetails` dynamic section.
- The section segment is the procedure ID and is used for routing edit and remove URLs.

## Type-Specific Field Filtering

- Type-specific section functions explicitly add the relevant questions from `questions-procedure.ts`.
- Shared questions such as `siteVisitDate` are added to each applicable section.
- `PROCEDURE_TYPE_FIELD_MAP` and `getUniqueProcedureFields` are used to select fields for case downloads, not to build dynamic sections.

## Create-Flow vs Detail Fields

- Create-flow fields (`procedureTypeId`, `procedureStatusId`, `adminProcedureType`, `inspectorId`) are shown on the case details summary but are **not editable** from there — the user must go through the manage list "Change" link.
- Detail fields (dates, venues, metrics) are editable directly from the case details page via "Change" links that route to `<procedure-id>/<field-url>`.
- `siteVisitTypeId` is a special case: non-editable for Site Visit procedures (create-flow), editable for all other supported types (detail field). Each dynamic section includes one question, with editability set according to the procedure type.

## Ordering

- Procedures are sorted chronologically by `createdDate` (ascending).
- When two procedures share the same `createdDate`, Site Visit procedures are pushed to the top.
- `sortProceduresChronologically` is used when mapping procedures for display. Dynamic-section saves identify the procedure by ID, not array index.

## Saving & Persistence

- Manage-list submissions are normalised and compared with existing procedures by `handleProcedureManageListEdits`, which creates explicit create, update, and delete operations for manage-list fields.
- Dynamic-section submissions are wrapped with the procedure ID and handled by `handleProcedureDynamicSectionEdits`, which updates only submitted fields.
- Relation fields (e.g. `HearingFormat`, `ConferenceFormat`) use `connect` or `disconnect` on update, to support "Remove and save" functionality; submitted venue addresses use upsert.
- Scalar date fields use `toDateOrNull` to safely handle empty or invalid date submissions from the form.
- Procedures absent from a manage-list submission are deleted by ID; dynamic-section edits do not add or remove procedures.

## Remove and Save

- Detail fields have a "Remove and save" button that clears the value.
- The remove route (`/:section/:question/remove`) invokes the update handler with `clearAnswer` enabled.
- `clearAnswer` must run **before** dynamic-section answers are wrapped into `procedureDetails` so that the nulled value flows through to `handleProcedureUpdates`.

## Inspector Display Logic

- Real inspector ID → displays the inspector's name (resolved via radio options)
- `not-allocated` / `null` → displays "Not allocated yet" on the case details summary cards
- Admin (In house) + Case Officer → displays "N/A" in the check procedure details table (inspector question was never shown)
