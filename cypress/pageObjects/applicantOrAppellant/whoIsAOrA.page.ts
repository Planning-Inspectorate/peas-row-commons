class WhoIsAOrAPage {
	private readonly defaultFirstNames = [
		'',
		'Sarah',
		'James',
		'Emily',
		'Michael',
		'Charlotte',
		'Oscar',
		'Daniel',
		'Olivia',
		'Edward',
		'Thomas',
		'Sophie',
		'José',
		'Chloé',
		'Zoë',
		'Renée',
		'André',
		'Björk',
		'François',
		'Łukasz',
		'Søren',
		'İbrahim',
		'Álvaro',
		'Noémie',
		'Maëlle',
		'Jürgen',
		'Dvořák'
	] as const;

	private readonly defaultLastNames = [
		'',
		'Thomas',
		'Taylor',
		'Roberts',
		'Evans',
		'Walker',
		'Johnson',
		'Turner',
		'Parker',
		'Phillips',
		'Edwards',
		'García',
		'Fernández',
		'Muñoz',
		'Grønning',
		'Åström',
		'Smirnov',
		'Dvořák',
		'Blažević',
		'Kovačić',
		'Nowakowski',
		'Łukaszewicz',
		'Brontë',
		'López',
		'François',
		'Björnsdóttir'
	] as const;

	private readonly defaultCompanyNames = [
		'',
		'Solirius',
		'The Amazing Company',
		'National Grid',
		'Network Rail',
		'Natural England',
		'Highways Authority',
		'Greenfield Developments',
		'Urban Planning Ltd',
		'County Council Services',
		'Utility Partners UK'
	] as const;

	isPageDisplayed(): void {
		cy.verifyPageLoaded('Applicant or appellant details');
		cy.verifyPageTitle('Who is the applicant or appellant?');
		cy.verifyPageURL('/cases/create-a-case/questions/applicant-details');

		cy.contains('a.govuk-back-link', 'Back')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'href', '/cases/create-a-case/questions/applicant-details');

		cy.contains('h1', 'Who is the applicant or appellant?').should('exist').and('be.visible');

		cy.contains(
			'#multi-field-hint',
			'Enter the name of the main party. This could be an applicant, appellant or server.'
		)
			.should('exist')
			.and('be.visible');

		cy.get('#applicantFirstName').should('exist').and('be.visible');
		cy.get('#applicantLastName').should('exist').and('be.visible');
		cy.get('#applicantOrgName').should('exist').and('be.visible');

		cy.get('[data-cy="button-save-and-continue"]')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'type', 'submit')
			.and('contain.text', 'Continue');
	}

	enterFirstName(firstName?: string): string {
		const valueToUse = firstName !== undefined ? firstName : Cypress._.sample(this.defaultFirstNames)!;

		const input = cy.get('#applicantFirstName').should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}

	enterLastName(lastName?: string): string {
		const valueToUse = lastName !== undefined ? lastName : Cypress._.sample(this.defaultLastNames)!;

		const input = cy.get('#applicantLastName').should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}

	enterCompanyName(companyName?: string): string {
		const valueToUse = companyName !== undefined ? companyName : Cypress._.sample(this.defaultCompanyNames)!;

		const input = cy.get('#applicantOrgName').should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}

	enterFirstLastAndCompany(details?: { firstName?: string; lastName?: string; companyName?: string }): {
		firstName: string;
		lastName: string;
		companyName: string;
	} {
		let firstName = details?.firstName ?? '';
		const lastName = details?.lastName ?? '';
		const companyName = details?.companyName ?? '';

		if (!firstName && !lastName && !companyName) {
			firstName = Cypress._.sample(this.defaultFirstNames)!;
		}

		if (firstName !== undefined) this.enterFirstName(firstName);
		if (lastName !== undefined) this.enterLastName(lastName);
		if (companyName !== undefined) this.enterCompanyName(companyName);

		return { firstName, lastName, companyName };
	}
}

export default new WhoIsAOrAPage();
