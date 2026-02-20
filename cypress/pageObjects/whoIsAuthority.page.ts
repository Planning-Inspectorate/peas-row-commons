class WhoAuthorityPage {
	isPageDisplayed(): void {
		cy.contains('label.govuk-label--l[for="caseOfficerId"]', 'Who is the assigned case officer?')
			.should('exist')
			.and('be.visible');

		cy.get('input[role="combobox"][aria-controls="caseOfficerId__listbox"]')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'type', 'text');

		cy.get('select[name="caseOfficerId"]')
			.should('exist')
			.and('have.attr', 'id', 'caseOfficerId-select')
			.and('have.attr', 'style')
			.and('contain', 'display: none');

		cy.get('ul[role="listbox"][id="caseOfficerId__listbox"]').should('exist');
		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
		cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible');
	}

	selectRandomCaseOfficer(): void {
		cy.get('input#caseOfficerId[role="combobox"]').should('exist').and('be.visible').click().type(' ');
		cy.get('#caseOfficerId__listbox', { timeout: 60000 }).should('exist').and('be.visible');
		cy.get('body').then(($body) => {
			const count = $body.find('[id^="caseOfficerId__option--"]').length;

			if (count === 0) {
				throw new Error('Test Failed: No case officer options were found');
			}

			cy.log(`Case officer options found: ${count}`);

			const optionIdPrefix = 'caseOfficerId__option--';
			const randomIndex = Cypress._.random(0, count - 1);
			const optionToClick = `#${optionIdPrefix}${randomIndex}`;

			cy.get(optionToClick).should('exist').and('be.visible').click();
		});
	}
}

export default new WhoAuthorityPage();
