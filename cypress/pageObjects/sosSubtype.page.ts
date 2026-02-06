import type { SoS } from '../types/subTypes.ts';

class SosSubtypePage {
	isPageDisplayed(): void {
		cy.contains('h1', 'Which Other Secretary of State casework subtype is it?').should('exist').and('be.visible');

		const labels = [
			'DEFRA CPO',
			'DESNZ CPO',
			'DfT CPO',
			'Ad hoc CPO',
			'Advert',
			'Completion notice',
			'Discontinuance notice',
			'Modification to planning permission',
			'Review of mineral permission',
			'Revocation',
			'Other'
		];

		labels.forEach((text) => {
			cy.contains('label', text).should('exist').and('be.visible');
		});

		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

	selectOtherSosSubtype(option: SoS): void {
		const selectorMap: Record<typeof option, string> = {
			defraCpo: '[data-cy="answer-defra-cpo"]',
			desnzCpo: '[data-cy="answer-desnz-cpo"]',
			dftCpo: '[data-cy="answer-dft-cpo"]',
			adHocCpo: '[data-cy="answer-ad-hoc-cpo"]',
			advert: '[data-cy="answer-advert"]',
			completionNotice: '[data-cy="answer-completion-notice"]',
			discontinuanceNotice: '[data-cy="answer-discontinuance-notice"]',
			modificationToPp: '[data-cy="answer-modification-to-pp"]',
			reviewOfMineralPp: '[data-cy="answer-review-of-mineral-pp"]',
			revocation: '[data-cy="answer-revocation"]',
			other: '[data-cy="answer-other"]'
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

export default SosSubtypePage;
