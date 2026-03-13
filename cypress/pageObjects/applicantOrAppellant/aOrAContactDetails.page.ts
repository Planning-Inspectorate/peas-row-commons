class AOrAContactDetailsPage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('Applicant or appellant contact details');
		cy.verifyPageTitle('Applicant or appellant contact details');
		cy.verifyPageURL('/applicant-contact-details');

		cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible').and('have.attr', 'href');

		cy.get('#applicantEmail').should('exist').and('be.visible').and('have.attr', 'name', 'applicantEmail');

		cy.get('#applicantTelephoneNumber')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'name', 'applicantTelephoneNumber');

		cy.get('[data-cy="button-save-and-continue"]')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'type', 'submit')
			.and('contain.text', 'Continue');
	}

	private readonly defaultEmails = [
		'',
		'test@example.com',
		'user@example.co.uk',
		'planning.inspectorate@gov.uk',
		'contact@solirius.com',
		'info@test-company.org',
		'john.smith@example.com',
		'sarah.connor@example.net',
		'admin@local-authority.gov.uk'
	] as const;

	private readonly defaultPhoneNumbers = [
		'',
		'07123456789',
		'07987654321',
		'02079460000',
		'01632960001',
		'01234567890',
		'07700900123',
		'07555123456'
	] as const;

	enterEmail(email?: string): string {
		const valueToUse = email !== undefined ? email : Cypress._.sample(this.defaultEmails)!;

		const input = cy.get('#applicantEmail').should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}

	enterPhoneNumber(phone?: string): string {
		const valueToUse = phone !== undefined ? phone : Cypress._.sample(this.defaultPhoneNumbers)!;

		const input = cy.get('#applicantTelephoneNumber').should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}

	enterContactDetails(details?: { email?: string; phone?: string }): {
		email: string;
		phone: string;
	} {
		const email = details?.email ?? Cypress._.sample(this.defaultEmails)!;
		const phone = details?.phone ?? Cypress._.sample(this.defaultPhoneNumbers)!;

		this.enterEmail(email);
		this.enterPhoneNumber(phone);

		return { email, phone };
	}
}

export default new AOrAContactDetailsPage();
