class ExternalReferencePage {
	isPageDisplayed(): void {
		cy.contains('label', 'What is the external reference? (optional)').should('exist').and('be.visible');

		cy.get('#externalReference').should('exist').and('be.visible');

		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

	enterExternalReference(reference: string): void {
		cy.get('#externalReference')
			.should('exist')
			.and('be.visible')
			.clear()
			.type(reference)
			.should('have.value', reference);
	}
}

export default ExternalReferencePage;
