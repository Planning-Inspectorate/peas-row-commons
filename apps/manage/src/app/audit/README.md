# Audit
- This is the directory for the case history audit system, responsible for recording and displaying all actions performed on a case.

## How it works
- Every significant action (field change, file upload, contact added, etc.) produces one or more `AuditEntry` objects which are persisted to the `CaseHistory` table.
- Events are displayed on the case history page as a paginated table with date/time, details, and user columns.

## Service (`service.ts`)
- `buildAuditService` creates a singleton service with four methods:
  - `record()` — persists a single audit event. Fire-and-forget safe.
  - `recordMany()` — persists multiple events in a single transaction to avoid deadlocks (e.g. bulk file moves, case updates with many field changes).
  - `getAllForCase()` — retrieves paginated events, newest first.
  - `getLastModifiedInfo()` — returns formatted last-modified date/user for the case summary card.
- All methods are wrapped in try/catch so audit failures never break the user's operation.

## Actions & Templates (`actions.ts`)
- `AUDIT_ACTIONS` defines all possible action types as a const object.
- `AUDIT_TEMPLATES` maps each action to a human-readable template string with `{placeholder}` syntax (e.g. `'{fieldName} was updated from {oldValue} to {newValue}'`).
- `resolveTemplate()` replaces placeholders with values from the event's metadata at display time. Unknown placeholders are left as-is for visibility during development.

## Types (`types.ts`)
- `AuditEntry` — input for recording an event. Metadata is a loose key-value bag intentionally — different actions need different data and we avoid schema migrations for each new audit type.
- `AuditEvent` — an event as returned from the database, with parsed metadata.
- `AuditQueryOptions` — pagination options (`skip`, `take`).

## Recording pattern
- Scalar field changes produce `FIELD_SET`, `FIELD_UPDATED`, or `FIELD_CLEARED` depending on whether the old/new value is empty.
- List fields (contacts, inspectors, procedures, outcomes) use dedicated resolvers that diff the previous and current arrays to produce add/update/delete entries.
- `recordMany()` is preferred over multiple `record()` calls to batch everything in one transaction.

## Examples

### Recording a single event
```typescript
await audit.record({
    caseId: 'case-123',
    action: AUDIT_ACTIONS.FIELD_UPDATED,
    userId: 'user-456',
    metadata: {
        fieldName: 'Case name',
        oldValue: 'Old Name',
        newValue: 'New Name'
    }
});
// Produces: "Case name was updated from Old Name to New Name"
```

### Recording a field being set for the first time
```typescript
await audit.record({
    caseId: 'case-123',
    action: AUDIT_ACTIONS.FIELD_SET,
    userId: 'user-456',
    metadata: {
        fieldName: 'Priority',
        newValue: 'High'
    }
});
// Produces: "Priority was set to High"
```

### Recording a field being cleared
```typescript
await audit.record({
    caseId: 'case-123',
    action: AUDIT_ACTIONS.FIELD_CLEARED,
    userId: 'user-456',
    metadata: {
        fieldName: 'Start date',
        oldValue: '15 March 2025'
    }
});
// Produces: "Start date (15 March 2025) was removed"
```

### Recording multiple events in one transaction
```typescript
await audit.recordMany([
    {
        caseId: 'case-123',
        action: AUDIT_ACTIONS.PROCEDURE_ADDED,
        userId: 'user-456',
        metadata: { procedureName: 'Hearing' }
    },
    {
        caseId: 'case-123',
        action: AUDIT_ACTIONS.PROCEDURE_ADDED,
        userId: 'user-456',
        metadata: { procedureName: 'Site Visit' }
    }
]);
// Produces two entries:
//   "Hearing was added to procedure(s)."
//   "Site Visit was added to procedure(s)."
```

### Recording a file upload
```typescript
await audit.record({
    caseId: 'case-123',
    action: AUDIT_ACTIONS.FILE_UPLOADED,
    userId: 'user-456',
    metadata: {
        fileName: 'report.pdf',
        folderName: 'Evidence'
    }
});
// Produces: "report.pdf was uploaded to Evidence"
```

### Recording bulk file actions
```typescript
await audit.record({
    caseId: 'case-123',
    action: AUDIT_ACTIONS.FILES_DELETED,
    userId: 'user-456',
    metadata: {
        files: ['report.pdf', 'photo.jpg', 'map.png']
    }
});
// Produces: "Files were removed"
// The file list is rendered as a collapsible show/hide in the template
```

### Adding a new audit action
1. Add the action key to `AUDIT_ACTIONS`:
```typescript
WIDGET_CREATED: 'WIDGET_CREATED',
```
2. Add the template to `AUDIT_TEMPLATES`:
```typescript
[AUDIT_ACTIONS.WIDGET_CREATED]: '{widgetName} was created in {folderName}',
```
3. Record it with the matching metadata keys:
```typescript
await audit.record({
    caseId: 'case-123',
    action: AUDIT_ACTIONS.WIDGET_CREATED,
    userId: 'user-456',
    metadata: {
        widgetName: 'My Widget',
        folderName: 'Widgets'
    }
});
// Produces: "My Widget was created in Widgets"
```