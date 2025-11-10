# PEAS / RoW Repository
This repository is for the PEAS / RoW (Horizon Replacement) service, and includes all components including the infrastructure-as-code and the applications.


## Dev Setup

To get started, ensure you Node v22 (`nvm install 22`) installed. Then run:

`npm ci`

to install all dependencies (the repo is setup with workspaces, this will install dependencies for all apps and packages).

### Environment settings

The applications require configuation to run, and these are set via environment variables. These can be set using run configurations, or using a `.env` file. There is a `.env.example` file to get started with in each app directory.


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