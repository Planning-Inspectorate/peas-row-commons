import { createAnswers, CaseAnswers } from 'cypress/types/answers.ts';

import AnswersUtility from 'cypress/page-utilities/answers.utility.ts';
import CasesListPage from 'cypress/page-objects/case-list.page.ts';
import CommonActionsUtility from 'cypress/page-utilities/common-actions.utility.ts';
import DateUtility from 'cypress/page-utilities/date.utility.ts';
import AddressUtility from 'cypress/page-utilities/address.utility.ts';
import AddressPage from 'cypress/page-objects/address-details.page.ts';
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

import CheckDetailsPage from '../page-objects/check-details.page.ts';
import ContactDetailsPage from 'cypress/page-objects/contact-details.page.ts';
import WhoAppellantObjectorPage from 'cypress/page-objects/who-appellant-objector.page.ts';
import CaseNamePage from 'cypress/page-objects/case-name.page.ts';
import SiteAddressPage from 'cypress/page-objects/site-address.page.ts';
import SiteLocationPage from 'cypress/page-objects/site-location.page.ts';
import WhoAuthorityPage from 'cypress/page-objects/who-authority.page.ts';
import CaseOfficerPage from 'cypress/page-objects/case-officer.page.ts';
import CheckAnswersPage from 'cypress/page-objects/check-answers.page.ts';
import CaseCreatedPage from 'cypress/page-objects/case-created.page.ts';
import CaseDetailsPage from 'cypress/page-objects/case-details.page.ts';

import type { Journeys } from '../types/journeys.ts';
import { planningJourneys } from 'cypress/fixtures/planning-case-journeys.ts';
import { rightsOfWayJourneys } from 'cypress/fixtures/right-of-way-case-journeys.ts';

type JourneyName = (typeof planningJourneys)[number]['name'] | (typeof rightsOfWayJourneys)[number]['name'];

type JourneyHandler = (j: Journeys, fullValidation: boolean) => void;

const allJourneys: Journeys[] = [...planningJourneys, ...rightsOfWayJourneys];

class CreateCaseUtility {
	createCaseByJourneyName(journeyName: JourneyName, fullValidation = true): void {
		const journey = allJourneys.find((j) => j.name === journeyName);

		if (!journey) {
			throw new Error(`Journey not found: ${journeyName}`);
		}

		this.createCase(journey, fullValidation);
	}

	private createCase(journey: Journeys, fullValidation: boolean): void {
		const answers: CaseAnswers = createAnswers();
		AnswersUtility.init(answers);

		CasesListPage.isPageDisplayed();
		HeaderUtility.clickHeaderLink('createCase');

		// Casework area
		CaseWorkAreaPage.isPageDisplayed(fullValidation);
		CaseWorkAreaPage.selectCaseworkArea(journey.caseworkArea);
		CommonActionsUtility.clickActionButton('continue');

		// Case type
		CaseTypePage.isPageDisplayed(fullValidation);
		CaseTypePage.selectCaseType(journey.caseType);
		CommonActionsUtility.clickActionButton('continue');

		// Subtype
		this.runJourney(journey, fullValidation);

		// Case name
		CaseNamePage.isPageDisplayed(fullValidation);
		answers.caseName = CaseNamePage.enterCaseName(journey);
		CommonActionsUtility.clickActionButton('continue');

		// External reference
		ExternalReferencePage.isPageDisplayed(fullValidation);
		answers.externalReference = ExternalReferencePage.enterExternalReference(journey);
		CommonActionsUtility.clickActionButton('continue');

		// Case received date
		CaseReceivedDatePage.isPageDisplayed(fullValidation);
		DateUtility.enterDate();
		CommonActionsUtility.clickActionButton('continue');

		// Applicant or Appellant
		CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withoutDetails', fullValidation, 'createCase');
		CommonActionsUtility.clickActionButton('addDetails');

		WhoAppellantObjectorPage.isPageDisplayed('applicantAppellant', fullValidation);
		const applicant = WhoAppellantObjectorPage.enterFirstLastAndCompany('applicantAppellant');
		CommonActionsUtility.clickActionButton('continue');

		AddressPage.isPageDisplayed('applicantAppellant', fullValidation);
		const applicantAddress = AddressUtility.enterAddress();
		CommonActionsUtility.clickActionButton('continue');

		ContactDetailsPage.isPageDisplayed('applicantAppellant', fullValidation);
		const applicantContact = ContactDetailsPage.enterContactDetails('applicantAppellant');
		CommonActionsUtility.clickActionButton('continue');

		answers.applicants?.push({
			...applicant,
			address: applicantAddress,
			contact: applicantContact
		});

		CheckDetailsPage.isPageDisplayed('applicantAppellant', 'withDetails', fullValidation, 'createCase');
		CommonActionsUtility.clickActionButton('continue');

		// Site address
		SiteAddressPage.isPageDisplayed(fullValidation);
		answers.siteAddress = AddressUtility.enterAddress();
		CommonActionsUtility.clickActionButton('continue');

		// Site location
		SiteLocationPage.isPageDisplayed(fullValidation);
		answers.siteLocation = SiteLocationPage.enterSiteLocation();
		CommonActionsUtility.clickActionButton('continue');

		// Authority
		WhoAuthorityPage.isPageDisplayed(fullValidation);
		WhoAuthorityPage.selectRandomAuthority().then((selectedAuthority) => {
			answers.authority = selectedAuthority;
		});
		CommonActionsUtility.clickActionButton('continue');

		// Assigned case officer
		CaseOfficerPage.isPageDisplayed(fullValidation);
		CaseOfficerPage.selectRandomCaseOfficer().then((selectedOfficer) => {
			answers.caseOfficer = selectedOfficer;
		});
		CommonActionsUtility.clickActionButton('continue');

		// Check answers
		CheckAnswersPage.isPageDisplayed(fullValidation);

		if (fullValidation) {
			CheckAnswersPage.validateCheckYourAnswersRows(journey);
			CheckAnswersPage.verifyCheckYourAnswers(journey);
		}

		CommonActionsUtility.clickActionButton('saveAndContinue');

		// Create case
		CaseCreatedPage.isPageDisplayed(journey, fullValidation);

		CaseCreatedPage.getCaseReference().then((caseReference) => {
			answers.caseReference = caseReference;
			AnswersUtility.set('caseReference', caseReference);
			CaseCreatedPage.clickContinueToCaseDetails();
			CaseDetailsPage.isPageDisplayed(fullValidation, answers.caseName);
			CaseDetailsPage.validateCaseReference(caseReference);

			CaseDetailsPage.getCaseURL().then((caseURL) => {
				answers.caseURL = caseURL;
				AnswersUtility.set('caseURL', caseURL);
			});
		});
	}

	private runJourney(journey: Journeys, fullValidation: boolean): void {
		const handler = this.handlers[journey.caseType];

		if (!handler) {
			throw new Error(`No handler registered for caseType: ${journey.caseType}`);
		}

		handler(journey, fullValidation);
	}

	private handlers: Partial<Record<Journeys['caseType'], JourneyHandler>> = {
		drought: (j, fullValidation) => {
			if (!('droughtSubtype' in j) || !j.droughtSubtype) {
				throw new Error('droughtSubtype missing');
			}

			DroughtSubtypePage.isPageDisplayed(fullValidation);
			DroughtSubtypePage.selectDroughtSubtype(j.droughtSubtype);
			CommonActionsUtility.clickActionButton('continue');
		},

		housingAndPlanningCPOs: (j, fullValidation) => {
			if (!('cpoSubtype' in j) || !j.cpoSubtype) {
				throw new Error('cpoSubtype missing');
			}

			CpoSubtypePage.isPageDisplayed(fullValidation);
			CpoSubtypePage.selectCpoSubtype(j.cpoSubtype);
			CommonActionsUtility.clickActionButton('continue');
		},

		otherSosCasework: (j, fullValidation) => {
			if (!('sosSubtype' in j) || !j.sosSubtype) {
				throw new Error('sosSubtype missing');
			}

			SosSubtypePage.isPageDisplayed(fullValidation);
			SosSubtypePage.selectOtherSosSubtype(j.sosSubtype);

			if (j.sosSubtype === 'other') {
				SosSubtypePage.enterOtherSosDetails();
			}

			CommonActionsUtility.clickActionButton('continue');
		},

		purchaseNotices: () => {
			// No subtype page for this case type.
		},

		wayleaves: (j, fullValidation) => {
			if (!('wayleavesSubtype' in j) || !j.wayleavesSubtype) {
				throw new Error('wayleavesSubtype missing');
			}

			WayleavesSubtypePage.isPageDisplayed(fullValidation);
			WayleavesSubtypePage.selectWayleavesSubtype(j.wayleavesSubtype);
			CommonActionsUtility.clickActionButton('continue');
		},

		coastalAccess: (j, fullValidation) => {
			if (!('coastalAccessSubtype' in j) || !j.coastalAccessSubtype) {
				throw new Error('coastalAccessSubtype missing');
			}

			CoastalAccessSubtypePage.isPageDisplayed(fullValidation);
			CoastalAccessSubtypePage.selectCoastalAccessSubtype(j.coastalAccessSubtype);
			CommonActionsUtility.clickActionButton('continue');
		},

		commonLand: (j, fullValidation) => {
			if (!('commonLandSubtype' in j) || !j.commonLandSubtype) {
				throw new Error('commonLandSubtype missing');
			}

			CommonLandSubtypePage.isPageDisplayed(fullValidation);
			CommonLandSubtypePage.selectCommonLandSubtype(j.commonLandSubtype);
			CommonActionsUtility.clickActionButton('continue');
		},

		rightsOfWay: (j, fullValidation) => {
			if (!('rightsOfWaySubtype' in j) || !j.rightsOfWaySubtype) {
				throw new Error('rightsOfWaySubtype missing');
			}

			RightsOfWaySubtypePage.isPageDisplayed(fullValidation);
			RightsOfWaySubtypePage.selectRightsOfWaySubtype(j.rightsOfWaySubtype);
			CommonActionsUtility.clickActionButton('continue');
		}
	};
}

export default new CreateCaseUtility();
