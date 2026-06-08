import { runPageValidation } from 'cypress/page-utilities/page-validation.utility.ts';
import RemoveDetailsPage from './remove-details.page.ts';
import CommonActionsUtility from 'cypress/page-utilities/common-actions.utility.ts';

const CheckDetailsPageConfig = {
	applicantAppellant: {
		title: 'Check applicant or appellant details',
		emptyText: 'Add one or more applicants or appellants. No applicant or appellant details have been added.',
		addHrefPattern: {
			createCase: /\/cases\/create-a-case\/questions\/applicant-details\/add\/[0-9a-f-]+\/applicant-name$/,
			existingCase: /\/cases\/[0-9a-f-]+\/case-details\/applicant-details\/add\/[0-9a-f-]+\/applicant-name$/
		},
		expectedHeaders: ['Name', 'Address', 'Contact', 'Actions']
	},
	linkedCases: {
		title: 'Check linked case details',
		emptyText: 'Add one or more linked cases. No linked case details have been added.',
		addHrefPattern: /\/cases\/[0-9a-f-]+\/overview\/check-linked-cases\/add\/[0-9a-f-]+\/linked-case-reference$/,
		expectedHeaders: ['Linked case reference', 'Lead?', 'Actions']
	},
	relatedCases: {
		title: 'Check related case details',
		emptyText: 'Add one or more related cases. No related case details have been added.',
		addHrefPattern: /\/cases\/[0-9a-f-]+\/overview\/check-related-cases\/add\/[0-9a-f-]+\/add-related-cases$/,
		expectedHeaders: ['Related case reference', 'Actions']
	},
	inspectors: {
		title: 'Check inspector details',
		emptyText: 'Add one or more inspectors. No inspector details have been added.',
		addHrefPattern: /\/cases\/[0-9a-f-]+\/team\/inspector-details\/add\/[0-9a-f-]+\/inspector$/,
		expectedHeaders: ['Inspector name', 'Date appointed', 'Actions']
	},
	objectors: {
		title: 'Check objector details',
		emptyText: 'Add one or more objectors. No objector details have been added.',
		addHrefPattern: /\/cases\/[0-9a-f-]+\/key-contacts\/objector-details\/add\/[0-9a-f-]+\/objector-name$/,
		expectedHeaders: ['Name', 'Address', 'Contact', 'Status', 'Actions']
	},
	contacts: {
		title: 'Check contact details',
		emptyText: 'Add one or more contacts. No contact details have been added.',
		addHrefPattern: /\/cases\/[0-9a-f-]+\/key-contacts\/contact-details\/add\/[0-9a-f-]+\/contact-type$/,
		expectedHeaders: ['Contact type', 'Name', 'Address', 'Contact', 'Actions']
	}
} as const;

type CheckDetailsPageMode = 'createCase' | 'existingCase';
type CheckDetailsPageType = keyof typeof CheckDetailsPageConfig;
type RowTextState = 'exists' | 'notExist';
type CheckDetailsErrorType = 'linkedCaseLead' | 'objectorStatus' | 'contactName';

const errorMessageMap: Record<CheckDetailsErrorType, string> = {
	linkedCaseLead: "Add 'whether the case is the lead case'",
	objectorStatus: "Add 'Objector status'",
	contactName: "Add 'at least one of First name, Last name or Company or organisation name'"
};

class CheckDetailsPage {
	isPageDisplayed(
		type: CheckDetailsPageType,
		state: 'withoutDetails' | 'withDetails',
		fullValidation = true,
		mode: CheckDetailsPageMode = 'existingCase'
	): void {
		const page = CheckDetailsPageConfig[type];

		runPageValidation(
			fullValidation,
			() => {
				cy.verifyPageLoaded(page.title);
				cy.verifyPageTitle(page.title);
			},
			() => {
				cy.contains('h1.govuk-heading-l', page.title).should('exist').and('be.visible');

				if (state === 'withoutDetails') {
					cy.contains('p.govuk-body', page.emptyText).should('exist').and('be.visible');
				} else {
					this.validateDetailsTable(type, page.expectedHeaders);
				}

				const addHrefPattern =
					type === 'applicantAppellant'
						? CheckDetailsPageConfig.applicantAppellant.addHrefPattern[mode]
						: page.addHrefPattern;

				cy.contains('a.govuk-button--secondary, a.govuk-button', 'Add details')
					.should('exist')
					.and('be.visible')
					.and('have.attr', 'href')
					.and('match', addHrefPattern);

				if (type === 'applicantAppellant' && mode === 'createCase') {
					return;
				}

				cy.get('[data-cy="button-save-and-continue"]')
					.should('exist')
					.and('be.visible')
					.and('have.attr', 'type', 'submit');

				cy.get('body').then(($body) => {
					const cancelButton = $body.find('a.govuk-button--secondary').filter((_index, element) => {
						return Cypress.$(element).text().trim() === 'Cancel';
					});

					if (cancelButton.length > 0) {
						cy.wrap(cancelButton)
							.should('be.visible')
							.and('have.attr', 'href')
							.and('match', /^\/cases\/[0-9a-f-]+$/);
					}
				});
			}
		);
	}

	verifyErrorBanner(errorType: CheckDetailsErrorType): void {
		const errorMessage = errorMessageMap[errorType];

		cy.get('.govuk-error-summary')
			.should('exist')
			.and('be.visible')
			.within(() => {
				cy.contains('.govuk-error-summary__title', 'There is a problem').should('exist').and('be.visible');

				cy.contains('.govuk-error-summary__list a', errorMessage)
					.should('exist')
					.and('be.visible')
					.and('have.attr', 'href', '#');
			});
	}

	validateRowValues(expectedValues: string | string[], state: RowTextState = 'exists', rowNumber?: number): void {
		const values = (Array.isArray(expectedValues) ? expectedValues : [expectedValues]).filter(
			(value): value is string => Boolean(value?.trim())
		);

		if (values.length === 0) {
			return;
		}

		if (state === 'notExist') {
			const scope = rowNumber
				? cy.get('tbody.govuk-table__body tr.govuk-table__row').eq(rowNumber - 1)
				: cy.get('tbody.govuk-table__body');

			scope.then(($scope) => {
				const scopeText = $scope.text().trim().replace(/\s+/g, ' ');

				values.forEach((value) => {
					expect(scopeText).to.not.contain(value);
				});
			});

			return;
		}

		const rows = rowNumber
			? cy.get('tbody.govuk-table__body tr.govuk-table__row').eq(rowNumber - 1)
			: cy.get('tbody.govuk-table__body tr.govuk-table__row');

		rows.should('have.length.at.least', 1).then(($rows) => {
			const matchingRows = $rows.filter((_index, row) => {
				const rowText = row.innerText.trim().replace(/\s+/g, ' ');

				return values.every((value) => rowText.includes(value));
			});

			expect(
				matchingRows.length,
				`Expected row${rowNumber ? ` ${rowNumber}` : ''} to contain: ${values.join(', ')}`
			).to.be.greaterThan(0);
		});
	}

	clickAction(action: 'change' | 'remove', rowIdentifier: number | string = 1): void {
		const actionText = action === 'change' ? 'Change' : 'Remove';

		if (typeof rowIdentifier === 'number') {
			cy.get('tbody.govuk-table__body tr.govuk-table__row')
				.eq(rowIdentifier - 1)
				.should('exist')
				.and('be.visible')
				.within(() => {
					cy.contains('a.govuk-link', actionText).should('exist').and('be.visible').click();
				});

			return;
		}

		cy.get('tbody.govuk-table__body tr.govuk-table__row')
			.contains('td.govuk-table__cell', rowIdentifier)
			.parents('tr.govuk-table__row')
			.first()
			.within(() => {
				cy.contains('a.govuk-link', actionText).should('exist').and('be.visible').click();
			});
	}

	removeAllRows(minimumRows = 0): void {
		cy.get('body').then(($body) => {
			const rowCount = $body.find('tbody.govuk-table__body tr.govuk-table__row').length;

			if (rowCount <= minimumRows) {
				return;
			}

			this.removeFirstRowUntilEmpty(minimumRows);
		});
	}

	private validateDetailsTable(type: CheckDetailsPageType, expectedHeaders: readonly string[]): void {
		cy.get('table.govuk-table').should('exist').and('be.visible');

		cy.get('thead.govuk-table__head').within(() => {
			expectedHeaders.forEach((header) => {
				cy.contains('th', header).should('exist').and('be.visible');
			});
		});

		cy.get('tbody.govuk-table__body tr.govuk-table__row')
			.should('have.length.at.least', 1)
			.then(($rows) => {
				const rowCount = $rows.length;

				cy.wrap($rows).each(($row) => {
					cy.wrap($row).within(() => {
						cy.contains('a.govuk-link', 'Change').should('exist').and('be.visible').and('have.attr', 'href');

						if (type === 'applicantAppellant' && rowCount === 1) {
							cy.contains('a.govuk-link', 'Remove').should('not.exist');
							return;
						}

						cy.contains('a.govuk-link', 'Remove').should('exist').and('be.visible').and('have.attr', 'href');
					});
				});
			});
	}

	private removeFirstRowUntilEmpty(minimumRows = 0): void {
		cy.get('body').then(($body) => {
			const rowCount = $body.find('tbody.govuk-table__body tr.govuk-table__row').length;

			if (rowCount <= minimumRows) {
				return;
			}

			this.clickAction('remove', 1);

			RemoveDetailsPage.isPageDisplayed();
			RemoveDetailsPage.selectAnswer('yes');
			CommonActionsUtility.clickActionButton('continue');

			this.removeFirstRowUntilEmpty(minimumRows);
		});
	}
}

export default new CheckDetailsPage();
