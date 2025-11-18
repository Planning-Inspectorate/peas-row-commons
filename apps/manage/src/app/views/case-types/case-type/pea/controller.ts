import type { App2Service } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';

export function peabuildListItems(service: App2Service): AsyncRequestHandler {
    const { db, logger } = service;
    return async (req, res) => {
        logger.info('list items');

        // check the DB connection is working
        await db.$queryRaw`SELECT 1`;

        return res.render('views/case-types/case-type/pea/view.njk', {
            pageTitle: 'What Case type is it?',
            radioData: {
                name: "caseType",
                fieldset: {
                    legend: {
                        text: "What Case type is it?",
                        isPageHeading: true,
                        classes: "govuk-fieldset__legend--l"
                    }
                },
                items: [
                    {
                        value: "Drought",
                        text: "Drought"
                    },
                    {
                        value: "Housing and Planning CPOs",
                        text: "Housing and Planning CPOs",
                    
                    },
                      {
                        value: "Other Secretary of State casework",
                        text: "Other Secretary of State casework",
                    
                    },
                       {
                        value: "Purchase Notices",
                        text: "Purchase Notices",
                    
                    },
                        {
                        value: "Wayleaves",
                        text: "Wayleaves",
                    
                    }
                ]
            }
        });
    };
}


export function peahandleCaseTypeSelection(service: App2Service): AsyncRequestHandler {
    const { logger } = service;
    return async (req, res) => {
        const { caseType } = req.body;
        logger.info(`Selected case type: ${caseType}`);

        // Redirect based on selected case type
        if (caseType === 'PEA') {
            return res.redirect('/create-case/pea/pea-page');
        } else if (caseType === 'RWC') {
            return res.redirect('/create-case/rwc-page');
        } else {
            // If no selection, redirect back with error
            return res.redirect('/case-types');
        }
    };
}