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
	let testData: {
		caseURL: string;
		caseReference: string;
	};

	const addRelatedCase = (value?: string): string => {
		CommonActionsUtility.clickActionButton('addDetails');
		AddDetailsPage.isPageDisplayed('related');
		const relatedCaseText = AddDetailsPage.enterCaseText('related', value);
		CommonActionsUtility.clickActionButton('continue');
		CheckDetailsPage.isPageDisplayed('relatedCases', 'withDetails');
		CheckDetailsPage.validateRowValues(relatedCaseText);

		return relatedCaseText;
	};

	before(() => {
		cy.authVisit('');
		cy.visit('/cases');
		CasesListPage.isPageDisplayed(false);
		CreateCaseUtility.createCaseByJourneyName('Planning > Wayleaves > New lines', false);

		AnswersUtility.get().then((answers) => {
			if (!answers.caseURL || !answers.caseReference) {
				throw new Error('Case URL or case reference was not captured during case creation');
			}

			testData = {
				caseURL: answers.caseURL,
				caseReference: answers.caseReference
			};
		});
	});

	beforeEach(() => {
		cy.authVisit('');
		cy.visit(testData.caseURL);
		CaseDetailsPage.isPageDisplayed(false);
		CaseDetailsPage.validateCaseReference(testData.caseReference);
		CaseDetailsPage.clearSummaryRowDetailsIfPresent('overview', 'Related case(s)');
	});

	if (shouldRunTest(['smoke', 'regression'])) {
		it('can add and remove saved related case details', () => {
			// Add
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('overview', 'Related case(s)');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withoutDetails');
			const relatedCaseText = addRelatedCase();
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
			const relatedCaseTextOne = addRelatedCase('Test text one');

			// Add second
			const relatedCaseTextTwo = addRelatedCase('Test text two');

			// Add third
			const relatedCaseTextThree = addRelatedCase('Test text three');

			// Add but Go back
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('related');
			const relatedCaseTextFour = AddDetailsPage.enterCaseText('related', 'Test text four');
			CommonActionsUtility.clickActionButton('back');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withDetails');
			CheckDetailsPage.validateRowValues(relatedCaseTextFour, 'notExist');

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

		it('can cancel an added related case > related case is not saved', () => {
			// Add
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('overview', 'Related case(s)');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withoutDetails');
			addRelatedCase();

			// Cancel
			CommonActionsUtility.clickActionButton('cancel');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview', 'notDisplayed');
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'noDetails');
		});

		it('can change a related case', () => {
			// Add
			CaseDetailsPage.validateSummaryRow('overview', 'Related case(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('overview', 'Related case(s)');
			CheckDetailsPage.isPageDisplayed('relatedCases', 'withoutDetails');
			const relatedCaseText = addRelatedCase();
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
