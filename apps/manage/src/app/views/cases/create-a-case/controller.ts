import type { App2Service } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { createCaseWorkAreaConstant } from './constant.ts';

function renderCaseWorkArea(res, options: { errorMessage?: string; selected?: string }) {
	return res.render('views/cases/create-a-case/view.njk', {
		pageTitle: 'What area does this new case relate to?',
		radioData: {
			name: 'caseType',
			fieldset: {
				legend: {
					text: 'What area does this new case relate to?',
					isPageHeading: true,
					classes: 'govuk-fieldset__legend--l'
				}
			},
			items: createCaseWorkAreaConstant,
			selected: options.selected // keep previous selection if any
		},

		errorMessage: options.errorMessage
	});
}

export function getCreateCaseWorkArea(service: App2Service): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		logger.info('list items');

		// check the DB connection is working
		await db.$queryRaw`SELECT 1`;

		return renderCaseWorkArea(res, {}); // no error, no selected
	};
}

export function postCreateCaseWorkArea(service: App2Service): AsyncRequestHandler {
	const { logger } = service;
	return async (req, res) => {
		const { caseType } = req.body;
		logger.info(`Selected case type: ${caseType}`);

		if (!caseType) {
			// validation failed → render with error
			return renderCaseWorkArea(res, { errorMessage: 'Select the casework area', selected: caseType });
		}

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
