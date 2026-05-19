import type { Journeys } from 'cypress/types/journeys.ts';
import AnswersUtility from 'cypress/page-utilities/answers.utility.ts';
import { runPageValidation } from 'cypress/page-utilities/page-validation.utility.ts';

/**
 * Expected stable question labels shown on the Check your answers page.
 * Dynamic subtype rows are checked separately using the journey case type label.
 */
export const expectedKeys = [
	'What area does this new case relate to?',
	'Which case type is it?',
	'What is the case name?',
	'What is the external reference? (optional)',
	'When was the case received?',
	'Who is the applicant or appellant?',
	'What is the site address? (optional)',
	'What is the site location if no address was added? (optional)',
	'Who is the authority? (optional)',
	'Who is the assigned case officer?'
] as const;

export type CheckYourAnswersKey = (typeof expectedKeys)[number];

class CheckAnswersPage {
	isPageDisplayed(fullValidation = true, journey?: Journeys): void {
		runPageValidation(
			fullValidation,
			() => {
				cy.verifyPageLoaded('Check your answers');
				cy.verifyPageTitle('Check your answers');
			},
			() => {
				cy.get('dl.govuk-summary-list').should('exist').and('be.visible');

				expectedKeys.forEach((keyText) => {
					cy.contains('.govuk-summary-list__key', keyText).should('exist').and('be.visible');
				});

				if (journey) {
					cy.contains('.govuk-summary-list__key', AnswersUtility.getExpectedCaseTypeLabel(journey))
						.should('exist')
						.and('be.visible');
				}

				cy.get('.govuk-summary-list__row').each(($row) => {
					cy.wrap($row).within(() => {
						cy.get('.govuk-summary-list__value').should('exist').and('be.visible');
						cy.get('.govuk-summary-list__actions a.govuk-link').should('exist').and('be.visible');
					});
				});

				cy.contains('button.govuk-button', 'Save and continue')
					.should('exist')
					.and('be.visible')
					.and('have.attr', 'type', 'submit');
			}
		);
	}

	validateCheckYourAnswersRows(journey: Journeys): void {
		const subtypeKey = AnswersUtility.getExpectedCaseTypeLabel(journey);

		const mandatoryKeys: readonly string[] = [
			'What area does this new case relate to?',
			'Which case type is it?',
			subtypeKey,
			'What is the case name?',
			'When was the case received?',
			'Who is the applicant or appellant?',
			'Who is the assigned case officer?'
		];

		const optionalKeys: readonly string[] = [
			'What is the external reference? (optional)',
			'What is the site address? (optional)',
			'What is the site location if no address was added? (optional)',
			'Who is the authority? (optional)'
		];

		const assertRow = (keyText: string, rule: 'mandatory' | 'optional') => {
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

	clickCheckYourAnswersAction(keyText: string, expectedAction?: 'Change' | 'Answer'): void {
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

	checkRowValue(keyText: string, expectedValues: string[]): void {
		cy.contains('.govuk-summary-list__key', keyText)
			.parents('.govuk-summary-list__row')
			.should('exist')
			.within(() => {
				cy.get('.govuk-summary-list__value')
					.invoke('text')
					.then((rawText) => {
						const actualText = rawText.trim().replace(/\s+/g, ' ');

						expectedValues.forEach((value) => {
							const trimmed = value.trim();

							if (trimmed !== '' && !actualText.includes(trimmed)) {
								throw new Error(
									[
										'Check Your Answers validation failed',
										`Row: "${keyText}"`,
										`Expected value: "${trimmed}"`,
										`Actual value: "${actualText}"`
									].join('\n')
								);
							}
						});
					});
			});
	}

	verifyCheckYourAnswers(journey: Journeys): void {
		AnswersUtility.get().then((answers) => {
			const subtypeKey = AnswersUtility.getExpectedCaseTypeLabel(journey);

			this.checkRowValue('What area does this new case relate to?', [
				journey.caseworkArea === 'planning'
					? 'Planning, Environmental and Applications'
					: 'Rights of Way and Common Land'
			]);

			this.checkRowValue('Which case type is it?', [AnswersUtility.getExpectedCaseTypeLabel(journey)]);

			this.checkRowValue(subtypeKey, [AnswersUtility.getExpectedSubtypeLabel(journey)]);

			this.checkRowValue('What is the case name?', [answers.caseName ?? '']);

			this.checkRowValue('What is the external reference? (optional)', [answers.externalReference ?? '']);

			this.checkRowValue('When was the case received?', [
				AnswersUtility.formatDateForCheckAnswers(answers.receivedDate)
			]);

			this.checkRowValue(
				'Who is the applicant or appellant?',
				answers.applicants?.flatMap((entry) => [
					entry.firstName ?? '',
					entry.lastName ?? '',
					entry.orgName ?? '',
					entry.address?.line1 ?? '',
					entry.address?.line2 ?? '',
					entry.address?.town ?? '',
					entry.address?.county ?? '',
					entry.address?.postcode ?? '',
					entry.contact?.email ?? '',
					entry.contact?.phone ?? ''
				]) ?? []
			);

			this.checkRowValue('What is the site address? (optional)', [
				answers.siteAddress?.line1 ?? '',
				answers.siteAddress?.line2 ?? '',
				answers.siteAddress?.town ?? '',
				answers.siteAddress?.county ?? '',
				answers.siteAddress?.postcode ?? ''
			]);

			this.checkRowValue('What is the site location if no address was added? (optional)', [answers.siteLocation ?? '']);

			this.checkRowValue('Who is the authority? (optional)', [answers.authority ?? '']);

			this.checkRowValue('Who is the assigned case officer?', [answers.caseOfficer ?? '']);
		});
	}
}

export default new CheckAnswersPage();
