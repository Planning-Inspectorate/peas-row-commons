class CaseOfficerPage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('Who is the assigned case officer?');
		cy.verifyPageTitle('Who is the assigned case officer?');
		cy.verifyPageURL('/cases/create-a-case/questions/case-officer');

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

	/**
	 * Opens the case officer combobox, waits for options to load,
	 * then selects a random officer from the list.
	 * Throws an error if no options are available.
	 */
	selectRandomCaseOfficer(): Cypress.Chainable<string> {
		return cy
			.get('input#caseOfficerId[role="combobox"]')
			.should('exist')
			.and('be.visible')
			.click()
			.type(' ')
			.then(() => {
				return cy
					.get('#caseOfficerId__listbox', { timeout: 60000 })
					.should('exist')
					.and('be.visible')
					.then(() => {
						return cy.get('[id^="caseOfficerId__option--"]').then(($options) => {
							const count = $options.length;

							if (count === 0) {
								throw new Error('Test Failed: No case officer options were found');
							}

							cy.log(`Case officer options found: ${count}`);

							const randomIndex = Cypress._.random(0, count - 1);
							const option = $options[randomIndex];

							const selectedValue = option.innerText.trim();

							return cy
								.wrap(option)
								.click()
								.then(() => {
									cy.get('#caseOfficerId').should('have.value', selectedValue);
									return selectedValue;
								});
						});
					});
			});
	}

	verifyErrorBanner(): void {
		cy.verifyErrorSummary('Select a case officer', {
			href: '#caseOfficerId',
			inlineId: 'caseOfficerId-error'
		});
	}
}

export default new CaseOfficerPage();
