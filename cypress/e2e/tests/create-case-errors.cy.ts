/// <reference types="cypress" />

import CommonActionsUtility from 'cypress/page-utilities/common-actions.utility.ts';
import DateUtility from 'cypress/page-utilities/date.utility.ts';
import AddressUtility from 'cypress/page-utilities/address.utility.ts';
import AddressPage from 'cypress/page-objects/address-details.page.ts';
import CasesListPage from 'cypress/page-objects/case-list.page.ts';
import HeaderUtility from 'cypress/page-utilities/header.utility.ts';
import CaseWorkAreaPage from 'cypress/page-objects/case-work-area.page.ts';
import CaseTypePage from 'cypress/page-objects/case-type.page.ts';
import ExternalReferencePage from 'cypress/page-objects/external-reference.page.ts';
import CaseReceivedDatePage from 'cypress/page-objects/case-received-date.page.ts';

import DroughtSubtypePage from 'cypress/page-objects/sub-types/drought-subtype.page.ts';
import CpoSubtypePage from 'cypress/page-objects/sub-types/cpo-subtype.page.ts';
import SosSubtypePage from 'cypress/page-objects/sub-types/sos-subtype.page.ts';
import WayleavesSubtypePage from 'cypress/page-objects/sub-types/wayleaves-subtype.page.ts';
import CoastalAccessSubtypePage from 'cypress/page-objects/sub-types/coastal-access-subtype.page.ts';
import CommonLandSubtypePage from 'cypress/page-objects/sub-types/common-land-subtype.page.ts';
import RightsOfWaySubtypePage from 'cypress/page-objects/sub-types/rights-of-way-subtype.page.ts';

import ApplicantOrAppellantPage from 'cypress/page-objects/applicant-or-appellant.page.ts';
import ContactDetailsPage from 'cypress/page-objects/contact-details.page.ts';
import WhoIsNameCompanyPage from 'cypress/page-objects/who-is-name-company.page.ts';
import CaseNamePage from 'cypress/page-objects/case-name.page.ts';
import SiteAddressPage from 'cypress/page-objects/site-address.page.ts';
import SiteLocationPage from 'cypress/page-objects/site-location.page.ts';
import WhoAuthorityPage from 'cypress/page-objects/who-authority.page.ts';
import CaseOfficerPage from 'cypress/page-objects/case-officer.page.ts';
import CheckAnswersPage from 'cypress/page-objects/check-answers.page.ts';
import CaseCreatedPage from 'cypress/page-objects/case-created.page.ts';
import CaseDetailsPage from 'cypress/page-objects/case-details.page.ts';

import type { Journeys } from '../../types/journeys.ts';
import { planningJourneys } from 'cypress/fixtures/planning-case-journeys.ts';
import { rightsOfWayJourneys } from 'cypress/fixtures/right-of-way-case-journeys.ts';
import { generateRandomString } from 'cypress/page-utilities/generate.utility.ts';

const allJourneys: Journeys[] = [...planningJourneys, ...rightsOfWayJourneys];

describe('Planning Inspectorate > Case creation validation', () => {
	const journey = Cypress._.sample(allJourneys)!;

	beforeEach(() => {
		cy.authVisit('');
		cy.visit('/cases');
		CasesListPage.isPageDisplayed();
		cy.log(`Negative validation journey: ${journey.name}`);
	});

	it(`shows required validation errors before continuing: ${journey.name}`, () => {
		HeaderUtility.clickHeaderLink('createCase');

		// Casework area
		CaseWorkAreaPage.isPageDisplayed();
		CommonActionsUtility.clickActionButton('continue');
		CaseWorkAreaPage.verifyErrorBanner();
		CaseWorkAreaPage.selectCaseworkArea(journey.caseworkArea);
		CommonActionsUtility.clickActionButton('continue');

		// Case type
		CaseTypePage.isPageDisplayed();
		CommonActionsUtility.clickActionButton('continue');
		CaseTypePage.verifyErrorBanner(journey.caseworkArea);
		CaseTypePage.selectCaseType(journey.caseType);
		CommonActionsUtility.clickActionButton('continue');

		// Subtype
		runJourneyWithErrors(journey);

		// Case name
		CaseNamePage.isPageDisplayed();
		CommonActionsUtility.clickActionButton('continue');
		CaseNamePage.verifyErrorBanner();
		CaseNamePage.enterCaseName(journey);
		CommonActionsUtility.clickActionButton('continue');

		// External reference - Optional no error
		ExternalReferencePage.isPageDisplayed();
		CommonActionsUtility.clickActionButton('continue');

		// Case recieved date
		CaseReceivedDatePage.isPageDisplayed();
		CommonActionsUtility.clickActionButton('continue');
		CaseReceivedDatePage.verifyErrorBanner();
		DateUtility.enterDate();
		CommonActionsUtility.clickActionButton('continue');

		// Applicant or Appellant
		ApplicantOrAppellantPage.isPageDisplayed('createCase', 'noDetails');
		CommonActionsUtility.clickActionButton('addDetails');
		WhoIsNameCompanyPage.isPageDisplayed('applicantAppellant');
		CommonActionsUtility.clickActionButton('continue');
		WhoIsNameCompanyPage.verifyErrorBanner();

		// This is each of the three error scenarios in Who is the applicant or appellant?
		const applicantErrorScenarios = [
			{
				name: 'firstNameTooLong',
				action: () => WhoIsNameCompanyPage.enterFirstName(generateRandomString(260)),
				reset: () => WhoIsNameCompanyPage.enterFirstName('')
			},
			{
				name: 'lastNameTooLong',
				action: () => WhoIsNameCompanyPage.enterLastName(generateRandomString(260)),
				reset: () => WhoIsNameCompanyPage.enterLastName('')
			},
			{
				name: 'orgNameTooLong',
				action: () => WhoIsNameCompanyPage.enterCompanyName(generateRandomString(260)),
				reset: () => WhoIsNameCompanyPage.enterCompanyName('')
			}
		] as const;

		// This will randomly pick one of the scenarios each time the test is run.
		const scenario = Cypress._.sample(applicantErrorScenarios)!;
		cy.log(`Testing error scenario: ${scenario.name}`);
		scenario.action();
		CommonActionsUtility.clickActionButton('continue');
		WhoIsNameCompanyPage.verifyErrorBanner(scenario.name);
		scenario.reset();

		WhoIsNameCompanyPage.enterFirstLastAndCompany();
		CommonActionsUtility.clickActionButton('continue');
		AddressPage.isPageDisplayed('applicantAppellant');
		AddressUtility.enterAddress();
		CommonActionsUtility.clickActionButton('continue');
		ContactDetailsPage.isPageDisplayed('applicantAppellant');
		ContactDetailsPage.enterContactDetails();
		CommonActionsUtility.clickActionButton('continue');
		ApplicantOrAppellantPage.isPageDisplayed('createCase', 'withDetails');

		// Site Address - Optional no error
		SiteAddressPage.isPageDisplayed();
		CommonActionsUtility.clickActionButton('continue');

		// Site location - Optional no error
		SiteLocationPage.isPageDisplayed();
		CommonActionsUtility.clickActionButton('continue');

		// Authority - Optional no error
		WhoAuthorityPage.isPageDisplayed();
		CommonActionsUtility.clickActionButton('continue');

		// Assigned case officer
		CaseOfficerPage.isPageDisplayed();
		CommonActionsUtility.clickActionButton('continue');
		CaseOfficerPage.verifyErrorBanner();
		CaseOfficerPage.selectRandomCaseOfficer();
		CommonActionsUtility.clickActionButton('continue');

		// Check answers
		CheckAnswersPage.isPageDisplayed();
		CheckAnswersPage.validateCheckYourAnswersRows();
		CheckAnswersPage.verifyCheckYourAnswers(journey);
		CommonActionsUtility.clickActionButton('saveAndContinue');

		// Create case
		CaseCreatedPage.isPageDisplayed(journey);
		CaseCreatedPage.clickContinueToCaseDetails();

		CaseDetailsPage.isPageDisplayed();
	});
});

function runJourneyWithErrors(journey: Journeys) {
	switch (journey.caseType) {
		case 'drought':
			if (!('droughtSubtype' in journey)) {
				throw new Error('droughtSubtype missing');
			}

			DroughtSubtypePage.isPageDisplayed();
			CommonActionsUtility.clickActionButton('continue');
			DroughtSubtypePage.verifyErrorBanner();
			DroughtSubtypePage.selectDroughtSubtype(journey.droughtSubtype);
			CommonActionsUtility.clickActionButton('continue');
			break;

		case 'housingAndPlanningCPOs':
			if (!('cpoSubtype' in journey)) {
				throw new Error('cpoSubtype missing');
			}

			CpoSubtypePage.isPageDisplayed();
			CommonActionsUtility.clickActionButton('continue');
			CpoSubtypePage.verifyErrorBanner();
			CpoSubtypePage.selectCpoSubtype(journey.cpoSubtype);
			CommonActionsUtility.clickActionButton('continue');
			break;

		case 'otherSosCasework':
			if (!('sosSubtype' in journey)) {
				throw new Error('sosSubtype missing');
			}

			SosSubtypePage.isPageDisplayed();
			CommonActionsUtility.clickActionButton('continue');
			SosSubtypePage.verifyErrorBanner('required');
			SosSubtypePage.selectOtherSosSubtype(journey.sosSubtype);

			if (journey.sosSubtype === 'other') {
				CommonActionsUtility.clickActionButton('continue');
				SosSubtypePage.verifyErrorBanner('otherTextValidation');
				SosSubtypePage.enterOtherSosDetails();
			}

			CommonActionsUtility.clickActionButton('continue');
			break;

		case 'wayleaves':
			if (!('wayleavesSubtype' in journey)) {
				throw new Error('wayleavesSubtype missing');
			}

			WayleavesSubtypePage.isPageDisplayed();
			CommonActionsUtility.clickActionButton('continue');
			WayleavesSubtypePage.verifyErrorBanner();
			WayleavesSubtypePage.selectWayleavesSubtype(journey.wayleavesSubtype);
			CommonActionsUtility.clickActionButton('continue');
			break;

		case 'coastalAccess':
			if (!('coastalAccessSubtype' in journey)) {
				throw new Error('coastalAccessSubtype missing');
			}

			CoastalAccessSubtypePage.isPageDisplayed();
			CommonActionsUtility.clickActionButton('continue');
			CoastalAccessSubtypePage.verifyErrorBanner();
			CoastalAccessSubtypePage.selectCoastalAccessSubtype(journey.coastalAccessSubtype);
			CommonActionsUtility.clickActionButton('continue');
			break;

		case 'commonLand':
			if (!('commonLandSubtype' in journey)) {
				throw new Error('commonLandSubtype missing');
			}

			CommonLandSubtypePage.isPageDisplayed();
			CommonActionsUtility.clickActionButton('continue');
			CommonLandSubtypePage.verifyErrorBanner();
			CommonLandSubtypePage.selectCommonLandSubtype(journey.commonLandSubtype);
			CommonActionsUtility.clickActionButton('continue');
			break;

		case 'rightsOfWay':
			if (!('rightsOfWaySubtype' in journey)) {
				throw new Error('rightsOfWaySubtype missing');
			}

			RightsOfWaySubtypePage.isPageDisplayed();
			CommonActionsUtility.clickActionButton('continue');
			RightsOfWaySubtypePage.verifyErrorBanner();
			RightsOfWaySubtypePage.selectRightsOfWaySubtype(journey.rightsOfWaySubtype);
			CommonActionsUtility.clickActionButton('continue');
			break;

		default:
			throw new Error(`No negative validation handler registered for caseType: ${journey.caseType}`);
	}
}
