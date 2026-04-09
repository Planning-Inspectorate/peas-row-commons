class AddressDetailsPage {
	/**
	 * Verifies the address details page for either the applicant/appellant
	 * or objector flow, including page-specific title, URL and field names.
	 */
	isPageDisplayed(type: 'applicantAppellant' | 'objector'): void {
		const config = {
			applicantAppellant: {
				pageName: 'A or A address details',
				title: 'Applicant or appellant address details',
				urlPart: '/applicant-address',
				namePrefix: 'applicantAddress'
			},
			objector: {
				pageName: 'Objector address details',
				title: 'Objector address details (optional)',
				urlPart: '/objector-address',
				namePrefix: 'objectorAddress'
			}
		} as const;

		const { pageName, title, urlPart, namePrefix } = config[type];

		cy.verifyPageLoaded(pageName);
		cy.verifyPageTitle(title);
		cy.verifyPageURL(urlPart);

		cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible');

		cy.get('#address-line-1').should('exist').and('be.visible').and('have.attr', 'name', `${namePrefix}_addressLine1`);

		cy.get('#address-line-2').should('exist').and('be.visible').and('have.attr', 'name', `${namePrefix}_addressLine2`);

		cy.get('#address-town').should('exist').and('be.visible').and('have.attr', 'name', `${namePrefix}_townCity`);

		cy.get('#address-county').should('exist').and('be.visible').and('have.attr', 'name', `${namePrefix}_county`);

		cy.get('#address-postcode').should('exist').and('be.visible').and('have.attr', 'name', `${namePrefix}_postcode`);

		cy.get('[data-cy="button-save-and-continue"]')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'type', 'submit')
			.and('contain.text', 'Continue');
	}
}

export default new AddressDetailsPage();
