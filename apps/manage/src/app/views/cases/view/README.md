# Case View (Edit Case)
- This is the directory for viewing and editing an existing case.

## Architecture
- Built on the `dynamic-forms` library's Journey/Section/Question pattern.
- The journey is defined in `journey.ts` with sections: Overview, Case details, Team, Timetable, Key contacts, Outcome overview, Additional resource locations, and Invoicing.
- Dynamic sections (Procedures, Outcomes) are generated at runtime by `ProcedureSectionBuilder` and `OutcomeSectionBuilder` and spliced into the journey between the static sections.

## Data Flow
### Loading (controller.ts)
1. Case data is fetched from the DB with all relations included.
2. `caseToViewModel` flattens nested DB structures (Dates, Costs, Contacts, etc.) into a single object.
3. `combineSessionAndDbData` merges any in-progress session edits with the DB data, using `mergeArraysById` to reconcile array fields (inspectors, procedures, etc.) without duplicating items.
4. A `JourneyResponse` is created from the merged data and the journey is built.

### Saving (update-case.ts)
1. `buildUpdateCase` receives the raw answers from the form submission.
2. For procedure detail fields, flattened keys (e.g. `procedureDetails_0_hearingClosedDate`) are remapped back into the `procedureDetails` array using `remapFlattenedFieldsToArray`.
3. `mapCasePayload` routes each field to the correct handler — scalar fields go through the generic `parseDataToCorrectTable` path, while complex fields (procedures, outcomes, contacts, etc.) are handled by dedicated functions.
4. The case is updated within a transaction. The previous state is captured for audit comparison.

## Key Handlers in update-case.ts
- **`handleProcedureDetails`** — upserts procedures using frontend-generated GUIDs. Relation fields (formats, inspector) use connect/disconnect on update and connect-only on create. All dates use `toDateOrNull` to handle empty form submissions.
- **`handleOutcomes`** — similar upsert pattern for case decisions.
- **`handleContacts`** — shared handler for applicants, objectors, and generic contacts via `CONTACT_MAPPINGS`.
- **`handleAbeyancePeriod`** — maps the composite date period field to individual start/end dates.
- **`updateClosedDate`** — automatically sets/clears `closedDate` based on status changes.

## Remove and Save
- Optional fields have a "Remove and save" button that clears the value.
- The remove route (`/:section/:question/remove`) must be registered above the generic edit route to avoid being shadowed by Express route matching.
- `guardEmptyRemove` middleware checks for date sub-fields (`_day`, `_month`, `_year`) to correctly identify date submissions as non-empty.
- `clearAnswer` runs before the flattened field remap so nulled values flow through correctly.

## Question Definitions (question-utils.ts)
- Questions are grouped by section: `DATE_QUESTIONS`, `CASE_DETAILS_QUESTIONS`, `OVERVIEW_QUESTIONS`, `TEAM_QUESTIONS`, `OUTCOME_QUESTIONS`, `PROCEDURE_QUESTIONS`, `KEY_CONTACTS_QUESTIONS`, etc.
- Dynamic options (inspectors, case officers, authorities) are injected at runtime via factory functions like `createTeamQuestions`, `createOutcomeQuestions`, and `createProcedureDetailQuestions`.
- The `dateQuestion` helper standardises date field creation with consistent hints, validators, and remove buttons.

## Audit Trail
- After a successful save, the previous and updated case states are compared.
- Scalar fields are diffed individually; list fields (contacts, inspectors, procedures, outcomes) use dedicated resolvers to produce add/update/delete audit entries.
- Audit recording is wrapped in try/catch so failures never block the user's save operation.

## Session Management
- Session data is cleared after each save to prevent ghost data from partially completed edits.
- `removedListItems` tracks IDs of items the user has removed via the manage list remove flow, used by `combineSessionAndDbData` to filter them out before rendering.