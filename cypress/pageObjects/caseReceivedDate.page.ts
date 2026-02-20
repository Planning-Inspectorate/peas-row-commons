import type { DateField } from '../types/standard.ts';
import type { DateErrorState } from 'cypress/types/errors.ts';
import { generateRandomDate } from '../pageUtilities/generate.utility.ts';

type DateString = 'day' | 'month' | 'year';

type DateErrorExpectation = {
	summary: Array<{ field: DateString; message: string }>;
	inline?: string;
};

class ReceivedDatePage {
	isPageDisplayed(): void {
		cy.contains('h1', 'When was the case received?').should('exist').and('be.visible');

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

	enterDate(day?: string, month?: string, year?: string): DateField {
		const randomDate = generateRandomDate();

		const date: DateField = {
			day: day ?? randomDate.day,
			month: month ?? randomDate.month,
			year: year ?? randomDate.year
		};

		cy.get('#receivedDate_day').should('exist').and('be.visible').clear().type(date.day).should('have.value', date.day);

		cy.get('#receivedDate_month')
			.should('exist')
			.and('be.visible')
			.clear()
			.type(date.month)
			.should('have.value', date.month);

		cy.get('#receivedDate_year')
			.should('exist')
			.and('be.visible')
			.clear()
			.type(date.year)
			.should('have.value', date.year);

		return date;
	}

	validateReceivedDateErrorState(state: DateErrorState): void {
		const errorMap: Record<DateErrorState, DateErrorExpectation> = {
			allEmpty: {
				summary: [
					{ field: 'month', message: 'Received date of submission month must be between 1 and 12' },
					{ field: 'year', message: 'Received date of submission year must include 4 numbers' },
					{ field: 'day', message: 'Received date of submission day must be a real day' }
				],
				inline: 'Enter Received date of submission'
			},

			dayOnly: {
				summary: [{ field: 'month', message: 'Received date of submission must include a month and year' }],
				inline: 'Received date of submission must include a month and year'
			},

			monthOnly: {
				summary: [{ field: 'day', message: 'Received date of submission must include a day and year' }],
				inline: 'Received date of submission must include a day and year'
			},

			yearOnly: {
				summary: [{ field: 'day', message: 'Received date of submission must include a day and month' }],
				inline: 'Received date of submission must include a day and month'
			},

			dayMonthOnly: {
				summary: [{ field: 'year', message: 'Received date of submission must include a year' }],
				inline: 'Received date of submission must include a year'
			},

			dayYearOnly: {
				summary: [{ field: 'month', message: 'Received date of submission must include a month' }],
				inline: 'Received date of submission must include a month'
			},

			monthYearOnly: {
				summary: [{ field: 'day', message: 'Received date of submission must include a day' }],
				inline: 'Received date of submission must include a day'
			},

			invalidDay: {
				summary: [{ field: 'day', message: 'Received date of submission day must be a real day' }],
				inline: 'Received date of submission day must be a real day'
			},

			invalidMonth: {
				summary: [{ field: 'month', message: 'Received date of submission month must be between 1 and 12' }],
				inline: 'Received date of submission month must be between 1 and 12'
			},

			invalidYear: {
				summary: [{ field: 'year', message: 'Received date of submission year must include 4 numbers' }],
				inline: 'Received date of submission year must include 4 numbers'
			}
		};

		const expected: DateErrorExpectation = errorMap[state];

		cy.get('.govuk-error-summary').should('exist').and('be.visible');
		cy.contains('.govuk-error-summary__title', 'There is a problem').should('exist').and('be.visible');

		cy.get('.govuk-error-summary__list li').should('have.length', expected.summary.length);

		expected.summary.forEach((item) => {
			const field: DateString = item.field;
			const message: string = item.message;

			cy.contains('.govuk-error-summary__list a', message)
				.should('exist')
				.and('be.visible')
				.and('have.attr', 'href', `#receivedDate_${field}`);
		});

		if (expected.inline !== undefined) {
			cy.get('#receivedDate-error').should('exist').and('be.visible').and('contain.text', expected.inline);
		}
	}
}

export default new ReceivedDatePage();
