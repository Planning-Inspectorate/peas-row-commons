class SiteAddressPage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('What is the site address?');
		cy.verifyPageTitle('What is the site address?');
		cy.verifyPageURL('/cases/create-a-case/questions/site-address');

		cy.contains('.govuk-hint', '(optional)').should('exist').and('be.visible');
		cy.get('#address-line-1').should('exist').and('be.visible');
		cy.get('#address-line-2').should('exist').and('be.visible');
		cy.get('#address-town').should('exist').and('be.visible');
		cy.get('#address-county').should('exist').and('be.visible');
		cy.get('#address-postcode').should('exist').and('be.visible');
		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
		cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible');
	}
}

export default new SiteAddressPage();
