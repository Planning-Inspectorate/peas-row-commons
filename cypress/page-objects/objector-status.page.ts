type ObjectorStatusAnswer = 'admissible' | 'inadmissible' | 'upheld' | 'withdrawn' | 'na';

class ObjectorStatusPage {
	private readonly objectorStatusLabelMap: Record<ObjectorStatusAnswer, string> = {
		admissible: 'Admissible',
		inadmissible: 'Inadmissible',
		upheld: 'Upheld',
		withdrawn: 'Withdrawn',
		na: 'Not applicable'
	};

	isPageDisplayed(): void {
		cy.verifyPageLoaded('What is the objector status?');
		cy.verifyPageTitle('What is the objector status?');

		cy.contains('h1.govuk-fieldset__heading', 'What is the objector status?').should('exist').and('be.visible');
		cy.get('input[type="radio"][name="objectorStatusId"]').should('have.length', 5);

		Object.values(this.objectorStatusLabelMap).forEach((label) => {
			cy.contains('label.govuk-radios__label', label).should('exist').and('be.visible');
		});

		cy.get('[data-cy="button-save-and-continue"]')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'type', 'submit')
			.and('contain.text', 'Continue');
	}

	selectAnswer(answer?: ObjectorStatusAnswer): string {
		const answerToUse = answer ?? Cypress._.sample(Object.keys(this.objectorStatusLabelMap) as ObjectorStatusAnswer[])!;

		cy.get(`[data-cy="answer-${answerToUse}"]`).should('exist').check().should('be.checked');

		return this.objectorStatusLabelMap[answerToUse];
	}

	verifyErrorBanner(): void {
		cy.verifyErrorSummary(`Select the status of the objector, or 'Not applicable'`, {
			href: '#objectorStatusId',
			inlineId: 'objectorStatusId-error'
		});
	}
}

export default new ObjectorStatusPage();
