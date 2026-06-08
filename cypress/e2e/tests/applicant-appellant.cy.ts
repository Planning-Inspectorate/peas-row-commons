/// <reference types="cypress" />

import type { CaseAnswers } from 'cypress/types/answers.ts';

import CommonActionsUtility from 'cypress/page-utilities/common-actions.utility.ts';
import CasesListPage from 'cypress/page-objects/case-list.page.ts';
import CaseDetailsPage from 'cypress/page-objects/case-details.page.ts';
import WhoAppellantObjectorPage from '../../page-objects/who-appellant-objector.page.ts';
import AddressUtility from 'cypress/page-utilities/address.utility.ts';
import AddressPage from 'cypress/page-objects/address-details.page.ts';
import ContactDetailsPage from 'cypress/page-objects/contact-details.page.ts';
import CreateCaseUtility from 'cypress/page-utilities/create-case.utility.ts';
import AnswersUtility from 'cypress/page-utilities/answers.utility.ts';
import { generateRandomString } from '../../page-utilities/generate.utility.ts';

import CheckDetailsPage from 'cypress/page-objects/check-details.page.ts';
import RemoveDetailsPage from 'cypress/page-objects/remove-details.page.ts';

import { shouldRunTest } from '../../page-utilities/test-tags.utility.ts';

describe('Planning Inspectorate > Overview > Applicant or appellant', () => {
	let caseURL: string;
	let applicant: NonNullable<CaseAnswers['applicants']>[number];

	before(() => {
		cy.authVisit('');
		cy.visit('/cases');
		CasesListPage.isPageDisplayed(false);
		CreateCaseUtility.createCaseByJourneyName('Rights of Way > Rights of Way > Opposed (DMMO)', false);

		AnswersUtility.get().then((answers) => {
			if (!answers.caseURL || !answers.caseReference || !answers.applicants?.[0]) {
				throw new Error('Case URL, case reference or applicant was not captured during case creation');
			}

			caseURL = answers.caseURL;
			applicant = answers.applicants[0];
		});
	});

	beforeEach(() => {
		cy.authVisit('');
		cy.visit(caseURL);
		CaseDetailsPage.isPageDisplayed(false);
		CaseDetailsPage.clearSummaryRowDetailsIfPresent('case-details', 'Applicant or appellant');
	});

	if (shouldRunTest(['smoke', 'regression'])) {
		it('can add and remove second applicant or appellant details', () => {
			CaseDetailsPage.validateSummaryRowCount('case-details', 'Applicant or appellant', 1);
			CaseDetailsPage.validateSummaryRow(
				'case-details',
				'Applicant or appellant',
				'withDetails',
				[applicant.firstName, applicant.lastName, applicant.orgName].filter((value): value is string => Boolean(value))
			);

			// Add second
			CaseDetailsPage.clickSummaryRowAction('case-details', 'Applicant or appellant');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');
			CheckDetailsPage.validateRowValues(
				[applicant.firstName, applicant.lastName, applicant.orgName].filter((value): value is string => Boolean(value)),
				'exists',
				1
			);
			CommonActionsUtility.clickActionButton('addDetails');
			WhoAppellantObjectorPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellant = WhoAppellantObjectorPage.enterFirstLastAndCompany('applicantAppellant');
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantAddress = AddressUtility.enterAddress();
			CommonActionsUtility.clickActionButton('continue');
			ContactDetailsPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantContact = ContactDetailsPage.enterContactDetails('applicantAppellant');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');
			CheckDetailsPage.validateRowValues([
				applicantAppellant.firstName,
				applicantAppellant.lastName,
				applicantAppellant.companyName,
				applicantAppellantAddress.line1,
				applicantAppellantAddress.line2,
				applicantAppellantAddress.town,
				applicantAppellantAddress.county,
				applicantAppellantAddress.postcode,
				applicantAppellantContact.email,
				applicantAppellantContact.phone
			]);

			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('case-details');
			CaseDetailsPage.clickBannerReturnToSection('case-details');
			CaseDetailsPage.validateSummaryRowCount('case-details', 'Applicant or appellant', 2);
			CaseDetailsPage.validateSummaryRow('case-details', 'Applicant or appellant', 'withDetails', [
				applicantAppellant.firstName,
				applicantAppellant.lastName,
				applicantAppellant.companyName,
				applicantAppellantAddress.line1,
				applicantAppellantAddress.line2,
				applicantAppellantAddress.town,
				applicantAppellantAddress.county,
				applicantAppellantAddress.postcode,
				applicantAppellantContact.email,
				applicantAppellantContact.phone
			]);

			// Remove
			CaseDetailsPage.clickSummaryRowAction('case-details', 'Applicant or appellant');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');
			CheckDetailsPage.clickAction('remove', 1);
			RemoveDetailsPage.isPageDisplayed();
			RemoveDetailsPage.selectAnswer('yes');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('case-details');
			CaseDetailsPage.clickBannerReturnToSection('case-details');
			CaseDetailsPage.validateSummaryRowCount('case-details', 'Applicant or appellant', 1);
		});
	}

	if (shouldRunTest(['regression'])) {
		it('can add and save multiple applicant or appellants + go back validation', () => {
			// First has been added when creating the case
			CaseDetailsPage.validateSummaryRowCount('case-details', 'Applicant or appellant', 1);

			// Add second
			CaseDetailsPage.clickSummaryRowAction('case-details', 'Applicant or appellant');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');
			CommonActionsUtility.clickActionButton('addDetails');
			WhoAppellantObjectorPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantTwo = WhoAppellantObjectorPage.enterFirstLastAndCompany('applicantAppellant');
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantAddressTwo = AddressUtility.enterAddress();
			CommonActionsUtility.clickActionButton('continue');
			ContactDetailsPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantContactTwo = ContactDetailsPage.enterContactDetails('applicantAppellant');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');
			CheckDetailsPage.validateRowValues([
				applicantAppellantTwo.firstName,
				applicantAppellantTwo.lastName,
				applicantAppellantTwo.companyName,
				applicantAppellantAddressTwo.line1,
				applicantAppellantAddressTwo.line2,
				applicantAppellantAddressTwo.town,
				applicantAppellantAddressTwo.county,
				applicantAppellantAddressTwo.postcode,
				applicantAppellantContactTwo.email,
				applicantAppellantContactTwo.phone
			]);

			// Add but go back from who is the applicant
			CommonActionsUtility.clickActionButton('addDetails');
			WhoAppellantObjectorPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantThree = WhoAppellantObjectorPage.enterFirstLastAndCompany('applicantAppellant');
			CommonActionsUtility.clickActionButton('back');
			CheckDetailsPage.validateRowValues(
				[applicantAppellantThree.firstName, applicantAppellantThree.lastName, applicantAppellantThree.companyName],
				'notExist'
			);

			// Add but go back from contact
			CommonActionsUtility.clickActionButton('addDetails');
			WhoAppellantObjectorPage.isPageDisplayed('applicantAppellant', true);
			WhoAppellantObjectorPage.enterFirstLastAndCompany('applicantAppellant', {
				firstName: applicantAppellantThree.firstName,
				lastName: applicantAppellantThree.lastName,
				companyName: applicantAppellantThree.companyName
			});
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('applicantAppellant', true);
			CommonActionsUtility.clickActionButton('continue');
			ContactDetailsPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantContactThree = ContactDetailsPage.enterContactDetails('applicantAppellant');
			CommonActionsUtility.clickActionButton('back');
			AddressPage.isPageDisplayed('applicantAppellant', true);
			CommonActionsUtility.clickActionButton('back');
			WhoAppellantObjectorPage.isPageDisplayed('applicantAppellant', true);
			CommonActionsUtility.clickActionButton('back');
			CheckDetailsPage.validateRowValues(
				[applicantAppellantThree.firstName, applicantAppellantThree.lastName, applicantAppellantThree.companyName],
				'exists'
			);
			CheckDetailsPage.validateRowValues(
				[applicantAppellantContactThree.email, applicantAppellantContactThree.phone],
				'notExist'
			);

			// Save
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('case-details');
			CaseDetailsPage.clickBannerReturnToSection('case-details');
			CaseDetailsPage.validateSummaryRowCount('case-details', 'Applicant or appellant', 3);
		});
	}

	if (shouldRunTest(['regression'])) {
		it('can cancel an added Applicant or appellant > the Applicant or appellant is not saved', () => {
			// First has been added when creating the case
			CaseDetailsPage.validateSummaryRowCount('case-details', 'Applicant or appellant', 1);

			// Add second
			CaseDetailsPage.clickSummaryRowAction('case-details', 'Applicant or appellant');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');
			CommonActionsUtility.clickActionButton('addDetails');
			WhoAppellantObjectorPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantTwo = WhoAppellantObjectorPage.enterFirstLastAndCompany('applicantAppellant');
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantAddressTwo = AddressUtility.enterAddress();
			CommonActionsUtility.clickActionButton('continue');
			ContactDetailsPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantContactTwo = ContactDetailsPage.enterContactDetails('applicantAppellant');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');
			CheckDetailsPage.validateRowValues([
				applicantAppellantTwo.firstName,
				applicantAppellantTwo.lastName,
				applicantAppellantTwo.companyName,
				applicantAppellantAddressTwo.line1,
				applicantAppellantAddressTwo.line2,
				applicantAppellantAddressTwo.town,
				applicantAppellantAddressTwo.county,
				applicantAppellantAddressTwo.postcode,
				applicantAppellantContactTwo.email,
				applicantAppellantContactTwo.phone
			]);

			// Cancel
			CommonActionsUtility.clickActionButton('cancel');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('case-details', 'notDisplayed');
			CaseDetailsPage.validateSummaryRowCount('case-details', 'Applicant or appellant', 1);
		});
	}

	if (shouldRunTest(['regression'])) {
		it('can change an applicant or appellant', () => {
			// Add
			// First has been added when creating the case
			CaseDetailsPage.validateSummaryRowCount('case-details', 'Applicant or appellant', 1);

			// Add second
			CaseDetailsPage.clickSummaryRowAction('case-details', 'Applicant or appellant');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');
			CommonActionsUtility.clickActionButton('addDetails');
			WhoAppellantObjectorPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantTwo = WhoAppellantObjectorPage.enterFirstLastAndCompany('applicantAppellant');
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantAddressTwo = AddressUtility.enterAddress();
			CommonActionsUtility.clickActionButton('continue');
			ContactDetailsPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantContactTwo = ContactDetailsPage.enterContactDetails('applicantAppellant');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');
			CheckDetailsPage.validateRowValues([
				applicantAppellantTwo.firstName,
				applicantAppellantTwo.lastName,
				applicantAppellantTwo.companyName,
				applicantAppellantAddressTwo.line1,
				applicantAppellantAddressTwo.line2,
				applicantAppellantAddressTwo.town,
				applicantAppellantAddressTwo.county,
				applicantAppellantAddressTwo.postcode,
				applicantAppellantContactTwo.email,
				applicantAppellantContactTwo.phone
			]);

			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('case-details');
			CaseDetailsPage.clickBannerReturnToSection('case-details');
			CaseDetailsPage.validateSummaryRowCount('case-details', 'Applicant or appellant', 2);
			CaseDetailsPage.validateSummaryRow('case-details', 'Applicant or appellant', 'withDetails', [
				applicantAppellantTwo.firstName,
				applicantAppellantTwo.lastName,
				applicantAppellantTwo.companyName,
				applicantAppellantAddressTwo.line1,
				applicantAppellantAddressTwo.line2,
				applicantAppellantAddressTwo.town,
				applicantAppellantAddressTwo.county,
				applicantAppellantAddressTwo.postcode,
				applicantAppellantContactTwo.email,
				applicantAppellantContactTwo.phone
			]);

			// Change
			CaseDetailsPage.clickSummaryRowAction('case-details', 'Applicant or appellant');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');
			CheckDetailsPage.clickAction('change', applicantAppellantTwo.firstName);

			WhoAppellantObjectorPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantChanged = WhoAppellantObjectorPage.enterFirstLastAndCompany('applicantAppellant');
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantAddressChanged = AddressUtility.enterAddress();
			CommonActionsUtility.clickActionButton('continue');
			ContactDetailsPage.isPageDisplayed('applicantAppellant', true);
			const applicantAppellantContactChanged = ContactDetailsPage.enterContactDetails('applicantAppellant');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');
			CheckDetailsPage.validateRowValues([
				applicantAppellantChanged.firstName,
				applicantAppellantChanged.lastName,
				applicantAppellantChanged.companyName,
				applicantAppellantAddressChanged.line1,
				applicantAppellantAddressChanged.line2,
				applicantAppellantAddressChanged.town,
				applicantAppellantAddressChanged.county,
				applicantAppellantAddressChanged.postcode,
				applicantAppellantContactChanged.email,
				applicantAppellantContactChanged.phone
			]);

			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('case-details');
			CaseDetailsPage.clickBannerReturnToSection('case-details');
			CaseDetailsPage.validateSummaryRowCount('case-details', 'Applicant or appellant', 2);
			CaseDetailsPage.validateSummaryRow('case-details', 'Applicant or appellant', 'withDetails', [
				applicantAppellantChanged.firstName,
				applicantAppellantChanged.lastName,
				applicantAppellantChanged.companyName,
				applicantAppellantAddressChanged.line1,
				applicantAppellantAddressChanged.line2,
				applicantAppellantAddressChanged.town,
				applicantAppellantAddressChanged.county,
				applicantAppellantAddressChanged.postcode,
				applicantAppellantContactChanged.email,
				applicantAppellantContactChanged.phone
			]);

			// Go back into spplicant or appellant details and check details
			CaseDetailsPage.clickSummaryRowAction('case-details', 'Applicant or appellant');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');
			CheckDetailsPage.validateRowValues([
				applicantAppellantChanged.firstName,
				applicantAppellantChanged.lastName,
				applicantAppellantChanged.companyName,
				applicantAppellantAddressChanged.line1,
				applicantAppellantAddressChanged.line2,
				applicantAppellantAddressChanged.town,
				applicantAppellantAddressChanged.county,
				applicantAppellantAddressChanged.postcode,
				applicantAppellantContactChanged.email,
				applicantAppellantContactChanged.phone
			]);
		});
	}

	if (shouldRunTest(['regression'])) {
		it('correctly shows applicant or appellant error validations', () => {
			const over250Characters = generateRandomString(251);
			CaseDetailsPage.validateSummaryRowCount('case-details', 'Applicant or appellant', 1);

			// Add second
			CaseDetailsPage.clickSummaryRowAction('case-details', 'Applicant or appellant');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');
			CommonActionsUtility.clickActionButton('addDetails');

			// Error for add at least one field
			WhoAppellantObjectorPage.isPageDisplayed('applicantAppellant', true);
			CommonActionsUtility.clickActionButton('continue');
			WhoAppellantObjectorPage.verifyErrorBanner('applicantAppellant', 'required');

			// Error for max field entry
			WhoAppellantObjectorPage.enterFirstName('applicantAppellant', over250Characters);
			WhoAppellantObjectorPage.enterLastName('applicantAppellant', over250Characters);
			CommonActionsUtility.clickActionButton('continue');
			WhoAppellantObjectorPage.verifyErrorBanner('applicantAppellant', ['firstNameTooLong', 'lastNameTooLong']);
			WhoAppellantObjectorPage.enterFirstLastAndCompany('applicantAppellant');
			CommonActionsUtility.clickActionButton('continue');

			// Errors for address postcode field entry
			AddressPage.isPageDisplayed('applicantAppellant', false);
			AddressUtility.enterAddress(
				{
					postcode: 'bAdP0stCode'
				},
				false
			);
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('applicantAppellant', false);
			AddressUtility.validateAddressErrors('postcodeLength');
			AddressUtility.enterAddress(
				{
					postcode: '^3626g'
				},
				false
			);
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('applicantAppellant', false);
			AddressUtility.validateAddressErrors('invalidPostcodeFormat');
			AddressUtility.enterAddress(
				{
					postcode: ''
				},
				false
			);

			// Error for address fields
			AddressUtility.enterAddress(
				{
					line1: `${over250Characters}`
				},
				false
			);
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('applicantAppellant', false);
			AddressUtility.validateAddressErrors('line1TooLong');
			AddressUtility.enterAddress(
				{
					line1: `${over250Characters}`,
					county: `${over250Characters}`
				},
				false
			);
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('applicantAppellant', false);
			AddressUtility.validateAddressErrors(['line1TooLong', 'countyTooLong']);
			AddressUtility.enterAddress(
				{
					line1: '',
					county: '',
					town: `${over250Characters}`
				},
				false
			);
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('applicantAppellant', false);
			AddressUtility.validateAddressErrors('townTooLong');
			AddressUtility.enterAddress(
				{
					town: ''
				},
				false
			);
			CommonActionsUtility.clickActionButton('continue');

			// Errors for contact details
			ContactDetailsPage.isPageDisplayed('applicantAppellant', false);
			ContactDetailsPage.enterEmail('applicantAppellant', `${over250Characters}`);
			CommonActionsUtility.clickActionButton('continue');
			ContactDetailsPage.isPageDisplayed('applicantAppellant', false);
			ContactDetailsPage.verifyErrorBanner('applicantAppellant', 'emailTooLong');

			ContactDetailsPage.enterEmail('applicantAppellant', '');
			ContactDetailsPage.enterPhoneNumber('applicantAppellant', `${over250Characters}`);
			CommonActionsUtility.clickActionButton('continue');
			ContactDetailsPage.isPageDisplayed('applicantAppellant', false);
			ContactDetailsPage.verifyErrorBanner('applicantAppellant', 'phoneTooLong');
			ContactDetailsPage.enterPhoneNumber('applicantAppellant');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails');

			// Save
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('case-details');
			CaseDetailsPage.clickBannerReturnToSection('case-details');
			CaseDetailsPage.validateSummaryRowCount('case-details', 'Applicant or appellant', 2);
		});
	}
});
