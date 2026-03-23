/// <reference types="cypress" />

import CommonActionsUtility from 'cypress/page-utilities/common-actions.utility.ts';
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

import ApplicantOrAppellantPage from 'cypress/page-objects/applicant-or-appellant/applicant-or-appellant.page.ts';
import WhoIsAOrAPage from 'cypress/page-objects/applicant-or-appellant/who-is-a-or-a.page.ts';
import AOrAAddressPage from 'cypress/page-objects/applicant-or-appellant/a-or-a-address.page.ts';
import AOrAContactDetailsPage from 'cypress/page-objects/applicant-or-appellant/a-or-a-contact-details.page.ts';
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
			HeaderUtility.clickHeaderLink('createCase');

			CaseWorkAreaPage.isPageDisplayed();
			CaseWorkAreaPage.selectCaseworkArea(journey.caseworkArea);
			CommonActionsUtility.clickActionButton('continue');

			CaseTypePage.isPageDisplayed();
			CaseTypePage.selectCaseType(journey.caseType);
			CommonActionsUtility.clickActionButton('continue');

			runJourney(journey);

			CaseNamePage.isPageDisplayed();
			CaseNamePage.enterCaseName(journey);
			CommonActionsUtility.clickActionButton('continue');

			ExternalReferencePage.isPageDisplayed();
			ExternalReferencePage.enterExternalReference(journey);
			CommonActionsUtility.clickActionButton('continue');

			CaseReceivedDatePage.isPageDisplayed();
			CaseReceivedDatePage.enterDate();
			CommonActionsUtility.clickActionButton('continue');

			ApplicantOrAppellantPage.isPageDisplayed('createCase', 'noDetails');
			CommonActionsUtility.clickActionButton('addDetails');
			WhoIsAOrAPage.isPageDisplayed();
			WhoIsAOrAPage.enterFirstLastAndCompany();
			CommonActionsUtility.clickActionButton('continue');
			AOrAAddressPage.isPageDisplayed();
			CommonActionsUtility.enterAddress();
			CommonActionsUtility.clickActionButton('continue');
			AOrAContactDetailsPage.isPageDisplayed();
			AOrAContactDetailsPage.enterContactDetails();
			CommonActionsUtility.clickActionButton('continue');
			ApplicantOrAppellantPage.isPageDisplayed('createCase', 'withDetails');

			SiteAddressPage.isPageDisplayed();
			CommonActionsUtility.enterAddress();
			CommonActionsUtility.clickActionButton('continue');

			SiteLocationPage.isPageDisplayed();
			SiteLocationPage.enterSiteLocation();
			CommonActionsUtility.clickActionButton('continue');

			WhoAuthorityPage.isPageDisplayed();
			WhoAuthorityPage.enterAuthority();
			CommonActionsUtility.clickActionButton('continue');

			CaseOfficerPage.isPageDisplayed();
			CaseOfficerPage.selectRandomCaseOfficer();
			CommonActionsUtility.clickActionButton('continue');

			CheckAnswersPage.isPageDisplayed();
			CheckAnswersPage.validateCheckYourAnswersRows();
			CheckAnswersPage.clickAcceptAndSubmitButton();

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
