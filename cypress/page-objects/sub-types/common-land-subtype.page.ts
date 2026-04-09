import type { CommonLand } from '../../types/journey-subtypes.ts';

class CommonLandSubtypePage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('Common Land subtype');
		cy.verifyPageTitle('Which Common Land subtype is it?');
		cy.verifyPageURL('/cases/create-a-case/questions/common-land-subtype');

		const labels = [
			'Commons for Ecclesiastical Purposes',
			'Commons in Greater London',
			'Compulsory Purchase of Common Land',
			'Deregistration & Exchange',
			'Inclosure',
			'Inclosure : obsolescent functions',
			'Land Exchange',
			'Local Acts and Provisional Order Confirmation Acts',
			'Public Access to Commons - limitations and restrictions',
			'Referred applications from Commons Registration Authorities',
			'Scheme of Management',
			'Stint Rates',
			'Works on Common Land',
			'Works on Common Land (National Trust)'
		];

		labels.forEach((text) => {
			cy.contains('label.govuk-radios__label', text).should('exist').and('be.visible');
		});

		cy.get('input[type="radio"][name="commonLand"]').should('have.length', labels.length);

		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

	selectCommonLandSubtype(option: CommonLand): void {
		const selectorMap: Record<typeof option, string> = {
			ecclesiastical: '[data-cy="answer-commons-ecclesiastical"]',
			greaterLondon: '[data-cy="answer-commons-greater-london"]',
			compulsoryPurchase: '[data-cy="answer-compulsory-purchase-cl"]',
			deregistrationExchange: '[data-cy="answer-deregistration-exchange"]',
			inclosure: '[data-cy="answer-inclosure"]',
			inclosureObsolescent: '[data-cy="answer-inclosure-obsolescent"]',
			landExchange: '[data-cy="answer-land-exchange"]',
			localActs: '[data-cy="answer-local-acts"]',
			publicAccessLimitations: '[data-cy="answer-public-access-limitations"]',
			referredApplications: '[data-cy="answer-referred-applications"]',
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

			cy.get(selector).should('exist').and('be.visible').check().should('be.checked');
		});
	}

	/**
	 * Verifies the required error for selecting a Common Land subtype
	 * in both the error summary and inline message.
	 */
	verifyErrorBanner(): void {
		cy.verifyErrorSummary('Select the case subtype', {
			href: '#commonLand',
			inlineId: 'commonLand-error'
		});
	}
}

export default new CommonLandSubtypePage();
