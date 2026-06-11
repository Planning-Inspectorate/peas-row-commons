/// <reference types="cypress" />

import CommonActionsUtility from 'cypress/page-utilities/common-actions.utility.ts';
import CasesListPage from 'cypress/page-objects/case-list.page.ts';
import CaseDetailsPage from 'cypress/page-objects/case-details.page.ts';
import WhoAppellantObjectorPage from '../../page-objects/who-appellant-objector.page.ts';
import AddressUtility from 'cypress/page-utilities/address.utility.ts';
import AddressPage from 'cypress/page-objects/address-details.page.ts';
import ContactDetailsPage from 'cypress/page-objects/contact-details.page.ts';
import ObjectorStatusPage from 'cypress/page-objects/objector-status.page.ts';
import CreateCaseUtility from 'cypress/page-utilities/create-case.utility.ts';
import AnswersUtility from 'cypress/page-utilities/answers.utility.ts';
import { generateRandomString } from '../../page-utilities/generate.utility.ts';

import CheckDetailsPage from 'cypress/page-objects/check-details.page.ts';
import RemoveDetailsPage from 'cypress/page-objects/remove-details.page.ts';

import { shouldRunTest } from '../../page-utilities/test-tags.utility.ts';

type ObjectorDetails = {
	objector: ReturnType<typeof WhoAppellantObjectorPage.enterFirstLastAndCompany>;
	objectorAddress: ReturnType<typeof AddressUtility.enterAddress>;
	objectorContact: ReturnType<typeof ContactDetailsPage.enterContactDetails>;
	objectorStatus: string;
};

describe('Planning Inspectorate > Overview > Objectors', () => {
	let testData: {
		caseURL: string;
		caseReference: string;
	};

	const addObjector = (status?: 'admissible' | 'inadmissible' | 'upheld' | 'withdrawn' | 'na'): ObjectorDetails => {
		CommonActionsUtility.clickActionButton('addDetails');
		WhoAppellantObjectorPage.isPageDisplayed('objector', true);
		const objector = WhoAppellantObjectorPage.enterFirstLastAndCompany('objector');
		CommonActionsUtility.clickActionButton('continue');
		AddressPage.isPageDisplayed('objector', true);
		const objectorAddress = AddressUtility.enterAddress();
		CommonActionsUtility.clickActionButton('continue');
		ContactDetailsPage.isPageDisplayed('objector', true);
		const objectorContact = ContactDetailsPage.enterContactDetails('objector');
		CommonActionsUtility.clickActionButton('continue');
		ObjectorStatusPage.isPageDisplayed();
		const objectorStatus = ObjectorStatusPage.selectAnswer(status);
		CommonActionsUtility.clickActionButton('continue');
		CheckDetailsPage.isPageDisplayed('objectors', 'withDetails');
		CheckDetailsPage.validateRowValues([
			objector.firstName,
			objector.lastName,
			objector.companyName,
			objectorAddress.line1,
			objectorAddress.line2,
			objectorAddress.town,
			objectorAddress.county,
			objectorAddress.postcode,
			objectorContact.email,
			objectorContact.phone,
			objectorStatus
		]);

		return {
			objector,
			objectorAddress,
			objectorContact,
			objectorStatus
		};
	};

	before(() => {
		cy.authVisit('');
		cy.visit('/cases');
		CasesListPage.isPageDisplayed(false);
		CreateCaseUtility.createCaseByJourneyName('Rights of Way > Rights of Way > Opposed (DMMO)', false);

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
		CaseDetailsPage.clearSummaryRowDetailsIfPresent('key-contacts', 'Objector(s)');
	});

	if (shouldRunTest(['smoke', 'regression'])) {
		it('can add and remove saved objector details', () => {
			// Add
			CaseDetailsPage.validateSummaryRow('key-contacts', 'Objector(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('key-contacts', 'Objector(s)');
			CheckDetailsPage.isPageDisplayed('objectors', 'withoutDetails');
			addObjector();
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('key-contacts');
			CaseDetailsPage.clickBannerReturnToSection('key-contacts');
			CaseDetailsPage.validateSummaryRow('key-contacts', 'Objector(s)', 'withDetails', ['1 Objector(s)']);

			// Remove
			CaseDetailsPage.clickSummaryRowAction('key-contacts', 'Objector(s)');
			CheckDetailsPage.isPageDisplayed('objectors', 'withDetails');
			CheckDetailsPage.clickAction('remove', 1);
			RemoveDetailsPage.isPageDisplayed();
			RemoveDetailsPage.selectAnswer('yes');
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('objectors', 'withoutDetails');
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('key-contacts');
			CaseDetailsPage.clickBannerReturnToSection('key-contacts');
			CaseDetailsPage.validateSummaryRow('key-contacts', 'Objector(s)', 'noDetails');
		});
	}

	if (shouldRunTest(['regression'])) {
		it('can add and save multiple objectors + go back error validation', () => {
			// Add first
			CaseDetailsPage.validateSummaryRow('key-contacts', 'Objector(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('key-contacts', 'Objector(s)');
			CheckDetailsPage.isPageDisplayed('objectors', 'withoutDetails');
			addObjector();

			// Add second
			addObjector();

			// Add but go back from who is the objector
			CommonActionsUtility.clickActionButton('addDetails');
			WhoAppellantObjectorPage.isPageDisplayed('objector', true);
			const objectorThree = WhoAppellantObjectorPage.enterFirstLastAndCompany('objector');
			CommonActionsUtility.clickActionButton('back');
			CheckDetailsPage.validateRowValues(
				[objectorThree.firstName, objectorThree.lastName, objectorThree.companyName],
				'notExist'
			);

			// Add but go back from objector address and contact
			CommonActionsUtility.clickActionButton('addDetails');
			WhoAppellantObjectorPage.isPageDisplayed('objector', true);
			WhoAppellantObjectorPage.enterFirstLastAndCompany('objector', {
				firstName: objectorThree.firstName,
				lastName: objectorThree.lastName,
				companyName: objectorThree.companyName
			});
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('objector', true);
			const objectorAddressThree = AddressUtility.enterAddress();
			CommonActionsUtility.clickActionButton('continue');
			ContactDetailsPage.isPageDisplayed('objector', true);
			const objectorContactThree = ContactDetailsPage.enterContactDetails('objector');
			CommonActionsUtility.clickActionButton('continue');
			ObjectorStatusPage.isPageDisplayed();
			const objectorStatusThree = ObjectorStatusPage.selectAnswer('upheld');
			CommonActionsUtility.clickActionButton('back');
			ContactDetailsPage.isPageDisplayed('objector', true);
			CommonActionsUtility.clickActionButton('back');
			AddressPage.isPageDisplayed('objector', true);
			CommonActionsUtility.clickActionButton('back');
			WhoAppellantObjectorPage.isPageDisplayed('objector', true);
			CommonActionsUtility.clickActionButton('back');
			CheckDetailsPage.isPageDisplayed('objectors', 'withDetails');
			CheckDetailsPage.validateRowValues([
				objectorThree.firstName,
				objectorThree.lastName,
				objectorThree.companyName,
				objectorAddressThree.line1,
				objectorAddressThree.line2,
				objectorAddressThree.town,
				objectorAddressThree.county,
				objectorAddressThree.postcode,
				objectorContactThree.email,
				objectorContactThree.phone
			]);
			CheckDetailsPage.validateRowValues([objectorStatusThree], 'notExist', 3);

			// Error banner shown
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CheckDetailsPage.verifyErrorBanner('objectorStatus');

			// Correct Status
			CheckDetailsPage.clickAction('change', 3);
			WhoAppellantObjectorPage.isPageDisplayed('objector', true);
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('objector', true);
			CommonActionsUtility.clickActionButton('continue');
			ContactDetailsPage.isPageDisplayed('objector', true);
			CommonActionsUtility.clickActionButton('continue');
			ObjectorStatusPage.isPageDisplayed();
			ObjectorStatusPage.selectAnswer('upheld');
			CommonActionsUtility.clickActionButton('continue');

			// Save
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('key-contacts');
			CaseDetailsPage.clickBannerReturnToSection('key-contacts');
			CaseDetailsPage.validateSummaryRow('key-contacts', 'Objector(s)', 'withDetails', ['3 Objector(s)']);
		});

		it('can cancel an added objector > the objector is not saved', () => {
			// Add
			CaseDetailsPage.validateSummaryRow('key-contacts', 'Objector(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('key-contacts', 'Objector(s)');
			CheckDetailsPage.isPageDisplayed('objectors', 'withoutDetails');
			addObjector();

			// Cancel
			CommonActionsUtility.clickActionButton('cancel');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('key-contacts', 'notDisplayed');
			CaseDetailsPage.validateSummaryRow('key-contacts', 'Objector(s)', 'noDetails');
		});

		it('can change an objector', () => {
			// Add
			CaseDetailsPage.validateSummaryRow('key-contacts', 'Objector(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('key-contacts', 'Objector(s)');
			CheckDetailsPage.isPageDisplayed('objectors', 'withoutDetails');
			addObjector();
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('key-contacts');
			CaseDetailsPage.clickBannerReturnToSection('key-contacts');
			CaseDetailsPage.validateSummaryRow('key-contacts', 'Objector(s)', 'withDetails', ['1 Objector(s)']);

			// Change
			CaseDetailsPage.clickSummaryRowAction('key-contacts', 'Objector(s)');
			CheckDetailsPage.isPageDisplayed('objectors', 'withDetails');
			CheckDetailsPage.clickAction('change', 1);
			WhoAppellantObjectorPage.isPageDisplayed('objector', true);
			const objectorChanged = WhoAppellantObjectorPage.enterFirstLastAndCompany('objector');
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('objector', true);
			const objectorAddressChanged = AddressUtility.enterAddress();
			CommonActionsUtility.clickActionButton('continue');
			ContactDetailsPage.isPageDisplayed('objector', true);
			const objectorContactChanged = ContactDetailsPage.enterContactDetails('objector');
			CommonActionsUtility.clickActionButton('continue');
			ObjectorStatusPage.isPageDisplayed();
			const objectorStatusChanged = ObjectorStatusPage.selectAnswer();
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('objectors', 'withDetails');
			CheckDetailsPage.validateRowValues([
				objectorChanged.firstName,
				objectorChanged.lastName,
				objectorChanged.companyName,
				objectorAddressChanged.line1,
				objectorAddressChanged.line2,
				objectorAddressChanged.town,
				objectorAddressChanged.county,
				objectorAddressChanged.postcode,
				objectorContactChanged.email,
				objectorContactChanged.phone,
				objectorStatusChanged
			]);
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('key-contacts');
			CaseDetailsPage.clickBannerReturnToSection('key-contacts');
			CaseDetailsPage.validateSummaryRow('key-contacts', 'Objector(s)', 'withDetails', ['1 Objector(s)']);

			// Go back into objector details and check details
			CaseDetailsPage.clickSummaryRowAction('key-contacts', 'Objector(s)');
			CheckDetailsPage.isPageDisplayed('objectors', 'withDetails');
			CheckDetailsPage.validateRowValues([
				objectorChanged.firstName,
				objectorChanged.lastName,
				objectorChanged.companyName,
				objectorAddressChanged.line1,
				objectorAddressChanged.line2,
				objectorAddressChanged.town,
				objectorAddressChanged.county,
				objectorAddressChanged.postcode,
				objectorContactChanged.email,
				objectorContactChanged.phone,
				objectorStatusChanged
			]);
		});

		it('correctly shows objector error validations', () => {
			const over250Characters = generateRandomString(251);

			// Add
			CaseDetailsPage.validateSummaryRow('key-contacts', 'Objector(s)', 'noDetails');
			CaseDetailsPage.clickSummaryRowAction('key-contacts', 'Objector(s)');
			CheckDetailsPage.isPageDisplayed('objectors', 'withoutDetails');
			CommonActionsUtility.clickActionButton('addDetails');

			// Error for add at least one field
			WhoAppellantObjectorPage.isPageDisplayed('objector', true);
			CommonActionsUtility.clickActionButton('continue');
			WhoAppellantObjectorPage.verifyErrorBanner('objector', 'required');

			// Error for max field entry
			WhoAppellantObjectorPage.enterFirstName('objector', over250Characters);
			WhoAppellantObjectorPage.enterLastName('objector', over250Characters);
			WhoAppellantObjectorPage.enterCompanyName('objector', over250Characters);
			CommonActionsUtility.clickActionButton('continue');
			WhoAppellantObjectorPage.verifyErrorBanner('objector', ['firstNameTooLong', 'lastNameTooLong', 'orgNameTooLong']);

			// Add Valid filed value
			WhoAppellantObjectorPage.enterFirstLastAndCompany('objector');
			CommonActionsUtility.clickActionButton('continue');

			// Errors for address postcode field entry
			AddressPage.isPageDisplayed('objector', false);
			AddressUtility.enterAddress({ postcode: 'bAdP0stCode' }, false);
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('objector', false);
			AddressUtility.validateAddressErrors('postcodeLength');
			AddressUtility.enterAddress({ postcode: 'u4852fw' }, false);
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('objector', false);
			AddressUtility.validateAddressErrors('invalidPostcodeFormat');
			AddressUtility.enterAddress({ postcode: '' }, false);

			// Error for address fields
			AddressUtility.enterAddress({ line1: over250Characters }, false);
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('objector', false);
			AddressUtility.validateAddressErrors('line1TooLong');
			AddressUtility.enterAddress(
				{
					line1: over250Characters,
					county: over250Characters
				},
				false
			);
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('objector', false);
			AddressUtility.validateAddressErrors(['line1TooLong', 'countyTooLong']);
			AddressUtility.enterAddress(
				{
					line1: '',
					county: '',
					town: over250Characters
				},
				false
			);
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('objector', false);
			AddressUtility.validateAddressErrors('townTooLong');
			AddressUtility.enterAddress({ town: '' }, false);
			CommonActionsUtility.clickActionButton('continue');

			// Errors for contact details
			ContactDetailsPage.isPageDisplayed('objector', false);
			ContactDetailsPage.enterEmail('objector', over250Characters);
			CommonActionsUtility.clickActionButton('continue');
			ContactDetailsPage.isPageDisplayed('objector', false);
			ContactDetailsPage.verifyErrorBanner('objector', 'emailTooLong');
			ContactDetailsPage.enterEmail('objector', '');
			ContactDetailsPage.enterPhoneNumber('objector', over250Characters);
			CommonActionsUtility.clickActionButton('continue');
			ContactDetailsPage.isPageDisplayed('objector', false);
			ContactDetailsPage.verifyErrorBanner('objector', 'phoneTooLong');
			ContactDetailsPage.enterPhoneNumber('objector');
			CommonActionsUtility.clickActionButton('continue');

			// Errors for status
			ObjectorStatusPage.isPageDisplayed();
			CommonActionsUtility.clickActionButton('continue');
			ObjectorStatusPage.verifyErrorBanner();
			ObjectorStatusPage.selectAnswer();
			CommonActionsUtility.clickActionButton('continue');
			CheckDetailsPage.isPageDisplayed('objectors', 'withDetails');
			CommonActionsUtility.clickActionButton('saveAndContinue');
			CaseDetailsPage.isPageDisplayed(false);
			CaseDetailsPage.validateSuccessBanner('key-contacts');
			CaseDetailsPage.clickBannerReturnToSection('key-contacts');
			CaseDetailsPage.validateSummaryRow('key-contacts', 'Objector(s)', 'withDetails', ['1 Objector(s)']);
		});
	}
});
