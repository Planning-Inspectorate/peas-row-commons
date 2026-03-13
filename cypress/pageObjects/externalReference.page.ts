import type { Journeys } from '../types/journeys.ts';
import { buildNameWithRandomSuffix } from '../pageUtilities/generate.utility.ts';

class ExternalReferencePage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('External reference');
		cy.verifyPageTitle('What is the external reference? (optional)');
		cy.verifyPageURL('/cases/create-a-case/questions/external-reference');

		cy.get('#externalReference').should('exist').and('be.visible');
		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

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
}

export default new ExternalReferencePage();
