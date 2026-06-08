/// <reference types="cypress" />

import CommonActionsUtility from 'cypress/page-utilities/common-actions.utility.ts';
import CasesListPage from 'cypress/page-objects/case-list.page.ts';
import CaseDetailsPage from 'cypress/page-objects/case-details.page.ts';
import LeadCasePage from 'cypress/page-objects/lead-case.page.ts';
import CreateCaseUtility from 'cypress/page-utilities/create-case.utility.ts';
import AnswersUtility from 'cypress/page-utilities/answers.utility.ts';
import { generateRandomString } from '../../page-utilities/generate.utility.ts';

import CheckDetailsPage from 'cypress/page-objects/check-details.page.ts';
import AddDetailsPage from 'cypress/page-objects/add-details.page.ts';
import RemoveDetailsPage from 'cypress/page-objects/remove-details.page.ts';

import { shouldRunTest } from '../../page-utilities/test-tags.utility.ts';

describe('Planning Inspectorate > Overview > Linked cases', () => {
	let caseURL: string;

	before(() => {
		cy.authVisit('');
		cy.visit('/cases');
		CasesListPage.isPageDisplayed(false);
		CreateCaseUtility.createCaseByJourneyName('Rights of Way > Rights of Way > Schedule 14 Direction', false);

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
		CaseDetailsPage.clearSummaryRowDetailsIfPresent('overview', 'Linked case(s)');
	});

	if (shouldRunTest(['smoke', 'regression'])) {
		it('can add and remove saved linked case details', () => {
			// Add
			CaseDetailsPage.validateSummaryRow('overview', 'Linked case(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('overview', 'Linked case(s)');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withoutDetails');
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('linked');
			const linkedCaseText = AddDetailsPage.enterCaseText('linked');
			CommonActionsUtility.clickActionButton('continue');
			LeadCasePage.isPageDisplayed();
			LeadCasePage.selectAnswer('yes');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withDetails');
			CheckDetailsPage.validateRowValues(linkedCaseText);
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview');
			CaseDetailsPage.clickBannerReturnToSection('overview');
			CaseDetailsPage.validateSummaryRow('overview', 'Linked case(s)', 'withDetails', [`${linkedCaseText} (Lead)`]);

			// Remove
			CaseDetailsPage.clickSummaryRowAction('overview', 'Linked case(s)');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withDetails');
			CheckDetailsPage.clickAction('remove', 1);
			RemoveDetailsPage.isPageDisplayed();
			RemoveDetailsPage.selectAnswer('yes');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withoutDetails');
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview');
			CaseDetailsPage.clickBannerReturnToSection('overview');
			CaseDetailsPage.validateSummaryRow('overview', 'Linked case(s)', 'noDetails');
		});
	}

	if (shouldRunTest(['regression'])) {
		it('can add and save multiple linked case details + go back error validation + show more validation', () => {
			// Add
			CaseDetailsPage.validateSummaryRow('overview', 'Linked case(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('overview', 'Linked case(s)');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withoutDetails');

			// Add first
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('linked');
			const linkedCaseTextOne = AddDetailsPage.enterCaseText('linked', 'Test text one');
			CommonActionsUtility.clickActionButton('continue');
			LeadCasePage.isPageDisplayed();
			LeadCasePage.selectAnswer('yes');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withDetails');
			CheckDetailsPage.validateRowValues([linkedCaseTextOne, 'Yes']);

			// Add second
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('linked');
			const linkedCaseTextTwo = AddDetailsPage.enterCaseText('linked', 'Test text two');
			CommonActionsUtility.clickActionButton('continue');
			LeadCasePage.isPageDisplayed();
			LeadCasePage.selectAnswer('no');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withDetails');
			CheckDetailsPage.validateRowValues([linkedCaseTextTwo, 'No']);

			// Add but go back from details page
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('linked');
			const linkedCaseTextThree = AddDetailsPage.enterCaseText('linked', 'Test text three');
			CommonActionsUtility.clickActionButton('back');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withDetails');
			CheckDetailsPage.validateRowValues(linkedCaseTextThree, 'notExist');

			// Add but go back from lead case page
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('linked');
			const linkedCaseTextFour = AddDetailsPage.enterCaseText('linked', 'Test text four');
			CommonActionsUtility.clickActionButton('continue');
			LeadCasePage.isPageDisplayed();
			LeadCasePage.selectAnswer('yes');
			CommonActionsUtility.clickActionButton('back');
			AddDetailsPage.isPageDisplayed('linked');
			AddDetailsPage.validateCaseText('linked', linkedCaseTextFour);
			CommonActionsUtility.clickActionButton('back');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withDetails');
			CheckDetailsPage.validateRowValues([linkedCaseTextFour, '-']);

			// Error banner shown
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CheckDetailsPage.verifyErrorBanner('linkedCaseLead');

			// Change and correct
			CheckDetailsPage.clickAction('change', 3);
			AddDetailsPage.validateCaseText('linked', linkedCaseTextFour);
			CommonActionsUtility.clickActionButton('continue');
			LeadCasePage.isPageDisplayed();
			LeadCasePage.selectAnswer('yes');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withDetails');
			CheckDetailsPage.validateRowValues([linkedCaseTextFour, 'Yes']);

			// Save
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview');
			CaseDetailsPage.clickBannerReturnToSection('overview');
			CaseDetailsPage.validateSummaryRow('overview', 'Linked case(s)', 'withDetails', [
				`${linkedCaseTextOne} (Lead)`,
				linkedCaseTextTwo,
				`${linkedCaseTextFour} (Lead)`
			]);

			// Check show more
			CaseDetailsPage.clickShowHideAndValidate('overview', 'Linked case(s)', 'show');
			CaseDetailsPage.clickShowHideAndValidate('overview', 'Linked case(s)', 'hide');
		});
	}

	if (shouldRunTest(['regression'])) {
		it('can cancel an added linked case > linked case is not saved', () => {
			// Add
			CaseDetailsPage.validateSummaryRow('overview', 'Linked case(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('overview', 'Linked case(s)');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withoutDetails');
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('linked');
			const linkedCaseText = AddDetailsPage.enterCaseText('linked');
			CommonActionsUtility.clickActionButton('continue');
			LeadCasePage.isPageDisplayed();
			LeadCasePage.selectAnswer('no');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withDetails');
			CheckDetailsPage.validateRowValues(linkedCaseText);

			// Cancel
			CommonActionsUtility.clickActionButton('cancel');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview', 'notDisplayed');
			CaseDetailsPage.validateSuccessBanner('overview', 'notDisplayed');
			CaseDetailsPage.validateSummaryRow('overview', 'Linked case(s)', 'noDetails');
		});
	}

	if (shouldRunTest(['regression'])) {
		it('can change a linked case', () => {
			// Add
			CaseDetailsPage.validateSummaryRow('overview', 'Linked case(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('overview', 'Linked case(s)');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withoutDetails');
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('linked');
			const linkedCaseText = AddDetailsPage.enterCaseText('linked');
			CommonActionsUtility.clickActionButton('continue');
			LeadCasePage.isPageDisplayed();
			LeadCasePage.selectAnswer('yes');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withDetails');
			CheckDetailsPage.validateRowValues([linkedCaseText, 'Yes']);
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview');
			CaseDetailsPage.clickBannerReturnToSection('overview');
			CaseDetailsPage.validateSummaryRow('overview', 'Linked case(s)', 'withDetails', [`${linkedCaseText} (Lead)`]);

			// Change
			CaseDetailsPage.clickSummaryRowAction('overview', 'Linked case(s)');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withDetails');
			CheckDetailsPage.clickAction('change', 1);
			AddDetailsPage.validateCaseText('linked', linkedCaseText);
			const changedlinkedText = AddDetailsPage.enterCaseText('linked');
			CommonActionsUtility.clickActionButton('continue');
			LeadCasePage.isPageDisplayed();
			LeadCasePage.selectAnswer('no');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withDetails');
			CheckDetailsPage.validateRowValues(changedlinkedText);
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview');
			CaseDetailsPage.clickBannerReturnToSection('overview');
			CaseDetailsPage.validateSummaryRow('overview', 'Linked case(s)', 'withDetails', [changedlinkedText]);
		});
	}

	if (shouldRunTest(['regression'])) {
		it('correctly shows linked case error validations', () => {
			const over250Characters = generateRandomString(251);

			// Add
			CaseDetailsPage.validateSummaryRow('overview', 'Linked case(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('overview', 'Linked case(s)');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withoutDetails');
			CommonActionsUtility.clickActionButton('addDetails');
			AddDetailsPage.isPageDisplayed('linked');

			// Error for required field entry
			CommonActionsUtility.clickActionButton('continue');
			AddDetailsPage.verifyErrorBanner('linked', 'required');

			// Error for max field entry
			AddDetailsPage.enterCaseText('linked', over250Characters);
			CommonActionsUtility.clickActionButton('continue');
			AddDetailsPage.verifyErrorBanner('linked', 'maxLength');

			// Add valid value
			const linkedCaseText = AddDetailsPage.enterCaseText('linked');
			CommonActionsUtility.clickActionButton('continue');

			// Click continue without selecting lead case
			LeadCasePage.isPageDisplayed();
			CommonActionsUtility.clickActionButton('continue');
			LeadCasePage.verifyErrorBanner();

			// Select answer and continue
			LeadCasePage.selectAnswer('no');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('linkedCases', 'withDetails');
			CheckDetailsPage.validateRowValues([linkedCaseText, 'No']);
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('overview');
			CaseDetailsPage.clickBannerReturnToSection('overview');
			CaseDetailsPage.validateSummaryRow('overview', 'Linked case(s)', 'withDetails', [linkedCaseText]);
		});
	}
});
