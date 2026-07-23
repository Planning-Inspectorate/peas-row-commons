import { generateCaseReference } from 'cypress/page-utilities/generate.utility.ts';

type AddDetailsPageType = 'related' | 'linked';

const pageConfig = {
	related: {
		title: 'Add related case details',
		fieldId: 'relatedCaseReference',
		fieldName: 'relatedCaseReference'
	},
	linked: {
		title: 'Add linked case details',
		fieldId: 'linkedCaseReference',
		fieldName: 'linkedCaseReference'
	}
} as const;

class AddDetailsPage {
	isPageDisplayed(type: AddDetailsPageType, fullValidation = true): void {
		const page = pageConfig[type];

		cy.verifyPageLoaded(page.title);
		cy.verifyPageTitle(page.title);

		if (!fullValidation) {
			return;
		}

		cy.contains('h1.govuk-fieldset__heading', page.title).should('exist').and('be.visible');

		cy.get(`#${page.fieldId}`).should('exist').and('be.visible').and('have.attr', 'name', page.fieldName);

		cy.get('[data-cy="button-save-and-continue"]')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'type', 'submit')
			.and('contain.text', 'Continue');
	}

	enterCaseText(type: AddDetailsPageType, value?: string): string {
		const page = pageConfig[type];
		const valueToUse = value !== undefined ? value : generateCaseReference(type);
		const input = cy.get(`#${page.fieldId}`).should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}

	validateCaseText(type: AddDetailsPageType, expectedValue: string): void {
		const page = pageConfig[type];

		cy.get(`#${page.fieldId}`).should('exist').and('be.visible').and('have.value', expectedValue);
	}

	verifyErrorBanner(type: AddDetailsPageType, errorType: 'required' | 'maxLength'): void {
		const page = pageConfig[type];
		const errorMessageMap = {
			required: `Enter ${type} case reference`,
			maxLength: `${type.charAt(0).toUpperCase() + type.slice(1)} case must be 250 characters or less`
		};

		cy.verifyErrorSummary(errorMessageMap[errorType], {
			href: `#${page.fieldId}`,
			inlineId: `${page.fieldId}-error`
		});
	}
}

export default new AddDetailsPage();
