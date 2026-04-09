import HeaderUtility from 'cypress/page-utilities/header.utility.ts';

class UploadFilesPage {
	isUploadPageDisplayed(folderName?: string): void {
		HeaderUtility.isHeaderDisplayed();
		cy.verifyPageLoaded('Upload files');
		cy.verifyPageTitle('Upload files');
		cy.verifyPageURL('/upload');

		cy.contains('h1.govuk-heading-l', folderName ? `Upload files in ${folderName} folder` : 'Upload files in')
			.should('exist')
			.and('be.visible');

		cy.contains('a.govuk-back-link', 'Back').should('exist').and('be.visible').and('have.attr', 'href');

		cy.get('#upload-form-container').should('exist').and('be.visible');

		cy.contains('p.govuk-body', 'Each file must be:').should('exist').and('be.visible');

		cy.get('ul.govuk-list--bullet')
			.should('exist')
			.and('be.visible')
			.within(() => {
				cy.contains('li', 'smaller than 250MB').should('exist').and('be.visible');
			});

		cy.contains('p.govuk-body', 'The total combined size of your uploaded files must be smaller than 1GB.')
			.should('exist')
			.and('be.visible');

		cy.get('.moj-multi-file-upload').should('exist').and('be.visible');

		cy.get('#upload-form')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'type', 'file')
			.and('have.attr', 'multiple');

		cy.contains('label.govuk-button', 'Choose files')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'for', 'upload-form');

		cy.contains('button.govuk-button--secondary', 'Upload file')
			.should('exist')
			.and('be.visible')
			.and('have.attr', 'type', 'submit');

		cy.get('#main-submit-form')
			.should('exist')
			.and('be.visible')
			.within(() => {
				cy.contains('button.govuk-button', 'Upload')
					.should('exist')
					.and('be.visible')
					.and('have.attr', 'type', 'submit');
			});
	}

	clickUploadAction(action: 'uploadFiles' | 'chooseFiles' | 'upload'): void {
		if (action === 'uploadFiles') {
			cy.get('[data-cy="upload-files-btn"]')
				.should('exist')
				.and('be.visible')
				.and('contain.text', 'Upload files')
				.and('have.attr', 'href')
				.and('match', /\/case-folders\/[0-9a-f-]+\/.+\/upload/)
				.click();
			return;
		}

		if (action === 'chooseFiles') {
			cy.contains('label.govuk-button', 'Choose files')
				.should('exist')
				.and('be.visible')
				.and('have.attr', 'for', 'upload-form')
				.click();
			return;
		}

		if (action === 'upload') {
			cy.contains('button.govuk-button', 'Upload')
				.should('exist')
				.and('be.visible')
				.and('have.attr', 'type', 'submit')
				.click();
			return;
		}
	}

	uploadFile(filePath: string): void {
		cy.get('#upload-form').should('exist').selectFile(filePath, { force: true });
	}

	validateFileUploaded(fileName: string, timeout = 120000): void {
		cy.contains('.moj-multi-file-upload__row', fileName, { timeout })
			.should('exist')
			.and('be.visible')
			.within(() => {
				cy.get('.moj-multi-file-upload__progress', { timeout }).should('not.exist');

				cy.get('.moj-multi-file-upload__success', { timeout }).should('exist').and('be.visible');

				cy.contains('.moj-multi-file-upload__filename', fileName, { timeout }).should('exist').and('be.visible');

				cy.contains('button.moj-multi-file-upload__delete', 'Delete', { timeout }).should('exist').and('be.visible');
			});
	}

	isUploadInProgressErrorDisplayed(): void {
		cy.verifyErrorSummary('Wait for all files to finish uploading', {
			href: '#upload-form'
		});

		cy.get('.govuk-error-summary')
			.should('have.attr', 'role', 'alert')
			.and('have.attr', 'tabindex', '-1')
			.should('be.focused');
	}
}

export default new UploadFilesPage();
