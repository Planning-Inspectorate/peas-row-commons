# Case History
- Displays a paginated audit log of all actions performed on a case.

## How it works
- Audit events are fetched from the database, enriched with user display names from Entra, and rendered as a table.
- Each row shows the date/time, a human-readable description of the action, and who performed it.
- Bulk file actions (upload, delete, move) include a collapsible list of affected file names.

## Pagination
- Uses the shared `getPaginationParams` / `getPaginationModel` utilities.
- Users can control results per page; the selected value persists across page navigation.

## Formatting
- Audit event descriptions are generated from templates via `resolveTemplate`, which interpolates metadata into human-readable strings.
- A set of formatting helpers (`formatDate`, `formatAddress`, `formatMonetaryValue`, etc.) standardise how values appear in the audit trail — returning `'-'` for any null or empty values.