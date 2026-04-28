# PEAS / RoW Repository
This repository is for the PEAS / RoW (Horizon Replacement) service, and includes all components including the infrastructure-as-code and the applications.

## Documentation
 
### Case Management (Edit Case)
- [Case View (Edit Case)](apps/manage/src/app/views/cases/view/README.md) — loading, saving, session management, and audit trail for the case details page
### Procedures & Outcomes
- [Procedure Section Builder](packages/lib/util/dynamic-sections/procedures-section/README.md) — dynamic procedure management, inspector allocation, and type-specific fields
- [Dynamic Section Builder](packages/lib/util/dynamic-sections/README.md) — base class for generating summary sections from manage list data
- [Outcome Section Builder](packages/lib/util/dynamic-sections/outcomes-section/README.md) — outcome-specific section generation with originator formatting
### File Management
- [Case Folders](apps/manage/src/app/views/cases/case-folders/README.md) — folder creation, renaming, deletion, and nested structure
- [File Upload](apps/manage/src/app/views/cases/upload/README.md) — blob storage, draft documents, and committing
- [Move Files](apps/manage/src/app/views/cases/move-file/README.md) — moving files between folders with nested radio selection
- [Documents](apps/manage/src/app/views/documents/README.md) — downloading, deleting, read/flagged status
### Audit
- [Business](apps/manage/src/app/audit/README.md)
- [View](apps/manage/src/app/views/cases/case-history/README.md)
- [Resolvers](apps/manage/src/app/audit/resolvers/README.md)
### Download
- [Case Download](apps/manage/src/app/views/cases/case-download/README.md) - Download a case
- [Contact Download](apps/manage/src/app/views/cases/contacts-download/README.md) - Case Contacts download
### Packages
- [Blob Store](packages/lib/blob-store/README.md) — Azure blob storage singleton and local development setup
- [Utils](packages/lib/util/README.md) — shared utility modules including search
### Other
- [Infrastructure](infrastructure/README.md) — shared utility modules including search


## Dev Setup

To get started, ensure you Node v22 (`nvm install 22`) installed. Then run:

`npm ci`

to install all dependencies (the repo is setup with workspaces, this will install dependencies for all apps and packages).

### Environment settings

The applications require configuation to run, and these are set via environment variables. These can be set using run configurations, or using a `.env` file. There is a `.env.example` file to get started with in each app directory.

#### Environment variables
- `AUTH_GROUP_APPLICATION_ACCESS`:
    - This is the entra group for just accessing the app
- `ENTRA_GROUP_ID_ALL_USERS`, `ENTRA_GROUP_ID_CASE_OFFICERS`, `ENTRA_GROUP_ID_INSPECTORS`:
    - These are the 3 groups for MPESC, for localy development you should use the application access group for all 3 for ease.
- `SQL_CONNECTION_STRING`
    - This is the string used for local development to point to the SQL database
- `BLOB_STORE_CONNECTION_STRING`
    - This is the generic connection string provided by azure for local blob store development
- `CHROMIUM_LOCAL_PATH`
    - This should be a path to your local version of Chrome or Firefox or whatever you use, it is needed for the running of the download case feature.

### Database Setup

A SQL Server database server is required for the applications to run. This will start automatically with docker compose. However it is required to migrate and seed the database which can be done from scripts in the database package.

First, make sure you have a `.env` file in `./packages/database` (you can copy the `.env.example`) and it has `SQL_CONNECTION_STRING` and `SQL_CONNECTION_STRING_ADMIN` environment variables defined with details pointing to your local database server (`mssql` Docker container). These values will/can be the same for local development (admin is used for migrations, the other one for the seeding).

To set up the SQL Server with tables and some data, you will need to run the following commands (whilst the SQL Server Docker container is running using `docker compose up`. Alternatively, you can run the Docker container called 'mssql' manually using the Docker interface):

```shell
npm run db-generate
npm run db-migrate-dev
npm run db-seed 
```

Then run each application with `npm run dev`.