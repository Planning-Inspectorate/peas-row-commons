import type { Journeys } from '../types/journeys.ts';
import { buildCaseName } from '../page-utilities/generate.utility.ts';
import { runPageValidation } from 'cypress/page-utilities/page-validation.utility.ts';

type CaseNameErrorType = 'required' | 'tooLong';

type CaseNameErrorConfig = {
	message: string;
	href: string;
	inlineId: string;
	inputId: string;
};

const caseNameErrorMap: Record<CaseNameErrorType, CaseNameErrorConfig> = {
	required: {
		message: 'Enter the case name',
		href: '#name',
		inlineId: 'name-error',
		inputId: 'name'
	},
	tooLong: {
		message: 'Case name must be less than 200 characters',
		href: '#name',
		inlineId: 'name-error',
		inputId: 'name'
	}
};

class CaseNamePage {
	isPageDisplayed(fullValidation = true): void {
		runPageValidation(
			fullValidation,
			() => {
				cy.verifyPageLoaded('Case name');
				cy.verifyPageTitle('What is the case name?');
			},
			() => {
				cy.verifyPageURL('/cases/create-a-case/questions/case-name');
				cy.get('#name').should('exist').and('be.visible');
				cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
			}
		);
	}

	enterCaseName(journey: Journeys): string;
	enterCaseName(journey: Journeys, caseName: string): string;
	enterCaseName(caseName: string): string;

	enterCaseName(arg1: Journeys | string, arg2?: string): string {
		const valueToUse = typeof arg1 === 'string' ? arg1 : (arg2 ?? buildCaseName(arg1.name));

		cy.get('#name').should('exist').and('be.visible').clear().type(valueToUse).should('have.value', valueToUse);

		return valueToUse;
	}

	verifyErrorBanner(errorType: CaseNameErrorType): void {
		const { message, href, inlineId, inputId } = caseNameErrorMap[errorType];

		cy.get('.govuk-error-summary')
			.should('exist')
			.and('be.visible')
			.within(() => {
				cy.contains('h2', 'There is a problem').should('be.visible');
				cy.get('.govuk-error-summary__list li').should('have.length', 1);
			});

		cy.verifyErrorSummary(message, {
			href,
			inlineId
		});

		cy.get(`#${inlineId}`).should('exist').and('be.visible').and('contain.text', message);

		cy.get(`#${inputId}`).should('have.class', 'govuk-input--error').and('have.attr', 'aria-describedby', inlineId);
	}
}

export default new CaseNamePage();
