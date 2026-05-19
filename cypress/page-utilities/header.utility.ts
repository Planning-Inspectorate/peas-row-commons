class HeaderUtility {
	header = '.pins-header';
	serviceNavigation = '.govuk-service-navigation';
	navLinks = 'a.govuk-service-navigation__link';

	isHeaderDisplayed(): void {
		cy.get(this.header)
			.should('exist')
			.and('be.visible')
			.within(() => {
				cy.contains('Planning Inspectorate').should('exist');
			});

		cy.get(this.serviceNavigation)
			.should('exist')
			.and('be.visible')
			.within(() => {
				cy.contains(this.navLinks, 'MPESC').should('be.visible').and('have.attr', 'href', '/');

				cy.contains(this.navLinks, 'Assigned to me')
					.should('be.visible')
					.and('have.attr', 'href', '/cases/personal-list');

				cy.contains(this.navLinks, 'All cases').should('be.visible').and('have.attr', 'href', '/cases');

				cy.contains(this.navLinks, 'Create a case')
					.should('be.visible')
					.and('have.attr', 'href', '/cases/create-a-case');

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

		cy.get(this.serviceNavigation)
			.should('be.visible')
			.within(() => {
				cy.contains(this.navLinks, linkTextMap[option]).should('exist').and('be.visible').click();
			});
	}
}

export default new HeaderUtility();
