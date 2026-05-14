/// <reference types="cypress" />

import CasesListPage from 'cypress/page-objects/case-list.page.ts';
import CaseDetailsPage from 'cypress/page-objects/case-details.page.ts';

import CreateCaseUtility from 'cypress/page-utilities/create-case.utility.ts';
import AnswersUtility from 'cypress/page-utilities/answers.utility.ts';
import DownloadsUtility from 'cypress/page-utilities/downloads.utility.ts';

import { shouldRunTest } from '../../page-utilities/test-tags.utility.ts';

describe('Planning Inspectorate > Case downloads', () => {
	let caseURL: string;
	let caseReference: string;

	before(() => {
		cy.authVisit('');
		cy.visit('/cases');
		CasesListPage.isPageDisplayed(false);
		CreateCaseUtility.createCaseByJourneyName('Planning > Wayleaves > New lines', false);

		AnswersUtility.get().then((answers) => {
			if (!answers.caseURL || !answers.caseReference) {
				throw new Error('Case URL or case reference was not captured during case creation');
			}

			caseURL = answers.caseURL;
			caseReference = answers.caseReference;
		});
	});

	beforeEach(() => {
		cy.authVisit('');
		cy.visit(caseURL);
		CaseDetailsPage.isPageDisplayed(false);
	});

	if (shouldRunTest(['smoke', 'regression'])) {
		it('downloads the case', () => {
			CaseDetailsPage.clickCaseAction('downloadCase');
			DownloadsUtility.validateDownloadedFile('case', caseReference);
		});
	}

	// Room to expand checks on files uploaded appearing
	// in the download case ZIP archive.
	// if (shouldRunTest(['regression'])) {
	// 	it('downloads the case > Manage files', () => {
	// 		CaseDetailsPage.clickCaseAction('downloadCase');
	//
	// 		DownloadsUtility.validateDownloadedFile(
	// 			'case',
	// 			caseReference
	// 		);
	// 	});
	// }

	if (shouldRunTest(['smoke', 'regression'])) {
		it('downloads the contacts', () => {
			CaseDetailsPage.clickCaseAction('downloadContacts');
			DownloadsUtility.validateDownloadedFile('contacts', caseReference);
		});
	}
});
