class CaseCreatedPage {
	isPageDisplayed(): void {
		cy.contains('h1.govuk-panel__title', 'New case has been created').should('exist').and('be.visible');

		cy.contains('.govuk-panel__body', 'The case reference number').should('exist').and('be.visible');

		cy.get('.govuk-panel__body strong')
			.should('exist')
			.and('be.visible')
			.invoke('text')
			.then((text) => {
				const ref = text.trim();
				if (!ref) throw new Error('Test Failed: Case reference number is empty');
			});

		cy.contains('a.govuk-link', 'Continue to case details page')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'href')
			.and('match', /^\/cases\/[0-9a-f-]+$/i);
	}

	validateReferenceNumber(expectedPrefix: string): void {
		cy.get('.govuk-panel__body strong')
			.should('exist')
			.invoke('text')
			.then((text) => {
				const ref = text.trim();

				expect(ref).to.match(
					new RegExp(`^${expectedPrefix}\\d{5}$`),
					`Expected reference to start with ${expectedPrefix}`
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
