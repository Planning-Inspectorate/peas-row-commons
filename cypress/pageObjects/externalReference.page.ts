import type { Journeys } from '../types/journeys.ts';
import { buildNameWithRandomSuffix } from '../pageUtilities/generate.utility.ts';

class ExternalReferencePage {
	isPageDisplayed(): void {
		cy.contains('label', 'What is the external reference? (optional)').should('exist').and('be.visible');

		cy.get('#externalReference').should('exist').and('be.visible');

		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

	enterExternalReference(journey: Journeys, reference?: string): string {
		const valueToUse = reference ?? buildNameWithRandomSuffix(journey.name);

		cy.get('#externalReference')
			.should('exist')
			.and('be.visible')
			.clear()
			.type(valueToUse)
			.should('have.value', valueToUse);

		return valueToUse;
	}
}

export default ExternalReferencePage;
