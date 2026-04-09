import type { CoastalAccess } from '../../types/journey-subtypes.ts';

class CommonLandSubtypePage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('Coastal Access subtype');
		cy.verifyPageTitle('Which Coastal Access subtype is it?');
		cy.verifyPageURL('/cases/create-a-case/questions/coastal-subtype');

		const labels = ['Coastal access appeal', 'Notice appeal', 'Objection', 'Restriction appeal (access land)'];

		labels.forEach((text) => {
			cy.contains('label', text).should('exist').and('be.visible');
		});

		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

	selectCoastalAccessSubtype(option: CoastalAccess): void {
		const selectorMap: Record<typeof option, string> = {
			coastalAccessAppeal: '[data-cy="answer-coastal-access-appeal"]',
			noticeAppeal: '[data-cy="answer-notice-appeal"]',
			objection: '[data-cy="answer-objection"]',
			restrictionAppeal: '[data-cy="answer-restriction-appeal"]'
		};

		const selector = selectorMap[option];

		cy.get('body').then(($body) => {
			if ($body.find(selector).length === 0) {
				throw new Error("Test Failed: Option specified isn't displayed");
			}

			cy.get(selector).check().should('be.checked');
		});
	}

	/**
	 * Verifies the required error for selecting a Coastal Access subtype
	 * in both the error summary and inline message.
	 */
	verifyErrorBanner(): void {
		cy.verifyErrorSummary('Select the case subtype', {
			href: '#coastalAccess',
			inlineId: 'coastalAccess-error'
		});
	}
}

export default new CommonLandSubtypePage();
