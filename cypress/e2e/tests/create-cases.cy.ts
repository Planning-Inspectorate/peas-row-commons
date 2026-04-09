/// <reference types="cypress" />

import { createAnswers, CaseAnswers } from 'cypress/types/answers.ts';

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

/**
 * Combined journey fixture used to run the same case creation flow
 * across all supported Planning and Rights of Way journey types.
 */
const allJourneys: Journeys[] = [...planningJourneys, ...rightsOfWayJourneys];

describe('Planning Inspectorate > Case creation', () => {
	beforeEach(() => {
		cy.authVisit('');
		cy.visit('/cases');
		CasesListPage.isPageDisplayed();
	});

	/**
	 * Generates one end-to-end case creation test per supported journey.
	 * Shared steps stay the same; subtype-specific steps are delegated to runJourney().
	 */
	allJourneys.forEach((journey: Journeys) => {
		it(`Create Case: ${journey.name}`, () => {
			const answers: CaseAnswers = createAnswers();

			HeaderUtility.clickHeaderLink('createCase');

			// Casework area
			CaseWorkAreaPage.isPageDisplayed();
			CaseWorkAreaPage.selectCaseworkArea(journey.caseworkArea);
			CommonActionsUtility.clickActionButton('continue');

			// Case type
			CaseTypePage.isPageDisplayed();
			CaseTypePage.selectCaseType(journey.caseType);
			CommonActionsUtility.clickActionButton('continue');

			// Subtype
			runJourney(journey);

			// Case name
			CaseNamePage.isPageDisplayed();
			answers.caseName = CaseNamePage.enterCaseName(journey);
			CommonActionsUtility.clickActionButton('continue');

			// External reference
			ExternalReferencePage.isPageDisplayed();
			answers.externalReference = ExternalReferencePage.enterExternalReference(journey);
			CommonActionsUtility.clickActionButton('continue');

			// Case recieved date
			CaseReceivedDatePage.isPageDisplayed();
			DateUtility.enterDate();
			CommonActionsUtility.clickActionButton('continue');

			// Applicant or Appellant
			ApplicantOrAppellantPage.isPageDisplayed('createCase', 'noDetails');
			CommonActionsUtility.clickActionButton('addDetails');
			WhoIsNameCompanyPage.isPageDisplayed('applicantAppellant');
			const applicant = WhoIsNameCompanyPage.enterFirstLastAndCompany();
			CommonActionsUtility.clickActionButton('continue');
			AddressPage.isPageDisplayed('applicantAppellant');
			const applicantAddress = AddressUtility.enterAddress();
			CommonActionsUtility.clickActionButton('continue');
			ContactDetailsPage.isPageDisplayed('applicantAppellant');
			const applicantContact = ContactDetailsPage.enterContactDetails();
			CommonActionsUtility.clickActionButton('continue');

			answers.applicants?.push({
				...applicant,
				address: applicantAddress,
				contact: applicantContact
			});

			ApplicantOrAppellantPage.isPageDisplayed('createCase', 'withDetails');

			// Site Address
			SiteAddressPage.isPageDisplayed();
			answers.siteAddress = AddressUtility.enterAddress();
			CommonActionsUtility.clickActionButton('continue');

			// Site location
			SiteLocationPage.isPageDisplayed();
			answers.siteLocation = SiteLocationPage.enterSiteLocation();
			CommonActionsUtility.clickActionButton('continue');

			// Authority
			WhoAuthorityPage.isPageDisplayed();
			WhoAuthorityPage.selectRandomAuthority().then((selectedAuthority) => {
				answers.authority = selectedAuthority;
			});
			CommonActionsUtility.clickActionButton('continue');

			// Assigned case officer
			CaseOfficerPage.isPageDisplayed();
			CaseOfficerPage.selectRandomCaseOfficer().then((selectedOfficer) => {
				answers.caseOfficer = selectedOfficer;
			});
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
});

// ----------------- Journey Subtype Router -----------------

type JourneyHandler = (j: Journeys) => void;

/**
 * Routes each case type to the page object responsible for its
 * subtype selection step, including any subtype-specific inputs.
 */
const handlers: Partial<Record<Journeys['caseType'], JourneyHandler>> = {
	drought: (j) => {
		if (!('droughtSubtype' in j) || !j.droughtSubtype) throw new Error('droughtSubtype missing');
		DroughtSubtypePage.isPageDisplayed();
		DroughtSubtypePage.selectDroughtSubtype(j.droughtSubtype);
		CommonActionsUtility.clickActionButton('continue');
	},

	housingAndPlanningCPOs: (j) => {
		if (!('cpoSubtype' in j) || !j.cpoSubtype) throw new Error('cpoSubtype missing');
		CpoSubtypePage.isPageDisplayed();
		CpoSubtypePage.selectCpoSubtype(j.cpoSubtype);
		CommonActionsUtility.clickActionButton('continue');
	},

	otherSosCasework: (j) => {
		if (!('sosSubtype' in j) || !j.sosSubtype) {
			throw new Error('sosSubtype missing');
		}

		SosSubtypePage.isPageDisplayed();
		SosSubtypePage.selectOtherSosSubtype(j.sosSubtype);

		if (j.sosSubtype === 'other') {
			SosSubtypePage.enterOtherSosDetails();
		}

		CommonActionsUtility.clickActionButton('continue');
	},

	wayleaves: (j) => {
		if (!('wayleavesSubtype' in j) || !j.wayleavesSubtype) throw new Error('wayleavesSubtype missing');
		WayleavesSubtypePage.isPageDisplayed();
		WayleavesSubtypePage.selectWayleavesSubtype(j.wayleavesSubtype);
		CommonActionsUtility.clickActionButton('continue');
	},

	coastalAccess: (j) => {
		if (!('coastalAccessSubtype' in j) || !j.coastalAccessSubtype) throw new Error('coastalAccessSubtype missing');
		CoastalAccessSubtypePage.isPageDisplayed();
		CoastalAccessSubtypePage.selectCoastalAccessSubtype(j.coastalAccessSubtype);
		CommonActionsUtility.clickActionButton('continue');
	},

	commonLand: (j) => {
		if (!('commonLandSubtype' in j) || !j.commonLandSubtype) throw new Error('commonLandSubtype missing');
		CommonLandSubtypePage.isPageDisplayed();
		CommonLandSubtypePage.selectCommonLandSubtype(j.commonLandSubtype);
		CommonActionsUtility.clickActionButton('continue');
	},

	rightsOfWay: (j) => {
		if (!('rightsOfWaySubtype' in j) || !j.rightsOfWaySubtype) throw new Error('rightsOfWaySubtype missing');
		RightsOfWaySubtypePage.isPageDisplayed();
		RightsOfWaySubtypePage.selectRightsOfWaySubtype(j.rightsOfWaySubtype);
		CommonActionsUtility.clickActionButton('continue');
	}
};

/**
 * Runs the subtype-specific section of the case creation journey based on the selected case type.
 */
function runJourney(journey: Journeys) {
	const handler = handlers[journey.caseType];
	if (!handler) throw new Error(`No handler registered for caseType: ${journey.caseType}`);
	handler(journey);
}
