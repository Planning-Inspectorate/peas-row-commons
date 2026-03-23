/**
 * Expected question labels shown on the Check your answers page.
 * Used to verify summary rows and type-safe row interactions.
 */
export const expectedKeys = [
	'What area does this new case relate to?',
	'subtype is it?',
	'What is the case name?',
	'What is the external reference? (optional)',
	'When was the case received?',
	'Who is the applicant or appellant?',
	'What is the site address?',
	'What is the site location if no address was added?',
	'Who is the authority? (optional)',
	'Who is the assigned case officer?'
] as const;

export type CheckYourAnswersKey = (typeof expectedKeys)[number];

class CheckAnswersPage {
	isPageDisplayed(): void {
		cy.contains('h1.govuk-heading-l', 'Check your answers').should('exist').and('be.visible');

		cy.get('dl.govuk-summary-list').should('exist').and('be.visible');

		expectedKeys.forEach((keyText) => {
			cy.contains('.govuk-summary-list__key', keyText).should('exist').and('be.visible');
		});

		cy.get('.govuk-summary-list__row').each(($row) => {
			cy.wrap($row).within(() => {
				cy.get('.govuk-summary-list__value').should('exist').and('be.visible');

				cy.get('.govuk-summary-list__actions a.govuk-link').should('exist').and('be.visible');
			});
		});

		cy.contains('button.govuk-button', 'Accept & Submit')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'type', 'submit');
	}

	/**
	 * Verifies each summary row shows the correct action state:
	 * mandatory answers use Change, optional answers use Change or Answer.
	 */
	validateCheckYourAnswersRows(): void {
		const mandatoryKeys: readonly CheckYourAnswersKey[] = [
			'What area does this new case relate to?',
			'subtype is it?',
			'What is the case name?',
			'When was the case received?',
			'Who is the applicant or appellant?',
			'Who is the assigned case officer?'
		];

		const optionalKeys: readonly CheckYourAnswersKey[] = [
			'What is the external reference? (optional)',
			'What is the site address?',
			'What is the site location if no address was added?',
			'Who is the authority? (optional)'
		];

		/**
		 * Verifies a single summary row has the expected action
		 * based on whether the answer is mandatory or optional.
		 */
		const assertRow = (keyText: CheckYourAnswersKey, rule: 'mandatory' | 'optional') => {
			cy.contains('.govuk-summary-list__key', keyText)
				.parents('.govuk-summary-list__row')
				.should('exist')
				.within(() => {
					cy.get('.govuk-summary-list__value')
						.invoke('text')
						.then((rawValue) => {
							const valueText = rawValue.trim();

							cy.get('.govuk-summary-list__actions a.govuk-link')
								.invoke('text')
								.then((rawAction) => {
									const actionText = rawAction.trim();

									if (rule === 'mandatory') {
										expect(actionText).to.contain('Change');
										return;
									}

									if (valueText.length > 0) {
										expect(actionText).to.contain('Change');
									} else {
										expect(actionText).to.contain('Answer');
									}
								});
						});
				});
		};

		mandatoryKeys.forEach((key) => assertRow(key, 'mandatory'));
		optionalKeys.forEach((key) => assertRow(key, 'optional'));
	}

	/**
	 * Clicks the action link for a specific summary row
	 * and optionally checks the expected action label first.
	 */
	clickCheckYourAnswersAction(keyText: CheckYourAnswersKey, expectedAction?: 'Change' | 'Answer'): void {
		cy.contains('.govuk-summary-list__key', keyText)
			.parents('.govuk-summary-list__row')
			.should('exist')
			.within(() => {
				cy.get('.govuk-summary-list__actions a.govuk-link').then(($link) => {
					const actionText = $link.text().trim();

					if (expectedAction && !actionText.includes(expectedAction)) {
						throw new Error(`Expected action "${expectedAction}" for "${keyText}" but found "${actionText}"`);
					}

					cy.wrap($link).click();
				});
			});
	}

	/**
	 * Clicks the final Accept & Submit button to create the case.
	 */
	clickAcceptAndSubmitButton(): void {
		cy.contains('button', 'Accept & Submit').should('exist').and('be.visible').click();
	}
}

export default new CheckAnswersPage();
