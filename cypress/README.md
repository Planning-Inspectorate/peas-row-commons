# Cypress Commands

## Run Interactive Cypress Runner

Runs the custom Cypress runner and allows selection of:
* Smoke tests
* Regression tests

Command:
```bash
npm run cypress
```
---
## Open Cypress UI

Opens the normal Cypress application.
Command:
```bash
npm run cypress:open
```
---
# Package.json Scripts
Example:
```json
{
  "scripts": {
    "cypress": "tsx cypress/scripts/cypress-runner.ts",
    "cypress:open": "cypress open"
  }
}
```
