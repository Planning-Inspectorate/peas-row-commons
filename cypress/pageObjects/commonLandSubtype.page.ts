import type { CommonLand } from '../types/subTypes.ts';

class CommonLandSubtypePage {
	isPageDisplayed(): void {
		cy.contains('h1', 'Which Common Land subtype is it?').should('exist').and('be.visible');

		const labels = [
			'Commons for Ecclesiastical Purposes',
			'Commons in Greater London',
			'Compulsory Purchase of Common Land',
			'Correction of the Common Land or Village Green Registers',
			'Deregistration & Exchange',
			'Inclosure',
			'Inclosure : obsolescent functions',
			'Land Exchange',
			'Local Acts and Provisional Order Confirmation Acts',
			'Public Access to Commons - limitations and restrictions',
			'Scheme of Management',
			'Stint Rates',
			'Works on Common Land',
			'Works on Common Land (National Trust)'
		];

		labels.forEach((text) => {
			cy.contains('label', text).should('exist').and('be.visible');
		});

		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

	selectCommonLandSubtype(option: CommonLand): void {
		const selectorMap: Record<typeof option, string> = {
			ecclesiastical: '[data-cy="answer-commons-ecclesiastical"]',
			greaterLondon: '[data-cy="answer-commons-greater-london"]',
			compulsoryPurchase: '[data-cy="answer-compulsory-purchase-cl"]',
			correctionRegister: '[data-cy="answer-correction-cl-register"]',
			deregistrationExchange: '[data-cy="answer-deregistration-exchange"]',
			inclosure: '[data-cy="answer-inclosure"]',
			inclosureObsolescent: '[data-cy="answer-inclosure-obsolescent"]',
			landExchange: '[data-cy="answer-land-exchange"]',
			localActs: '[data-cy="answer-local-acts"]',
			publicAccessLimitations: '[data-cy="answer-public-access-limitations"]',
			schemeOfManagement: '[data-cy="answer-scheme-of-management"]',
			stintRates: '[data-cy="answer-stint-rates"]',
			worksCommonLand: '[data-cy="answer-works-common-land"]',
			worksCommonLandNt: '[data-cy="answer-works-common-land-nt"]'
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

export default CommonLandSubtypePage;
