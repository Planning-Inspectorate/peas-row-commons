# Audit Resolvers

This directory contains **resolvers** that translate raw database and form data into human-readable audit trail entries.

## Why resolvers exist

When a user saves a form, all we get is raw data — database IDs, field keys, and values. But the audit trail needs to show things like _"Act was updated from Electricity Act 1989 to Gas Act 1986"_, not _"actId was updated from electricity-1989 to gas-1986"_.

Each resolver knows how to translate one type of field from raw data into something a person can read.

## Two types of resolver

### Field resolvers (`field-resolver.ts`)

Handle simple scalar fields on the `Case` model (like act, status, priority, address, case officer). They take the old DB value and the new form value, and return display-friendly `{ oldValue, newValue }` strings.

To add a new field resolver, add an entry to the `FIELD_RESOLVERS` map in `field-resolver.ts`. Fields not in the map fall through to the default resolver, which simply stringifies the raw value.

### List resolvers

Handle one-to-many relationships (inspectors, contacts, procedures, etc.). They compare the old list to the new list and figure out what was added, removed, or changed — then produce the right audit entries for each difference.

Each entity type has its own file:

| File | Entities |
|------|----------|
| `list-field-resolver.ts` | Related cases, Linked cases |
| `contact-resolver.ts` | Applicants, Objectors, Contacts |
| `inspector-resolver.ts` | Inspectors |
| `procedure-resolver.ts` | Procedures (including detail fields, relations, venues) |
| `outcome-resolver.ts` | Outcomes / Case decisions |

## Adding audit support for a new feature

When you add a new field or entity type to the case model, you need to:

1. **Add an audit action** in `audit/actions.ts` (e.g. `MY_ENTITY_ADDED`, `MY_ENTITY_UPDATED`, `MY_ENTITY_DELETED`)
2. **Add a template** in `AUDIT_TEMPLATES` in the same file
3. **Create or update a resolver** — either add to `FIELD_RESOLVERS` for a scalar field, or create a new list resolver file for a new entity type
4. **Wire it up in `update-case.ts`** — add the resolver call in the audit section after the DB update
5. **Add the field to `LIST_FIELDS`** in `packages/lib/constants/audit.ts` if it's a list-type field (so it gets skipped by the scalar field loop)

## Diffing strategies

List resolvers use one of two diffing strategies depending on how the data is stored:

- **ID-based diffing**: Used when items have stable IDs (frontend-generated GUIDs for contacts, procedures, outcomes, or DB IDs for related/linked cases). Most reliable — handles deletions from the middle of a list correctly.
- **Identity-key diffing**: Used when items don't have stable IDs but have a natural identity (e.g. Entra user ID for inspectors). Same logic as ID-based but keyed on the identity field.

Avoid positional diffing (comparing by array index) — it produces false updates when items are removed from the middle of a list.

## Shared formatters

Common formatting functions (`formatAddress`, `formatDate`, `formatValue`, `formatNumber`) live in `packages/lib/util/audit-formatters.ts` and are shared across all resolvers.