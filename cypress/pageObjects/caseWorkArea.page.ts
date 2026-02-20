import type { WorkArea } from '../types/workAreaCaseTypes.ts';

class CaseworkAreaPage {
	isPageDisplayed(): void {
		cy.contains('h1', 'Which case type is it?').should('be.visible');
		cy.contains('label', 'Planning, Environmental and Applications').should('be.visible');
		cy.contains('label', 'Rights of Way and Common Land').should('be.visible');
	}

	selectCaseworkArea(option: WorkArea): void {
		const selectorMap: Record<typeof option, string> = {
			planning: '[data-cy="answer-planning-environment-applications"]',
			rightsOfWay: '[data-cy="answer-rights-of-way-common-land"]'
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

export default new CaseworkAreaPage();
