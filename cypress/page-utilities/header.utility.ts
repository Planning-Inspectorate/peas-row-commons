class HeaderUtility {
	header = '#pins-header';
	navLinks = 'a.govuk-header__link';

	isHeaderDisplayed() {
		cy.get(this.header)
			.should('exist')
			.and('be.visible')
			.within(() => {
				cy.get('.pins-header__logo').should('exist').and('be.visible');

				cy.contains('Planning Inspectorate').should('be.visible');

				cy.contains('Manage planning, environmental and specialist casework').should('be.visible');

				cy.contains(this.navLinks, 'All cases').should('be.visible').and('have.attr', 'href', '/');

				cy.contains(this.navLinks, 'Create a case')
					.should('be.visible')
					.and('have.attr', 'href', '/cases/create-a-case/questions/casework-area');

				cy.contains(this.navLinks, 'Sign out').should('be.visible').and('have.attr', 'href', '/auth/signout');
			});
	}

	clickHeaderLink(option: 'assignedToMe' | 'allCases' | 'createCase' | 'signOut'): void {
		const linkTextMap = {
			assignedToMe: 'Assigned to me',
			allCases: 'All cases',
			createCase: 'Create a case',
			signOut: 'Sign out'
		};

		cy.get(this.header)
			.should('be.visible')
			.within(() => {
				cy.contains('a.govuk-service-navigation__link', linkTextMap[option]).should('exist').and('be.visible').click();
			});
	}
}

export default new HeaderUtility();
