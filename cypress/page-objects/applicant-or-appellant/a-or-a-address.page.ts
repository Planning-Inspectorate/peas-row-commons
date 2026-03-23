class AOrAAddressPage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('A or A address details');
		cy.verifyPageTitle('Applicant or appellant address details');
		cy.verifyPageURL('/applicant-address');

		cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible');

		cy.contains('.govuk-hint', 'Optional').should('exist').and('be.visible');

		cy.get('#address-line-1')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'name', 'applicantAddress_addressLine1');
		cy.get('#address-line-2')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'name', 'applicantAddress_addressLine2');
		cy.get('#address-town').should('exist').and('be.visible').and('have.attr', 'name', 'applicantAddress_townCity');
		cy.get('#address-county').should('exist').and('be.visible').and('have.attr', 'name', 'applicantAddress_county');
		cy.get('#address-postcode').should('exist').and('be.visible').and('have.attr', 'name', 'applicantAddress_postcode');

		cy.get('[data-cy="button-save-and-continue"]')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'type', 'submit')
			.and('contain.text', 'Continue');
	}
}

export default new AOrAAddressPage();
