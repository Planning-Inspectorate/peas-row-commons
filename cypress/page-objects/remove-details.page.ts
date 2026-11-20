class RemoveDetailsPage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('Remove details');
		cy.verifyPageTitle('Remove ');

		cy.contains('h1.govuk-heading-l', /^Remove /).should('be.visible');

		cy.get('[data-cy="button-remove"]')
			.should('be.visible')
			.and('have.attr', 'type', 'submit')
			.and('have.attr', 'name', 'remove')
			.and('have.attr', 'value', 'remove');

		cy.get('a[data-cy="button-back"]').should('be.visible').and('contain.text', 'Cancel').and('have.attr', 'href');
	}

	remove(): void {
		cy.get('[data-cy="button-remove"]').should('be.visible').click();
	}

	cancel(): void {
		cy.get('a[data-cy="button-back"]').should('be.visible').click();
	}
}

export default new RemoveDetailsPage();
