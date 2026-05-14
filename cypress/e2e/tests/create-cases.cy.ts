/// <reference types="cypress" />

import CasesListPage from 'cypress/page-objects/case-list.page.ts';
import CreateCaseUtility from 'cypress/page-utilities/create-case.utility.ts';

import type { Journeys, JourneyTag } from '../../types/journeys.ts';
import { planningJourneys } from 'cypress/fixtures/planning-case-journeys.ts';
import { rightsOfWayJourneys } from 'cypress/fixtures/right-of-way-case-journeys.ts';

type JourneyName = (typeof planningJourneys)[number]['name'] | (typeof rightsOfWayJourneys)[number]['name'];

/**
 * Combined journey fixture used to run the same case creation flow
 * across all supported Planning and Rights of Way journey types.
 */
const allJourneys: Journeys[] = [...planningJourneys, ...rightsOfWayJourneys];

/**
 * Local development filters for quickly rerunning specific journeys/tags.
 *
 * Leave both arrays empty to run the full suite.
 *
 * Examples:
 *
 * Run one journey:
 * - Add a single journey name to LOCAL_RUN_JOURNEYS.
 *
 * Run multiple journeys:
 * - Add multiple journey names to LOCAL_RUN_JOURNEYS.
 *
 * Run smoke journeys:
 * - Leave LOCAL_RUN_JOURNEYS empty.
 * - Add 'smoke' to LOCAL_RUN_TAGS.
 *
 * Run regression journeys:
 * - Leave LOCAL_RUN_JOURNEYS empty.
 * - Add 'regression' to LOCAL_RUN_TAGS.
 *
 * Notes:
 * - Typing '' in LOCAL_RUN_JOURNEYS provides autocomplete.
 * - These filters are intended for local interactive 'Open' mode use only.
 * - e.g. npx cypress open
 * - Cypress run/CI execution will fail if these arrays are populated.
 * - Environment variables override local filters:
 *   --env journeyNames=...
 *   --env journeyTags=...
 */
const RUN_JOURNEYS: JourneyName[] = Cypress.env('journeyNames')
	? [Cypress.env('journeyNames') as JourneyName]
	: [
			// 'Planning > Drought > Drought Permits',
			// 'Planning > Purchase Notices'
		];

const RUN_TAGS: JourneyTag[] = Cypress.env('journeyTags')
	? [Cypress.env('journeyTags') as JourneyTag]
	: [
			// 'smoke',
			// 'regression'
		];

/**
 * Prevent accidental commits of local filters.
 * Allows local filtering in Cypress open mode only.
 */
const isRunMode = Cypress.config('isInteractive') === false;

if (isRunMode && (RUN_JOURNEYS.length > 0 || RUN_TAGS.length > 0)) {
	throw new Error('RUN_JOURNEYS or RUN_TAGS contains values. Clear local filters before running in CI/cypress run.');
}

/**
 * Determines whether a journey should run based on
 * journey name filters and tag filters.
 */
function shouldRunJourney(journey: Journeys): boolean {
	const matchesJourneyName = RUN_JOURNEYS.length === 0 || RUN_JOURNEYS.includes(journey.name as JourneyName);

	const matchesTag = RUN_TAGS.length === 0 || Boolean(journey.tags?.some((tag) => RUN_TAGS.includes(tag)));

	return matchesJourneyName && matchesTag;
}

/**
 * Final filtered list of journeys to execute.
 */
const journeysToRun: Journeys[] = allJourneys.filter(shouldRunJourney);

describe('Planning Inspectorate > Case creation', () => {
	beforeEach(() => {
		cy.authVisit('');
		cy.visit('/cases');

		CasesListPage.isPageDisplayed();
	});

	/**
	 * Generates one end-to-end case creation test per supported journey.
	 * Full validation mode is enabled for this suite.
	 */
	journeysToRun.forEach((journey: Journeys) => {
		it(`Create Case: ${journey.name}`, () => {
			CreateCaseUtility.createCaseByJourneyName(journey.name as JourneyName, true);
		});
	});
});
