import HeaderUtility from 'cypress/page-utilities/header.utility.ts';

const defaultFolders = [
	'Initial documentation',
	'Procedure',
	'Internal correspondence',
	'Statements of case / final comments',
	'Proofs of evidence, Rebuttals and Statement of Common Ground (if inquiry)',
	'Start Date Letters',
	'Events information and notifications',
	'Decision / report',
	'Invoice',
	'Costs',
	'Other'
] as const;

type DefaultFolder = (typeof defaultFolders)[number];

class CaseFoldersPage {
	isPageDisplayed(caseReference?: string, caseName?: string): void {
		HeaderUtility.isHeaderDisplayed();
		cy.verifyPageLoaded('Case name');
		cy.verifyPageTitle('What is the case name?');
		cy.verifyPageURL('/cases/create-a-case/questions/case-name');

		cy.contains('a.govuk-back-link', 'Back to case details')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'href')
			.and('match', /^\/cases\/[0-9a-f-]+$/);

		cy.get('[data-cy="page-caption"]')
			.should('exist')
			.and('be.visible')
			.then(($el) => {
				if (caseReference) {
					cy.wrap($el).should('contain.text', caseReference);
				}
			});

		cy.get('[data-cy="page-heading"]')
			.should('exist')
			.and('be.visible')
			.then(($el) => {
				if (caseName) {
					cy.wrap($el).should('contain.text', caseName);
				}
			});

		cy.get('[data-cy="search-form"]').should('exist').and('be.visible');

		cy.get('#search-hint')
			.should('exist')
			.and('be.visible')
			.and('contain.text', 'To find a document, search by file name');

		cy.get('[data-cy="search-input"]').should('exist').and('be.visible').and('have.attr', 'name', 'searchCriteria');

		cy.get('#search-button').should('exist').and('be.visible').and('contain.text', 'Search');

		cy.get('[data-cy="create-folder-button"]')
			.should('exist')
			.and('be.visible')
			.and('contain.text', 'Create folder')
			.and('have.attr', 'href')
			.and('match', /\/cases\/[0-9a-f-]+\/case-folders\/create-folder/);

		cy.get('.govuk-section-break').should('exist').and('be.visible');

		this.validateDefaultFolders();
	}

	private validateDefaultFolders(): void {
		cy.get('[data-cy="folder-list"]')
			.should('exist')
			.and('be.visible')
			.within(() => {
				defaultFolders.forEach((folderName) => {
					cy.contains('a.govuk-link', folderName)
						.should('exist')
						.and('be.visible')
						.and('have.attr', 'href')
						.and('match', /\/cases\/[0-9a-f-]+\/case-folders\/[0-9a-f-]+\/.+/);
				});
			});
	}

	breadcrumb(action: 'validate' | 'click', value: string[] | string): void {
		cy.get('nav.govuk-breadcrumbs').should('exist').and('be.visible');

		if (action === 'validate') {
			const expectedTrail = value as string[];

			cy.get('.govuk-breadcrumbs__list')
				.should('exist')
				.and('be.visible')
				.within(() => {
					cy.get('.govuk-breadcrumbs__list-item')
						.should('have.length', expectedTrail.length)
						.each(($el, index) => {
							cy.wrap($el).should('contain.text', expectedTrail[index]);
						});
				});
			return;
		}

		if (action === 'click') {
			const name = value as string;

			cy.contains('.govuk-breadcrumbs__link', name).should('exist').and('be.visible').click();
		}
	}

	clickFolder(folderName?: DefaultFolder | string): string {
		const valueToUse = folderName ?? Cypress._.sample(defaultFolders)!;

		cy.get('[data-cy="folder-list"]')
			.should('exist')
			.and('be.visible')
			.within(() => {
				cy.contains('a.govuk-link', valueToUse)
					.should('exist')
					.and('be.visible')
					.and('have.attr', 'href')
					.and('match', /\/cases\/[0-9a-f-]+\/case-folders\/[0-9a-f-]+\/.+/)
					.click();
			});

		return valueToUse;
	}

	searchFor(text?: string): string {
		const valueToUse = text ?? 'test document';

		const input = cy.get('[data-cy="search-input"]').should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		this.clickRootFolderAction('search');
		return valueToUse;
	}

	clickRootFolderAction(action: 'backToCaseDetails' | 'search' | 'createFolder'): void {
		if (action === 'backToCaseDetails') {
			cy.contains('a.govuk-back-link', 'Back to case details')
				.should('exist')
				.and('be.visible')
				.and('have.attr', 'href')
				.and('match', /^\/cases\/[0-9a-f-]+$/)
				.click();
			return;
		}

		if (action === 'search') {
			cy.get('#search-button').should('exist').and('be.visible').and('contain.text', 'Search').click();
			return;
		}

		if (action === 'createFolder') {
			cy.get('[data-cy="create-folder-button"]')
				.should('exist')
				.and('be.visible')
				.and('contain.text', 'Create folder')
				.and('have.attr', 'href')
				.and('match', /\/cases\/[0-9a-f-]+\/case-folders\/create-folder/)
				.click();
			return;
		}
	}

	clickSubfolderFolderAction(action: 'createSubfolder' | 'renameFolder' | 'deleteFolder'): void {
		if (action === 'createSubfolder') {
			cy.get('[data-cy="create-subfolder-btn"]')
				.should('exist')
				.and('be.visible')
				.and('contain.text', 'Create subfolder')
				.and('have.attr', 'href')
				.and('match', /\/case-folders\/[0-9a-f-]+\/.+\/create-folder/)
				.click();
			return;
		}

		if (action === 'renameFolder') {
			cy.contains('a.govuk-button--secondary', 'Rename folder')
				.should('exist')
				.and('be.visible')
				.and('have.attr', 'href')
				.and('match', /\/case-folders\/[0-9a-f-]+\/.+\/rename-folder/)
				.click();
			return;
		}

		if (action === 'deleteFolder') {
			cy.contains('a.govuk-button--secondary', 'Delete folder')
				.should('exist')
				.and('be.visible')
				.and('have.attr', 'href')
				.and('match', /\/case-folders\/[0-9a-f-]+\/.+\/delete-folder/)
				.click();
			return;
		}
	}

	validateDocumentCount(count: number): void {
		cy.get('[data-cy="no-documents-message"]')
			.should('exist')
			.and('be.visible')
			.and('contain.text', `This folder contains ${count} document${count === 1 ? '' : 's'}`);
	}
}

export default new CaseFoldersPage();
