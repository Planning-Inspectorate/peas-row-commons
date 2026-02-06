import { UkAddress } from 'cypress/types/standard.ts';
import { generateUkAddress } from '../pageUtilities/generate.utility.ts';

class SiteAddressPage {
	isPageDisplayed(): void {
		cy.contains('h1', 'What is the site address?').should('exist').and('be.visible');
		cy.contains('.govuk-hint', '(optional)').should('exist').and('be.visible');
		cy.get('#address-line-1').should('exist').and('be.visible');
		cy.get('#address-line-2').should('exist').and('be.visible');
		cy.get('#address-town').should('exist').and('be.visible');
		cy.get('#address-county').should('exist').and('be.visible');
		cy.get('#address-postcode').should('exist').and('be.visible');
		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
		cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible');
	}

	enterSiteAddress(overrides?: UkAddress): UkAddress {
		const address = {
			...generateUkAddress(),
			...overrides
		};

		if (address.line1) {
			cy.get('#address-line-1').clear().type(address.line1).should('have.value', address.line1);
		}

		if (address.line2) {
			cy.get('#address-line-2').clear().type(address.line2).should('have.value', address.line2);
		}

		if (address.town) {
			cy.get('#address-town').clear().type(address.town).should('have.value', address.town);
		}

		if (address.county) {
			cy.get('#address-county').clear().type(address.county).should('have.value', address.county);
		}

		if (address.postcode) {
			cy.get('#address-postcode').clear().type(address.postcode).should('have.value', address.postcode);
		}

		return address;
	}
}

export default SiteAddressPage;
