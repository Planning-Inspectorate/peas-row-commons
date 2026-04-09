import { generateEmail, generatePhoneNumber } from 'cypress/page-utilities/generate.utility.ts';

class ContactDetailsPage {
	isPageDisplayed(type: 'applicantAppellant' | 'objector'): void {
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

		cy.verifyPageLoaded(pageName);
		cy.verifyPageTitle(title);
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

	/**
	 * Enters an email address:
	 * - uses provided value, or
	 * - generates a realistic test email.
	 */
	enterEmail(email?: string): string {
		const valueToUse = email ?? generateEmail();

		const input = cy.get('#applicantEmail').should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}

	/**
	 * Enters a phone number:
	 * - uses provided value, or
	 * - generates a realistic test number.
	 */
	enterPhoneNumber(phone?: string): string {
		const valueToUse = phone ?? generatePhoneNumber();

		const input = cy.get('#applicantTelephoneNumber').should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}

	/**
	 * Enters both email and phone details:
	 * - uses provided values, or
	 * - generates defaults where not supplied.
	 */
	enterContactDetails(details?: { email?: string; phone?: string }): {
		email: string;
		phone: string;
	} {
		const email = this.enterEmail(details?.email);
		const phone = this.enterPhoneNumber(details?.phone);

		return { email, phone };
	}
}

export default new ContactDetailsPage();
