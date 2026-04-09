class CaseReceivedDatePage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('Case received date');
		cy.verifyPageTitle('When was the case received?');
		cy.verifyPageURL('/cases/create-a-case/questions/case-received-date');

		cy.contains('#receivedDate-hint', 'For example, 27 3 2007').should('exist').and('be.visible');

		const fields = [
			{ label: 'Day', selector: '#receivedDate_day' },
			{ label: 'Month', selector: '#receivedDate_month' },
			{ label: 'Year', selector: '#receivedDate_year' }
		];

		fields.forEach(({ label, selector }) => {
			cy.contains('label', label).should('exist').and('be.visible');

			cy.get(selector).should('exist').and('be.visible');
		});

		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

	verifyErrorBanner(): void {
		cy.verifyErrorSummary('Enter Received date of submission', {
			href: '#receivedDate_day',
			inlineId: 'receivedDate-error'
		});
	}
}

export default new CaseReceivedDatePage();
