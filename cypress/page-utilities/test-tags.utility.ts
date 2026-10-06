import type { JourneyTag } from '../types/journeys.ts';

/**
 * Determines whether a test should run
 * based on configured tag filters.
 */
export function shouldRunTest(tags: JourneyTag[]): boolean {
	const runTags: JourneyTag[] = Cypress.expose('journeyTags') ? [Cypress.expose('journeyTags') as JourneyTag] : [];

	return runTags.length === 0 || tags.some((tag) => runTags.includes(tag));
}
