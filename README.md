# Template Service

A template repository for creating new services. This repository includes a basic structure and configuration files covering the common aspects of a service. This includes setup such as:

- ESlint
- Commitlint
- Prettier
- Husky
- Docker
- Prisma

Generally this repo can be copied/cloned for a new project, and a few find+replace runs will get things started:

* Replace 'peas-row-commons' with the new service name in the codebase.
* Replace `app-1` with the app name, e.g. `api`
* Replace `app-2` with the app name, e.g. `web`

App 1 is given in the PINS/Public style, App 2 is given in the back office/internal style, with Entra Auth.