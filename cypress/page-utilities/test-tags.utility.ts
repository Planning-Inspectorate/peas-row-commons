import type { JourneyTag } from '../types/journeys.ts';

const RUN_TAGS: JourneyTag[] = Cypress.env('journeyTags') ? [Cypress.env('journeyTags') as JourneyTag] : [];

/**
 * Determines whether a test should run
 * based on configured tag filters.
 */
export function shouldRunTest(tags: JourneyTag[]): boolean {
	return RUN_TAGS.length === 0 || tags.some((tag) => RUN_TAGS.includes(tag));
}
