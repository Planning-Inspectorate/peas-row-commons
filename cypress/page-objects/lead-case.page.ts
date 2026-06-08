class LeadCasePage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('Is this the lead case?');
		cy.verifyPageTitle('Is this the lead case?');
		cy.contains('h1.govuk-fieldset__heading', 'Is this the lead case?').should('exist').and('be.visible');
		cy.get('input[type="radio"][name="linkedCaseIsLead"]').should('have.length', 2);
		cy.contains('label.govuk-radios__label', 'Yes').should('exist').and('be.visible');
		cy.contains('label.govuk-radios__label', 'No').should('exist').and('be.visible');
		cy.get('[data-cy="button-save-and-continue"]')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'type', 'submit')
			.and('contain.text', 'Continue');
	}

	selectAnswer(answer: 'yes' | 'no'): void {
		cy.get(`[data-cy="answer-${answer}"]`).should('exist').check().should('be.checked');
	}

	verifyErrorBanner(): void {
		cy.verifyErrorSummary('Select yes if this is the lead case', {
			href: '#linkedCaseIsLead',
			inlineId: 'linkedCaseIsLead-error'
		});
	}
}

export default new LeadCasePage();
