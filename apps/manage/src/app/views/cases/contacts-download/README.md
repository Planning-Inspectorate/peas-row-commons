# Download Contacts (CSV)

Allows case officers to download all contacts for a case as a CSV file, so they can bulk-email people using Outlook without copying and pasting individual addresses.

This is an interim solution until the GOV.UK Notify mail integration is available.

## How it works

1. User clicks **"Download all contacts"** on the case details page (button only appears when 1+ contacts exist)
2. `GET /:id/download/contacts` hits the download contacts controller
3. Controller uses the `fetchCaseContactsForDownload` query from `query.ts`
4. All contacts (applicants/appellants, objectors, generic contacts) are mapped with their type labels
5. The `csv-builder` formats them into a CSV string and streams it back as a file download

## CSV columns

| Column | Description |
|---|---|
| Contact type | "Applicant / Appellant", "Objector", or the DB display name (e.g. "Agent") |
| First Name | Contact's first name |
| Last Name | Contact's last name |
| Joint party / company name | Organisation name |
| Address | Full address in a single cell with line breaks |
| Email address | Contact's email |
| Phone number | Contact's phone number |
| Objector status | Only populated for objectors (e.g. "Admissible") |