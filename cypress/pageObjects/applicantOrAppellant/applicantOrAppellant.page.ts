type ApplicantDetailsPageMode = 'createCase' | 'existingCase';
type ApplicantDetailsState = 'withDetails' | 'noDetails';

class ApplicantOrAppellantPage {
	isPageDisplayed(mode: ApplicantDetailsPageMode, state: ApplicantDetailsState): void {
		cy.verifyPageLoaded('Applicant or appellant details');
		cy.verifyPageTitle('Check applicant or appellant details');

		if (mode === 'createCase') {
			cy.verifyPageURL('/cases/create-a-case/questions/applicant-details');
		} else {
			cy.verifyPageURL('/case-details/applicant-details');
		}

		cy.contains('h1.govuk-heading-l', 'Check applicant or appellant details').should('exist').and('be.visible');

		if (state === 'noDetails') {
			cy.contains(
				'p.govuk-body',
				'Add one or more applicants or appellants. No applicant or appellant details have been added.'
			)
				.should('exist')
				.and('be.visible');
		} else {
			cy.get('table.govuk-table').should('exist').and('be.visible');

			cy.get('thead.govuk-table__head').within(() => {
				cy.contains('th', 'Name').should('exist').and('be.visible');
				cy.contains('th', 'Address').should('exist').and('be.visible');
				cy.contains('th', 'Contact').should('exist').and('be.visible');
				cy.contains('th', 'Actions').should('exist').and('be.visible');
			});

			cy.get('tbody.govuk-table__body').find('tr.govuk-table__row').should('have.length.at.least', 1);

			cy.get('tbody.govuk-table__body tr.govuk-table__row').each(($row) => {
				cy.wrap($row).within(() => {
					cy.contains('a.govuk-link', 'Change').should('exist').and('be.visible').and('have.attr', 'href');

					cy.contains('a.govuk-link', 'Remove').should('exist').and('be.visible').and('have.attr', 'href');
				});
			});
		}

		cy.contains('a.govuk-button--secondary', 'Add details')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'href')
			.and(
				'match',
				mode === 'createCase'
					? /\/cases\/create-a-case\/questions\/applicant-details\/add\//
					: /\/cases\/.*\/applicant-details\/add\//
			);

		if (mode === 'existingCase' || state === 'withDetails') {
			cy.get('[data-cy="button-save-and-continue"]')
				.should('exist')
				.and('be.visible')
				.and('have.attr', 'type', 'submit');

			cy.contains('a.govuk-button--secondary', 'Cancel').should('exist').and('be.visible').and('have.attr', 'href');
		}

		cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible');
	}
}

export default new ApplicantOrAppellantPage();
