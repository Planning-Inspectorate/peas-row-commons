import type { Journeys } from '../types/journeys.ts';
import { buildNameWithRandomSuffix } from '../page-utilities/generate.utility.ts';
import { runPageValidation } from 'cypress/page-utilities/page-validation.utility.ts';

class ExternalReferencePage {
	isPageDisplayed(fullValidation = true): void {
		runPageValidation(
			fullValidation,
			() => {
				cy.verifyPageLoaded('External reference');
				cy.verifyPageTitle('What is the external reference? (optional)');
			},
			() => {
				cy.verifyPageURL('/cases/create-a-case/questions/external-reference');
				cy.get('#externalReference').should('exist').and('be.visible');
				cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
			}
		);
	}

	/**
	 * Enters an external reference:
	 * - uses a provided string directly, or
	 * - generates one from the journey with a unique suffix.
	 * Returns the value entered.
	 */
	enterExternalReference(journey: Journeys): string;
	enterExternalReference(journey: Journeys, reference: string): string;
	enterExternalReference(reference: string): string;

	enterExternalReference(arg1: Journeys | string, arg2?: string): string {
		const valueToUse = typeof arg1 === 'string' ? arg1 : (arg2 ?? buildNameWithRandomSuffix(arg1.name));

		cy.get('#externalReference')
			.should('exist')
			.and('be.visible')
			.clear()
			.type(valueToUse)
			.should('have.value', valueToUse);

		return valueToUse;
	}

	verifyErrorBanner(): void {
		const message = 'Case name must be less than 50 characters';
		const href = '#externalReference';
		const inlineId = 'externalReference-error';
		const inputId = 'externalReference';

		cy.get('.govuk-error-summary')
			.should('exist')
			.and('be.visible')
			.within(() => {
				cy.contains('h2', 'There is a problem').should('be.visible');
				cy.get('.govuk-error-summary__list li').should('have.length', 1);
			});

		cy.verifyErrorSummary(message, {
			href,
			inlineId
		});

		cy.get(`#${inlineId}`).should('exist').and('be.visible').and('contain.text', message);

		cy.get(`#${inputId}`).should('have.class', 'govuk-input--error').and('have.attr', 'aria-describedby', inlineId);
	}
}

export default new ExternalReferencePage();
