import type { JourneyTag } from '../types/journeys.ts';

/**
 * Determines whether a test should run
 * based on configured tag filters.
 */
export function shouldRunTest(tags: JourneyTag[]): boolean {
	const runTags: JourneyTag[] = Cypress.env('journeyTags') ? [Cypress.env('journeyTags') as JourneyTag] : [];

	return runTags.length === 0 || tags.some((tag) => runTags.includes(tag));
}
