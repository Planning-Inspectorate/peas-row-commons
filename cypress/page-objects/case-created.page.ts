import type { Journeys } from '../types/journeys.ts';
import HeaderUtility from 'cypress/page-utilities/header.utility.ts';
import FooterUtility from 'cypress/page-utilities/footer.utility.ts';

class CaseCreatedPage {
	isPageDisplayed(journey: Journeys): void {
		HeaderUtility.isHeaderDisplayed();
		cy.verifyPageLoaded('New case has been created');
		cy.verifyPageTitle('New case has been created');
		cy.verifyPageURL('/success');

		cy.contains('.govuk-panel__body', 'The case reference number').should('exist').and('be.visible');

		cy.get('.govuk-panel__body strong')
			.should('exist')
			.and('be.visible')
			.invoke('text')
			.then((text) => {
				const ref = text.trim();
				if (!ref) throw new Error('Test Failed: Case reference number is empty');
			});

		this.validateRefNumberAgainstJourney(journey);

		cy.contains('a.govuk-link', 'Continue to case details page')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'href')
			.and('match', /^\/cases\/[0-9a-f-]+$/i);

		FooterUtility.isFooterDisplayed();
	}

	private validateRefNumberAgainstJourney(journey: Journeys): void {
		const escapedPrefix = Cypress._.escapeRegExp(journey.referencePrefix);

		cy.get('.govuk-panel__body strong')
			.should('exist')
			.invoke('text')
			.then((text) => {
				const ref = text.trim();

				expect(ref).to.match(
					new RegExp(`^${escapedPrefix}\\d{5}$`),
					`Expected reference to start with ${journey.referencePrefix}`
				);
			});
	}

	clickContinueToCaseDetails(): void {
		cy.contains('a.govuk-link', 'Continue to case details page').should('exist').and('be.visible').click();
	}

	getCaseReference(): Cypress.Chainable<string> {
		return cy
			.get('.govuk-panel__body strong')
			.should('exist')
			.and('be.visible')
			.invoke('text')
			.then((t) => t.trim())
			.then((ref) => {
				if (!ref) throw new Error('Test Failed: Case reference number is empty');
				return ref;
			});
	}
}

export default new CaseCreatedPage();
