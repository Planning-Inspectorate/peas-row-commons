class RemoveDetailsPage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('Are you sure you want to remove this');
		cy.verifyPageTitle('Are you sure you want to remove this');

		cy.contains('h1.govuk-fieldset__heading', 'Are you sure you want to remove this').should('exist').and('be.visible');
		cy.get('input[type="radio"][name="remove"]').should('have.length', 2);
		cy.contains('label.govuk-radios__label', 'Yes').should('exist').and('be.visible');
		cy.contains('label.govuk-radios__label', 'No').should('exist').and('be.visible');
		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible').and('have.attr', 'type', 'submit');
	}

	selectAnswer(answer: 'yes' | 'no'): void {
		cy.get(`[data-cy="answer-${answer}"]`).should('exist').check().should('be.checked');
	}
}

export default new RemoveDetailsPage();
