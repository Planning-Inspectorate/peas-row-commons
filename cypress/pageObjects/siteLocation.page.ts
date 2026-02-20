class SiteApplicantPage {
	isPageDisplayed(): void {
		cy.contains('label', 'What is the site location if no address was added?').should('exist').and('be.visible');
		cy.contains('#location-hint', 'For example, name of common, village green, area or body of water')
			.should('exist')
			.and('be.visible');

		cy.get('#location').should('exist').and('be.visible');
		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
		cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible');
	}

	private readonly defaultSiteLocations = [
		'Blackdown Common',
		'Ashford Village Green',
		'Hampstead Heath extension',
		'Lower Moor Common',
		'Stoke Common grazing land',
		'Westfield Open Common',
		'Land north of Little Waltham',
		'Fields south of Brook Lane, Harbury',
		'Meadow adjacent to Church Road, Longford',
		'Open land behind Mill Farm, Otley',
		'Former allotments at Green Lane',
		'River Thames foreshore at Teddington',
		'Reservoir land near Anglian Water works',
		'Coastal margin at Seaford Head',
		'Land surrounding Willow Brook',
		'Salt marsh adjacent to estuary at Burnham',
		'Disused railway cutting near Station Road',
		'Land beneath overhead power lines at Oakham',
		'Public open space beside A47 bypass',
		'Grazing land adjoining National Trust property'
	] as const;

	enterSiteLocation(applicant?: string): string {
		const valueToUse = applicant !== undefined ? applicant : Cypress._.sample(this.defaultSiteLocations)!;

		const input = cy.get('#location').should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}
}

export default new SiteApplicantPage();
