# Case Download

Generates a downloadable zip file of a case for offline use by inspectors. When a user clicks **"Download this case"** on the case details page, this module fetches all case data, generates three PDFs, downloads all case documents from Azure Blob Storage, and streams everything back as a single zip file.

## Zip contents

```
{CaseReference}_Download/
├── Case details.pdf          ← Full case summary (all sections except notes & history)
├── Objector list.pdf         ← Table of all objectors
├── Contact list.pdf          ← Table of all non-objector/non-applicant contacts
└── Documents/
    ├── {FolderName}/         ← One subfolder per case folder
    │   └── uploaded-file.pdf
    └── {AnotherFolder}/
        └── another-file.docx
```

## How it works

1. **Route** — `GET /:id/download` registered in `cases/view/index.ts`
2. **Controller** (`download-controller.ts`) — orchestrates the full flow
3. **Query** (`query.ts`) — single Prisma query fetching everything needed (excludes notes & history)
4. **Mappers** (`mappers.ts`) — transform Prisma data into typed objects for each PDF template
6. **PDF generation** (`generate-pdf.ts`) — Puppeteer converts HTML → PDF buffer
7. **Browser** (`browser-manager.ts`) — lazy singleton Puppeteer instance, launches on first download
8. **Zip builder** (`zip-builder.ts`) — streams PDFs + blob documents into a zip via `archiverFactory`
9. **Audit** — records `CASE_DOWNLOADED` in case history when the stream finishes successfully

## File structure

```
case-download/
├── index.ts                  # Barrel export
├── download-controller.ts    # Main orchestrator
├── browser-manager.ts        # Lazy Puppeteer browser lifecycle
├── generate-pdf.ts           # HTML → PDF buffer via Puppeteer
├── query.ts                  # Prisma query for case download data
├── mappers.ts                # Data transformation (DB → template shapes)
├── zip-builder.ts            # Streams zip to HTTP response
├── types.ts                  # All TypeScript interfaces
└── views/
    ├── pdf-base.njk          # Shared GOV.UK-styled base layout
    ├── case-details.njk      # Case details PDF (all sections)
    ├── objector-list.njk     # Objector list PDF
    └── contact-list.njk      # Contact list PDF
```

## Dependencies

- `puppeteer` — headless browser for PDF generation (lazy-launched on first use)
- `date-fns` — date formatting in templates
- `archiver` — zip streaming (via `archiverFactory` from `ManageService`, already used by document downloads)

## Key design decisions

- **Lazy browser** — Puppeteer only launches when someone first clicks download, not on app startup. Stays alive for reuse, auto-relaunches if it crashes.
- **Streaming** — the zip is piped directly to the HTTP response, so large cases with many documents don't need to be held entirely in memory.
- **Resilient document fetching** — if a single blob download fails, it's skipped and logged. The rest of the zip still downloads successfully.