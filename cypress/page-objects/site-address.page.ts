import { runPageValidation } from 'cypress/page-utilities/page-validation.utility.ts';

class SiteAddressPage {
	isPageDisplayed(fullValidation = true): void {
		runPageValidation(
			fullValidation,
			() => {
				cy.verifyPageLoaded('What is the site address?');
				cy.verifyPageTitle('What is the site address?');
			},
			() => {
				cy.verifyPageURL('site-address');
				cy.contains('h1.govuk-fieldset__heading', 'What is the site address? (optional)')
					.should('exist')
					.and('be.visible');
				cy.contains('.govuk-hint', 'You are able to add a site location on the next page if there is no site address.')
					.should('exist')
					.and('be.visible');
				cy.get('#address-line-1')
					.should('exist')
					.and('be.visible')
					.and('have.attr', 'name', 'siteAddress_addressLine1');
				cy.get('#address-line-2')
					.should('exist')
					.and('be.visible')
					.and('have.attr', 'name', 'siteAddress_addressLine2');
				cy.get('#address-town').should('exist').and('be.visible').and('have.attr', 'name', 'siteAddress_townCity');
				cy.get('#address-county').should('exist').and('be.visible').and('have.attr', 'name', 'siteAddress_county');
				cy.get('#address-postcode').should('exist').and('be.visible').and('have.attr', 'name', 'siteAddress_postcode');
				cy.get('[data-cy="button-save-and-continue"]')
					.should('exist')
					.and('be.visible')
					.and('contain.text', 'Continue');
				cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible');
			}
		);
	}
}

export default new SiteAddressPage();
