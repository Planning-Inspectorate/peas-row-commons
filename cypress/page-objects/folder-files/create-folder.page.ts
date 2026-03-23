class CreateFolderPage {
	isPageDisplayed(): void {
		cy.verifyPageLoaded('Create folder');
		cy.verifyPageTitle('Folder name');
		cy.verifyPageURL(['/case-folders', '/create-folder']);

		cy.get('#main-content').should('exist').and('be.visible');

		cy.contains('a.govuk-back-link', 'Back')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'href')
			.and('match', /\/cases\/[0-9a-f-]+\/case-folders/);

		cy.contains('span.govuk-caption-l', 'Create a folder').should('exist').and('be.visible');

		cy.contains('label.govuk-label', 'Folder name').should('exist').and('be.visible');

		cy.get('#folderName').should('exist').and('be.visible').and('have.attr', 'name', 'folderName');

		cy.contains('button.govuk-button', 'Save and return').should('exist').and('be.visible');

		cy.contains('a.govuk-link', 'Cancel and return to folder')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'href')
			.and('match', /\/cases\/[0-9a-f-]+\/case-folders/);
	}

	enterFolderName(name?: string): string {
		const valueToUse = name ?? `Test Folder ${Date.now()}`;

		const input = cy.get('#folderName').should('exist').and('be.visible').clear();

		if (valueToUse !== '') {
			input.type(valueToUse).should('have.value', valueToUse);
		} else {
			input.should('have.value', '');
		}

		return valueToUse;
	}

	clickAction(action: 'save' | 'cancel' | 'back'): void {
		if (action === 'save') {
			cy.contains('button.govuk-button', 'Save and return').should('exist').and('be.visible').click();
			return;
		}

		if (action === 'cancel') {
			cy.contains('a.govuk-link', 'Cancel and return to folder').should('exist').and('be.visible').click();
			return;
		}

		if (action === 'back') {
			cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible').click();
		}
	}
}

export default new CreateFolderPage();
