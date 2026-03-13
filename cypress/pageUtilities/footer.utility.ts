class FooterUtility {
	header = '#pins-header';
	navLinks = 'a.govuk-header__link';

	isFooterDisplayed() {
		cy.get('footer[role="contentinfo"]').should('exist').and('be.visible');
	}

	clickFooterOption(option: 'allCases' | 'createCase' | 'signOut'): void {
		cy.get(this.header)
			.should('be.visible')
			.within(() => {
				if (option === 'allCases') {
					cy.contains(this.navLinks, 'All cases').should('exist').and('be.visible').click();
				}

				if (option === 'createCase') {
					cy.contains(this.navLinks, 'Create a case').should('exist').and('be.visible').click();
				}

				if (option === 'signOut') {
					cy.contains(this.navLinks, 'Sign out').should('exist').and('be.visible').click();
				}
			});
	}
}

export default new FooterUtility();
