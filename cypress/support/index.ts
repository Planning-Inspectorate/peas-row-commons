/// <reference types="cypress" />

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
	namespace Cypress {
		interface Chainable {
			authVisit(endpoint: string): Chainable<void>;
			verifyPageLoaded(pageName: string): Chainable<void>;
			verifyPageURL(pageURL: string | string[]): Chainable<void>;
			verifyPageTitle(expectedTitle: string, options?: { timeout?: number }): Chainable<void>;
		}
	}
}
/* eslint-enable @typescript-eslint/no-namespace */

export {};
