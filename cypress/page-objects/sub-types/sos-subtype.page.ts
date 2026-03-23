import type { SoS } from '../../types/journey-subtypes.ts';

class SosSubtypePage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('Secretary of State subtype');
		cy.verifyPageTitle('Which Other Secretary of State casework subtype is it?');
		cy.verifyPageURL('/cases/create-a-case/questions/other-sos-casework-subtype');

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

	selectOtherSosSubtype(option: SoS, otherText?: string): void {
		const selectorMap: Record<SoS, string> = {
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
		cy.get(selector).should('exist').and('be.visible').check().should('be.checked');

		if (option === 'other') {
			cy.get('#otherSosCasework_text').should('exist').and('be.visible');

			if (otherText !== undefined) {
				cy.get('#otherSosCasework_text').clear().type(otherText).should('have.value', otherText);
			}
		} else {
			cy.get('body').then(($body) => {
				if ($body.find('#otherSosCasework_text').length) {
					cy.get('#otherSosCasework_text').should('not.be.visible');
				}
			});
		}
	}

	private readonly defaultOtherSosDescriptions = [
		'Other Secretary of State casework submitted by external organisation',
		'Special administrative request requiring ministerial decision',
		'Case referred to Secretary of State for additional review',
		'Unclassified planning case requiring SoS determination',
		'Exceptional case not covered by existing categories'
	] as const;

	enterOtherSosDetails(text?: string): string {
		const valueToUse = text !== undefined ? text : Cypress._.sample(this.defaultOtherSosDescriptions)!;

		const input = cy.get('#otherSosCasework_text').should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}
}

export default new SosSubtypePage();
