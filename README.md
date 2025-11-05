# PEAS / RoW Repository
This repository is for the PEAS / RoW (Horizon Replacement) service, and includes all components including the infrastructure-as-code and the applications.


## Dev Setup

To get started, ensure you Node v22 (`nvm install 22`) installed. Then run:

`npm ci`

to install all dependencies (the repo is setup with workspaces, this will install dependencies for all apps and packages).

### Environment settings

The applications require configuation to run, and these are set via environment variables. These can be set using run configurations, or using a `.env` file. There is a `.env.example` file to get started with in each app directory.


Then run each application with `npm run dev`.