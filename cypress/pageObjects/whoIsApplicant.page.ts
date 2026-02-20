class WhoApplicantPage {
	isPageDisplayed(): void {
		cy.contains('label', 'Who is the applicant?').should('exist').and('be.visible');
		cy.contains('#applicant-hint', 'Enter the main party e.g applicant, server, utility company')
			.should('exist')
			.and('be.visible');

		cy.get('#applicant').should('exist').and('be.visible');
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

	enterApplicant(applicant?: string): string {
		const valueToUse = applicant !== undefined ? applicant : Cypress._.sample(this.defaultApplicants)!;

		const input = cy.get('#applicant').should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}
}

export default new WhoApplicantPage();
