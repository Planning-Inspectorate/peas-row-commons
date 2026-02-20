import type { Drought } from '../types/subTypes.ts';

class DroughtSubtypePage {
	isPageDisplayed(): void {
		cy.contains('h1', 'Which Drought subtype is it?').should('exist').and('be.visible');
		cy.contains('label', 'Drought Permits').should('exist').and('be.visible');
		cy.contains('label', 'Drought Orders').should('exist').and('be.visible');
		cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible');
		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

	selectDroughtSubtype(option: Drought): void {
		const selectorMap: Record<typeof option, string> = {
			droughtPermits: '[data-cy="answer-drought-permits"]',
			droughtOrders: '[data-cy="answer-drought-orders"]'
		};

		const selector = selectorMap[option];

		cy.get('body').then(($body) => {
			if ($body.find(selector).length === 0) {
				throw new Error("Test Failed: Option specified isn't displayed");
			}

			cy.get(selector).check().should('be.checked');
		});
	}
}

export default new DroughtSubtypePage();
