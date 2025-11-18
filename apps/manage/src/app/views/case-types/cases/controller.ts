import type { App2Service } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';

export function buildListItems(service: App2Service): AsyncRequestHandler {
    const { db, logger } = service;
    return async (req, res) => {
        logger.info('list items');

        // check the DB connection is working
        await db.$queryRaw`SELECT 1`;

        return res.render('views/case-types/cases/view.njk', {
            pageTitle: 'What is your Case work type?',
            radioData: {
                name: "caseType",
                fieldset: {
                    legend: {
                        text: "What is your Case work type?",
                        isPageHeading: true,
                        classes: "govuk-fieldset__legend--l"
                    }
                },
                items: [
                    {
                        value: "PEA",
                        text: "Planning,Environment and Applications"
                    },
                    {
                        value: "RWC",
                        text: "Right of Way Case type"
                    }]
            }
        });
    };
}


export function handleCaseTypeSelection(service: App2Service): AsyncRequestHandler {
    const { logger } = service;
    return async (req, res) => {
        const { caseType } = req.body;
        logger.info(`Selected case type: ${caseType}`);

        // Redirect based on selected case type
         if (caseType === 'PEA') {
            return res.redirect('/create-case/pea-page');
        } else if (caseType === 'RWC') {
            return res.redirect('/create-case/rwc-page');
        } else {
            // If no selection, redirect back with error
            return res.redirect('/case-types');
        }
    };
}