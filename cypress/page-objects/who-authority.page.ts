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

	/**
	 * Opens the authority autocomplete, selects a random option,
	 * and returns the selected value.
	 */
	selectRandomAuthority(): Cypress.Chainable<string> {
		return cy
			.get('input#authorityId[role="combobox"]')
			.should('exist')
			.and('be.visible')
			.click()
			.type(' ')
			.then(() => {
				return cy
					.get('#authorityId__listbox', { timeout: 60000 })
					.should('exist')
					.and('be.visible')
					.then(() => {
						return cy.get('[id^="authorityId__option--"]').then(($options) => {
							const count = $options.length;

							if (count === 0) {
								throw new Error('Test Failed: No authority options were found');
							}

							cy.log(`Authority options found: ${count}`);

							const randomIndex = Cypress._.random(0, count - 1);
							const option = $options[randomIndex];

							const selectedValue = option.innerText.trim();

							return cy
								.wrap(option)
								.click()
								.then(() => {
									cy.get('#authorityId').should('have.value', selectedValue);
									return selectedValue;
								});
						});
					});
			});
	}
}

export default new WhoAuthorityPage();
