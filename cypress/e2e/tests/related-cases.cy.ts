/// <reference types="cypress" />

import CommonActionsUtility from 'cypress/page-utilities/common-actions.utility.ts';
import CasesListPage from 'cypress/page-objects/case-list.page.ts';
import CaseDetailsPage from 'cypress/page-objects/case-details.page.ts';
import CreateCaseUtility from 'cypress/page-utilities/create-case.utility.ts';
import AnswersUtility from 'cypress/page-utilities/answers.utility.ts';
import { generateRandomString } from '../../page-utilities/generate.utility.ts';

import CheckDetailsPage from 'cypress/page-objects/check-details.page.ts';
import AddDetailsPage from 'cypress/page-objects/add-details.page.ts';
import RemoveDetailsPage from 'cypress/page-objects/remove-details.page.ts';

import { shouldRunTest } from '../../page-utilities/test-tags.utility.ts';

describe('Planning Inspectorate > Overview > Related cases', () => {
	let caseURL: string;

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
		});
	});

	beforeEach(() => {
		cy.authVisit('');
		cy.visit(caseURL);
		CaseDetailsPage.isPageDisplayed(false);
		CaseDetailsPage.clearSummaryRowDetailsIfPresent('overview', 'Related case(s)');
	});

	if (shouldRunTest(['smoke', 'regression'])) {
		it('can add and remove saved related case details', () => {
			// Add
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('overview', 'Related case(s)');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withoutDetails');
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('related');
			const relatedCaseText = AddDetailsPage.enterCaseText('related');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withDetails');
			CheckDetailsPage.validateRowValues(relatedCaseText);
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview');
			CaseDetailsPage.clickBannerReturnToSection('overview');
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'withDetails', [relatedCaseText]);

			// Remove
			CaseDetailsPage.clickSummaryRowAction('overview', 'Related case(s)');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withDetails');
			CheckDetailsPage.clickAction('remove', 1);
			RemoveDetailsPage.isPageDisplayed();
			RemoveDetailsPage.selectAnswer('yes');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withoutDetails');
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview');
			CaseDetailsPage.clickBannerReturnToSection('overview');
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'noDetails');
		});
	}

	if (shouldRunTest(['regression'])) {
		it('can add and save multiple related case details + go back validation + show more validation', () => {
			// Add
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('overview', 'Related case(s)');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withoutDetails');

			// Add first
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('related');
			const relatedCaseTextOne = AddDetailsPage.enterCaseText('related', 'Test text one');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withDetails');
			CheckDetailsPage.validateRowValues(relatedCaseTextOne);

			// Add second
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('related');
			const relatedCaseTextTwo = AddDetailsPage.enterCaseText('related', 'Test text two');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withDetails');
			CheckDetailsPage.validateRowValues(relatedCaseTextTwo);

			// Add third
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('related');
			const relatedCaseTextThree = AddDetailsPage.enterCaseText('related', 'Test text two');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withDetails');
			CheckDetailsPage.validateRowValues(relatedCaseTextTwo);

			// Add but Go back
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('related');
			const relatedCaseTextfour = AddDetailsPage.enterCaseText('related', 'Test text three');
			CommonActionsUtility.clickActionButton('back');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withDetails');
			CheckDetailsPage.validateRowValues(relatedCaseTextfour, 'notExist');

			// Save
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview');
			CaseDetailsPage.clickBannerReturnToSection('overview');
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'withDetails', [
				relatedCaseTextOne,
				relatedCaseTextTwo,
				relatedCaseTextThree
			]);

			// Check show more
			CaseDetailsPage.clickShowHideAndValidate('overview', 'Related case(s)', 'show');
			CaseDetailsPage.clickShowHideAndValidate('overview', 'Related case(s)', 'hide');
		});
	}

	if (shouldRunTest(['regression'])) {
		it('can cancel an added related case > related case is not saved', () => {
			// Add
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('overview', 'Related case(s)');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withoutDetails');
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('related');
			const relatedCaseText = AddDetailsPage.enterCaseText('related');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withDetails');
			CheckDetailsPage.validateRowValues(relatedCaseText);

			// Cancel
			CommonActionsUtility.clickActionButton('cancel');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview', 'notDisplayed');
			CaseDetailsPage.validateSuccessBanner('overview', 'notDisplayed');
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'noDetails');
		});
	}

	if (shouldRunTest(['regression'])) {
		it('can change a related case', () => {
			// Add
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('overview', 'Related case(s)');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withoutDetails');
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('related');
			const relatedCaseText = AddDetailsPage.enterCaseText('related');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withDetails');
			CheckDetailsPage.validateRowValues(relatedCaseText);
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview');
			CaseDetailsPage.clickBannerReturnToSection('overview');
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'withDetails', [relatedCaseText]);

			// Change
			CaseDetailsPage.clickSummaryRowAction('overview', 'Related case(s)');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withDetails');
			CheckDetailsPage.clickAction('change', 1);
			AddDetailsPage.validateCaseText('related', relatedCaseText);
			const changedCaseText = AddDetailsPage.enterCaseText('related');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withDetails');
			CheckDetailsPage.validateRowValues(changedCaseText);
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview');
			CaseDetailsPage.clickBannerReturnToSection('overview');
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'withDetails', [changedCaseText]);
		});
	}

	if (shouldRunTest(['regression'])) {
		it('correctly shows related case error validation', () => {
			const over250Characters = generateRandomString(251);

			// Add
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('overview', 'Related case(s)');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withoutDetails');
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('related');

			// Error for required field entry
			CommonActionsUtility.clickActionButton('continue');
			AddDetailsPage.verifyErrorBanner('related', 'required');

			// Error for max field entry
			AddDetailsPage.enterCaseText('related', over250Characters);
			CommonActionsUtility.clickActionButton('continue');
			AddDetailsPage.verifyErrorBanner('related', 'maxLength');

			// Add valid value
			const relatedCaseText = AddDetailsPage.enterCaseText('related');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withDetails');
			CheckDetailsPage.validateRowValues(relatedCaseText);
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview');
			CaseDetailsPage.clickBannerReturnToSection('overview');
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'withDetails', [relatedCaseText]);
		});
	}
});
