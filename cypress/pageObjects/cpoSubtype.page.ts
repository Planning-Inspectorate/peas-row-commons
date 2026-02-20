import type { CPOs } from '../types/subTypes.ts';

class CpoSubtypePage {
	isPageDisplayed(): void {
		cy.contains('h1', 'Select the subtype that covers this Compulsory Purchase Order (CPO)')
			.should('exist')
			.and('be.visible');

		cy.contains('label', 'Housing').should('exist').and('be.visible');
		cy.contains('label', 'Planning').should('exist').and('be.visible');
		cy.contains('label', 'Ad hoc').should('exist').and('be.visible');
		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

	selectCpoSubtype(option: CPOs): void {
		const selectorMap: Record<typeof option, string> = {
			housing: '[data-cy="answer-housing"]',
			planning: '[data-cy="answer-planning-sub"]',
			adhoc: '[data-cy="answer-adhoc"]'
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

export default new CpoSubtypePage();
