class WhoAuthorityPage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('Who is the authority?');
		cy.verifyPageTitle('Who is the authority? (optional)');
		cy.verifyPageURL('/cases/create-a-case/questions/authority');

		cy.contains('#authority-hint', 'Enter the Local Planning Authority or Common Registration Authority')
			.should('exist')
			.and('be.visible');

		cy.get('#authority').should('exist').and('be.visible');
		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
		cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible');
	}

	private readonly defaultApplicants = [
		'Applicant',
		'Server',
		'Utility company',
		'Local Authority',
		'County Council',
		'District Council',
		'Parish Council',
		'Town Council',
		'Highways Authority',
		'National Grid',
		'Network Rail',
		'Environment Agency',
		'Natural England',
		'Transport for London',
		'Highways England',
		'Water Utility Company',
		'Energy Provider',
		'Telecommunications Provider',
		'Landowner',
		'Property Developer',
		'Planning Consultant',
		'Solicitors on behalf of applicant',
		'Private Individual'
	] as const;

	enterAuthority(applicant?: string): string {
		const valueToUse = applicant !== undefined ? applicant : Cypress._.sample(this.defaultApplicants)!;

		const input = cy.get('#authority').should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}
}

export default new WhoAuthorityPage();
