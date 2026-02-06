import type { Wayleaves } from '../types/subTypes.ts';

class WayleavesSubtypePage {
	isPageDisplayed(): void {
		cy.contains('h1', 'What Wayleaves subtype is it?').should('exist').and('be.visible');

		cy.contains('label', 'New lines').should('exist').and('be.visible');
		cy.contains('label', 'Tree lopping').should('exist').and('be.visible');
		cy.contains('label', 'Wayleaves').should('exist').and('be.visible');

		cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible');
		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

	selectWayleavesSubtype(option: Wayleaves): void {
		const selectorMap: Record<typeof option, string> = {
			newLines: '[data-cy="answer-new-lines"]',
			treeLopping: '[data-cy="answer-tree-lopping"]',
			wayleaves: '[data-cy="answer-wayleaves-generic"]'
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

export default WayleavesSubtypePage;
