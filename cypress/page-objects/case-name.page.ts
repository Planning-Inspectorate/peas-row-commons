import type { Journeys } from '../types/journeys.ts';
import { buildCaseName } from '../page-utilities/generate.utility.ts';

class CaseNamePage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('Case name');
		cy.verifyPageTitle('What is the case name?');
		cy.verifyPageURL('/cases/create-a-case/questions/case-name');

		cy.get('#name').should('exist').and('be.visible');
		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

	/**
	 * Enters a case name:
	 * - uses a provided string directly, or
	 * - generates one from the journey when not supplied.
	 * Returns the value entered.
	 */
	enterCaseName(journey: Journeys): string;
	enterCaseName(journey: Journeys, caseName: string): string;
	enterCaseName(caseName: string): string;

	enterCaseName(arg1: Journeys | string, arg2?: string): string {
		const valueToUse = typeof arg1 === 'string' ? arg1 : (arg2 ?? buildCaseName(arg1.name));

		cy.get('[data-cy="case-name-input"]')
			.should('exist')
			.and('be.visible')
			.clear()
			.type(valueToUse)
			.should('have.value', valueToUse);

		return valueToUse;
	}

	verifyErrorBanner(): void {
		cy.verifyErrorSummary('Enter the case name', {
			href: '#name',
			inlineId: 'name-error'
		});
	}
}

export default new CaseNamePage();
