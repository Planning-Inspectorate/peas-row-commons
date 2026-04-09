class WhoIsNameCompanyPage {
	/**
	 * Verifies the name details page for either the applicant/appellant
	 * or objector flow, including page-specific title, hint text and field ids.
	 */
	isPageDisplayed(type: 'applicantAppellant' | 'objector'): void {
		const config = {
			applicantAppellant: {
				pageName: 'Applicant or appellant details',
				title: 'Who is the applicant or appellant?',
				urlPart: '/cases/create-a-case/questions/applicant-details',
				hintText: 'Enter the name of the main party. This could be an applicant, appellant or server.',
				fieldPrefix: 'applicant'
			},
			objector: {
				pageName: 'Objector details',
				title: 'Who is the objector?',
				urlPart: '/objector-name',
				hintText: 'Enter the name of individual, company name, or both.',
				fieldPrefix: 'objector'
			}
		} as const;

		const page = config[type];

		cy.verifyPageLoaded(page.pageName);
		cy.verifyPageTitle(page.title);
		cy.verifyPageURL(page.urlPart);

		cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible');
		cy.contains('h1', page.title).should('exist').and('be.visible');
		cy.contains('.govuk-hint', page.hintText).should('exist').and('be.visible');

		cy.get(`#${page.fieldPrefix}FirstName`)
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'name', `${page.fieldPrefix}FirstName`);

		cy.get(`#${page.fieldPrefix}LastName`)
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'name', `${page.fieldPrefix}LastName`);

		cy.get(`#${page.fieldPrefix}OrgName`)
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'name', `${page.fieldPrefix}OrgName`);

		cy.get('[data-cy="button-save-and-continue"]')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'type', 'submit')
			.and('contain.text', 'Continue');
	}
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

	/**
	 * Verifies validation errors for the applicant/appellant name fields.
	 */
	verifyErrorBanner(type: 'required' | 'firstNameTooLong' | 'lastNameTooLong' | 'orgNameTooLong' = 'required'): void {
		const errorMap = {
			required: {
				message: 'Add at least one of First name, Last name or Company or organisation name',
				href: '#applicantName',
				inlineId: undefined
			},
			firstNameTooLong: {
				message: 'Applicant or appellant first name must be less than 250 characters',
				href: '#applicantFirstName',
				inlineId: 'applicantFirstName-error'
			},
			lastNameTooLong: {
				message: 'Applicant or appellant last name must be less than 250 characters',
				href: '#applicantLastName',
				inlineId: 'applicantLastName-error'
			},
			orgNameTooLong: {
				message: 'Company or organisation name must be less than 250 characters',
				href: '#applicantOrgName',
				inlineId: 'applicantOrgName-error'
			}
		} as const;

		const { message, href, inlineId } = errorMap[type];

		cy.verifyErrorSummary(message, {
			href,
			inlineId
		});
	}
}

export default new WhoIsNameCompanyPage();
