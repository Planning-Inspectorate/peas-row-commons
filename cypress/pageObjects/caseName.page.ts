class CaseNamePage {
	isPageDisplayed(): void {
		cy.contains('label', 'What is the case name?').should('exist').and('be.visible');

		cy.get('#name').should('exist').and('be.visible');

		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

	enterCaseName(caseName: string): void {
		cy.get('#name').should('exist').and('be.visible').clear().type(caseName).should('have.value', caseName);
	}

	isErrorDisplayed(): void {
		cy.get('.govuk-error-summary').should('exist').and('be.visible');
		cy.contains('.govuk-error-summary__title', 'There is a problem').should('exist').and('be.visible');

		cy.contains('.govuk-error-summary__list a', 'Enter the case name')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'href', '#name');

		cy.get('#name-error').should('exist').and('be.visible').and('contain.text', 'Enter the case name');
		cy.get('#name').should('exist').and('have.class', 'govuk-input--error');
	}
}

export default CaseNamePage;
