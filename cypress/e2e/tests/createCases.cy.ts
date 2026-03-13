/// <reference types="cypress" />

import CommonActionsUtility from 'cypress/pageUtilities/commonActions.utility.ts';
import CasesListPage from 'cypress/pageObjects/caseList.page.ts';
import HeaderUtility from 'cypress/pageUtilities/header.utility.ts';
import CaseWorkAreaPage from 'cypress/pageObjects/caseWorkArea.page.ts';
import CaseTypePage from 'cypress/pageObjects/caseType.page.ts';
import ExternalReferencePage from 'cypress/pageObjects/externalReference.page.ts';
import CaseReceivedDatePage from 'cypress/pageObjects/caseReceivedDate.page.ts';

import DroughtSubtypePage from 'cypress/pageObjects/subTypes/droughtSubtype.page.ts';
import CpoSubtypePage from 'cypress/pageObjects/subTypes/cpoSubtype.page.ts';
import SosSubtypePage from 'cypress/pageObjects/subTypes/sosSubtype.page.ts';
import WayleavesSubtypePage from 'cypress/pageObjects/subTypes/wayleavesSubtype.page.ts';
import CoastalAccessSubtypePage from 'cypress/pageObjects/subTypes/coastalAccessSubtype.page.ts';
import CommonLandSubtypePage from 'cypress/pageObjects/subTypes/commonLandSubtype.page.ts';
import RightsOfWaySubtypePage from 'cypress/pageObjects/subTypes/rightsOfWaySubtype.page.ts';

import ApplicantOrAppellantPage from 'cypress/pageObjects/applicantOrAppellant/applicantOrAppellant.page.ts';
import WhoIsAOrAPage from 'cypress/pageObjects/applicantOrAppellant/whoIsAOrA.page.ts';
import AOrAAddressPage from 'cypress/pageObjects/applicantOrAppellant/aOrAAddress.page.ts';
import AOrAContactDetailsPage from 'cypress/pageObjects/applicantOrAppellant/aOrAContactDetails.page.ts';
import CaseNamePage from 'cypress/pageObjects/caseName.page.ts';
import SiteAddressPage from 'cypress/pageObjects/siteAddress.page.ts';
import SiteLocationPage from 'cypress/pageObjects/siteLocation.page.ts';
import WhoAuthorityPage from 'cypress/pageObjects/whoAuthority.page.ts';
import CaseOfficerPage from 'cypress/pageObjects/caseOfficer.page.ts';
import CheckAnswersPage from 'cypress/pageObjects/checkAnswers.page.ts';
import CaseCreatedPage from 'cypress/pageObjects/caseCreated.page.ts';
import CaseDetailsPage from 'cypress/pageObjects/caseDetails.page.ts';

import type { Journeys } from '../../types/journeys.ts';
import { planningJourneys } from 'cypress/fixtures/planningCaseJourneys.ts';
import { rightsOfWayJourneys } from 'cypress/fixtures/rightOfWayCaseJourneys.ts';

const allJourneys: Journeys[] = [...planningJourneys, ...rightsOfWayJourneys];

describe('Planning Inspectorate > Case creation', () => {
	beforeEach(() => {
		cy.authVisit('');
		cy.visit('/cases');
		CasesListPage.isPageDisplayed();
	});

	allJourneys.forEach((journey: Journeys) => {
		it(`Create Case: ${journey.name}`, () => {
			HeaderUtility.clickHeaderOption('createCase');

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

function runJourney(journey: Journeys) {
	const handler = handlers[journey.caseType];
	if (!handler) throw new Error(`No handler registered for caseType: ${journey.caseType}`);
	handler(journey);
}
