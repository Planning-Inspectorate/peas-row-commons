import type { CaseType } from '../types/workAreaCaseTypes.ts';

class CaseTypePage {
	isPageDisplayed(): void {
		cy.contains('h1', 'Which case type is it?').should('exist').and('be.visible');

		const planningOptions = [
			'Drought',
			'Housing and Planning CPOs',
			'Other Secretary of State casework',
			'Purchase Notices',
			'Wayleaves'
		];

		const rightsOfWayOptions = ['Coastal Access', 'Common Land', 'Rights of Way'];

		cy.get('body').then(($body) => {
			const hasPlanningVariation = $body.find('label:contains("Drought")').length > 0;

			const expectedOptions = hasPlanningVariation ? planningOptions : rightsOfWayOptions;

			expectedOptions.forEach((text) => {
				cy.contains('label', text).should('exist').and('be.visible');
			});
		});

		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

	selectCaseType(option: CaseType): void {
		const selectorMap: Record<typeof option, string> = {
			drought: '[data-cy="answer-drought"]',
			housingAndPlanningCPOs: '[data-cy="answer-housing-planning-cpos"]',
			otherSosCasework: '[data-cy="answer-other-sos-casework"]',
			purchaseNotices: '[data-cy="answer-purchase-notices"]',
			wayleaves: '[data-cy="answer-wayleaves"]',
			coastalAccess: '[data-cy="answer-coastal-access"]',
			commonLand: '[data-cy="answer-common-land"]',
			rightsOfWay: '[data-cy="answer-rights-of-way"]'
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

export default CaseTypePage;
