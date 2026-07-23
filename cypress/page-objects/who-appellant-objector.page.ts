import { runPageValidation } from 'cypress/page-utilities/page-validation.utility.ts';

type NameDetailsType = 'applicantAppellant' | 'objector';

type NameDetailsErrorType = 'required' | 'firstNameTooLong' | 'lastNameTooLong' | 'orgNameTooLong';

type NameDetailsErrorConfig = {
	message: string;
	href: string;
	inlineId?: string;
};

const nameDetailsErrorMap: Record<NameDetailsType, Record<NameDetailsErrorType, NameDetailsErrorConfig>> = {
	applicantAppellant: {
		required: {
			message: 'Add at least one of First name, Last name or Company or organisation name',
			href: '#applicantName'
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
	},
	objector: {
		required: {
			message: 'Add at least one of First name, Last name or Company or organisation name',
			href: '#objectorName'
		},
		firstNameTooLong: {
			message: 'Objector first name must be less than 250 characters',
			href: '#objectorFirstName',
			inlineId: 'objectorFirstName-error'
		},
		lastNameTooLong: {
			message: 'Objector last name must be less than 250 characters',
			href: '#objectorLastName',
			inlineId: 'objectorLastName-error'
		},
		orgNameTooLong: {
			message: 'Company or organisation name must be less than 250 characters',
			href: '#objectorOrgName',
			inlineId: 'objectorOrgName-error'
		}
	}
};

class WhoAppellantObjectorPage {
	/**
	 * Verifies the name details page for either the applicant/appellant
	 * or objector flow, including page-specific title, hint text and field ids.
	 */
	isPageDisplayed(type: NameDetailsType, fullValidation = true): void {
		const config = {
			applicantAppellant: {
				pageName: 'Applicant or appellant details',
				title: 'Who is the applicant or appellant?',
				urlPart: 'applicant-details',
				hintText: 'Enter the name of the main party. This could also be a server.',
				fieldPrefix: 'applicant'
			},
			objector: {
				pageName: 'Objector details',
				title: 'Who is the objector?',
				urlPart: 'objector-name',
				hintText: 'Enter the name of individual, company name, or both.',
				fieldPrefix: 'objector'
			}
		} as const;

		const page = config[type];

		runPageValidation(
			fullValidation,
			() => {
				cy.verifyPageLoaded(page.pageName);
				cy.verifyPageTitle(page.title);
			},
			() => {
				cy.verifyPageURL(page.urlPart);
				cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible');
				cy.contains('h1', page.title).should('exist').and('be.visible');
				cy.contains('.govuk-hint', page.hintText).should('be.visible');

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
		);
	}

	private readonly defaultFirstNames = [
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
		'Dvořák',
		'Siobhán',
		'Niamh',
		'Óscar',
		'Márton',
		'Réka',
		'Björn',
		'Åsa',
		'Kārlis',
		'Željko',
		'Petar',
		'Yōko',
		'Jiří',
		'Anže',
		'Nikša',
		'Krzysztof',
		'Elżbieta',
		'Rūta',
		'Göran',
		'Inês',
		'João',
		'Rafael',
		'Thiago',
		'Ayşe',
		'Fatih',
		'Çağla',
		'Ömer',
		'Nguyễn',
		'Min-jun',
		'Ji-woo',
		'Yūki',
		'Saša',
		'Adélaïde',
		'Māris',
		'Zuzana',
		'Agnieszka',
		'Kwame',
		'Ama',
		'Chinwe',
		'Kemi',
		'Yinka',
		'Temitọpe'
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
		'Björnsdóttir',
		'O’Connor',
		'McCarthy',
		'Ó Briain',
		'Kowalski',
		'Nowicka',
		'Novák',
		'Horváth',
		'Németh',
		'Janković',
		'Petrović',
		'Đorđević',
		'Källström',
		'Öztürk',
		'Yılmaz',
		'Çelik',
		'Aksoy',
		'de la Cruz',
		'Van der Merwe',
		'van den Berg',
		'Gonçalves',
		'Rodríguez',
		'Sánchez',
		'Martínez',
		'Rossi',
		'Bianchi',
		'Esposito',
		'Kim',
		'Nguyễn',
		'Yamamoto',
		'Takahashi',
		'Wójcik',
		'Król',
		'Żukowski',
		'Adébáyọ̀',
		'Olubajo',
		'Okonkwo',
		'Adeyemi',
		'Ndlovu',
		'Mbatha'
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
		'Utility Partners UK',
		'Énergie Solutions',
		'Grøn Energy',
		'Árbol Consulting',
		'Öresund Infrastructure',
		'Česká Planning Group',
		'Nordström & Co',
		'Müller Holdings',
		'García Transport Ltd',
		'Björk Developments',
		'François Construction',
		'Łódź Engineering',
		'São Paulo Logistics',
		'Café & Partners',
		'Réseau Planning',
		'De La Cruz Estates',
		'Öko Systems',
		'Yılmaz Infrastructure',
		'Nguyễn Consulting',
		'Kōbe Transport',
		'Adeyemi Holdings',
		'Ndlovu Developments',
		'Kwame & Sons',
		'Živković Associates',
		'Brontë Planning Group',
		'Northern Utilities & Partners',
		'Future-Rail Systems',
		'Green Energy+',
		'Land & Rights Co.',
		'Phase-2 Infrastructure',
		'Section(4) Consulting'
	] as const;

	private getFieldPrefix(type: NameDetailsType): string {
		return type === 'objector' ? 'objector' : 'applicant';
	}

	enterFirstName(type: NameDetailsType, firstName?: string): string {
		const valueToUse = firstName !== undefined ? firstName : Cypress._.sample(this.defaultFirstNames)!;
		const prefix = this.getFieldPrefix(type);

		const input = cy.get(`#${prefix}FirstName`).should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}

	enterLastName(type: NameDetailsType, lastName?: string): string {
		const valueToUse = lastName !== undefined ? lastName : Cypress._.sample(this.defaultLastNames)!;
		const prefix = this.getFieldPrefix(type);

		const input = cy.get(`#${prefix}LastName`).should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}

	enterCompanyName(type: NameDetailsType, companyName?: string): string {
		const valueToUse = companyName !== undefined ? companyName : Cypress._.sample(this.defaultCompanyNames)!;
		const prefix = this.getFieldPrefix(type);

		const input = cy.get(`#${prefix}OrgName`).should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}

	enterFirstLastAndCompany(
		type: NameDetailsType,
		details?: { firstName?: string; lastName?: string; companyName?: string }
	): {
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

		this.enterFirstName(type, firstName);
		this.enterLastName(type, lastName);
		this.enterCompanyName(type, companyName);

		return { firstName, lastName, companyName };
	}

	verifyErrorBanner(pageType: NameDetailsType, errorType: NameDetailsErrorType | NameDetailsErrorType[]): void {
		const errorsToCheck = Array.isArray(errorType) ? errorType : [errorType];

		errorsToCheck.forEach((error) => {
			const { message, href, inlineId } = nameDetailsErrorMap[pageType][error];

			cy.verifyErrorSummary(message, {
				href,
				inlineId
			});
		});
	}
}

export default new WhoAppellantObjectorPage();
