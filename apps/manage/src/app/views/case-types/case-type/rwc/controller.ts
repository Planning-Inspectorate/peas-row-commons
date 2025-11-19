import type { App2Service } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';

export function rwcbuildListItems(service: App2Service): AsyncRequestHandler {
    const { db, logger } = service;
    return async (req, res) => {
        logger.info('list items');

        // check the DB connection is working
        await db.$queryRaw`SELECT 1`;

        return res.render('views/case-types/case-type/rwc/view.njk', {
            pageTitle: 'Which Case type is it?',
            radioData: {
                name: "caseType",
                fieldset: {
                    legend: {
                        text: "Which Case type is it?",
                        isPageHeading: true,
                        classes: "govuk-fieldset__legend--l"
                    }
                },
                items: [
                    {
                        value: "Coastal Access",
                        text: "Coastal Access"
                    },
                    {
                        value: "Common Land",
                        text: "Common Land",
                    
                    },
                      {
                        value: "Rights of Way",
                        text: "Rights of Way",
                    
                    }
                ]
            }
        });
    };
}


export function rwchandleCaseTypeSelection(service: App2Service): AsyncRequestHandler {
    const { logger } = service;
    return async (req, res) => {
        const { caseType } = req.body;
        logger.info(`Selected case type: ${caseType}`);

        // Redirect based on selected case type
        if (caseType === 'PEA') {
            return res.redirect('/create-case/rwc/pea-page');
        } else if (caseType === 'RWC') {
            return res.redirect('/create-case/rwc-page');
        } else {
            // If no selection, redirect back with error
            return res.redirect('/case-types');
        }
    };
}