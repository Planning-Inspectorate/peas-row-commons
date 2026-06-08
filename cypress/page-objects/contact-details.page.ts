import { generateEmail, generatePhoneNumber } from 'cypress/page-utilities/generate.utility.ts';
import { runPageValidation } from 'cypress/page-utilities/page-validation.utility.ts';

type ContactDetailsType = 'applicantAppellant' | 'objector';
type ContactDetailsErrorType = 'emailTooLong' | 'phoneTooLong';

type ContactDetailsErrorConfig = {
	message: string;
	href: string;
	inlineId: string;
	inputId: string;
};

const contactDetailsErrorMap: Record<ContactDetailsType, Record<ContactDetailsErrorType, ContactDetailsErrorConfig>> = {
	applicantAppellant: {
		emailTooLong: {
			message: 'Applicant or appellant email must be less than 250 characters',
			href: '#applicantEmail',
			inlineId: 'applicantEmail-error',
			inputId: 'applicantEmail'
		},
		phoneTooLong: {
			message: 'Applicant or appellant phone number must be less than 15 characters',
			href: '#applicantTelephoneNumber',
			inlineId: 'applicantTelephoneNumber-error',
			inputId: 'applicantTelephoneNumber'
		}
	},
	objector: {
		emailTooLong: {
			message: 'Objector email must be less than 250 characters',
			href: '#objectorEmail',
			inlineId: 'objectorEmail-error',
			inputId: 'objectorEmail'
		},
		phoneTooLong: {
			message: 'Objector phone number must be less than 15 characters',
			href: '#objectorTelephoneNumber',
			inlineId: 'objectorTelephoneNumber-error',
			inputId: 'objectorTelephoneNumber'
		}
	}
};

class ContactDetailsPage {
	isPageDisplayed(type: ContactDetailsType, fullValidation = true): void {
		const config = {
			applicantAppellant: {
				pageName: 'Applicant or appellant contact details',
				title: 'Applicant or appellant contact details',
				urlPart: '/applicant-contact-details',
				emailId: 'applicantEmail',
				phoneId: 'applicantTelephoneNumber'
			},
			objector: {
				pageName: 'Objector contact details',
				title: 'Objector contact details (optional)',
				urlPart: '/objector-contact-details',
				emailId: 'objectorEmail',
				phoneId: 'objectorTelephoneNumber'
			}
		} as const;

		const { pageName, title, urlPart, emailId, phoneId } = config[type];

		runPageValidation(
			fullValidation,
			() => {
				cy.verifyPageLoaded(pageName);
				cy.verifyPageTitle(title);
			},
			() => {
				cy.verifyPageURL(urlPart);
				cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible').and('have.attr', 'href');
				cy.get(`#${emailId}`).should('exist').and('be.visible').and('have.attr', 'name', emailId);
				cy.get(`#${phoneId}`).should('exist').and('be.visible').and('have.attr', 'name', phoneId);

				cy.get('[data-cy="button-save-and-continue"]')
					.should('exist')
					.and('be.visible')
					.and('have.attr', 'type', 'submit')
					.and('contain.text', 'Continue');
			}
		);
	}

	private getFieldPrefix(type: ContactDetailsType): string {
		return type === 'objector' ? 'objector' : 'applicant';
	}

	enterEmail(type: ContactDetailsType, email?: string): string {
		const valueToUse = email ?? generateEmail();
		const prefix = this.getFieldPrefix(type);

		const input = cy.get(`#${prefix}Email`).should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}

	enterPhoneNumber(type: ContactDetailsType, phone?: string): string {
		const valueToUse = phone ?? generatePhoneNumber();
		const prefix = this.getFieldPrefix(type);

		const input = cy.get(`#${prefix}TelephoneNumber`).should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}

	enterContactDetails(
		type: ContactDetailsType,
		details?: { email?: string; phone?: string }
	): {
		email: string;
		phone: string;
	} {
		const email = this.enterEmail(type, details?.email);
		const phone = this.enterPhoneNumber(type, details?.phone);

		return { email, phone };
	}

	verifyErrorBanner(type: ContactDetailsType, errorType: ContactDetailsErrorType | ContactDetailsErrorType[]): void {
		const errorsToCheck = Array.isArray(errorType) ? errorType : [errorType];

		cy.get('.govuk-error-summary')
			.should('exist')
			.and('be.visible')
			.within(() => {
				cy.contains('h2', 'There is a problem').should('be.visible');
				cy.get('.govuk-error-summary__list li').should('have.length', errorsToCheck.length);
			});

		errorsToCheck.forEach((error) => {
			const { message, href, inlineId, inputId } = contactDetailsErrorMap[type][error];

			cy.verifyErrorSummary(message, {
				href,
				inlineId
			});

			cy.get(`#${inlineId}`).should('exist').and('be.visible').and('contain.text', message);
			cy.get(`#${inputId}`).should('have.class', 'govuk-input--error').and('have.attr', 'aria-describedby', inlineId);
		});
	}
}

export default new ContactDetailsPage();
