import type { CaseDetailsSection, CaseDetailsSectionRowMap, SummaryRowState } from 'cypress/types/case-details.ts';

import HeaderUtility from 'cypress/page-utilities/header.utility.ts';
import FooterUtility from 'cypress/page-utilities/footer.utility.ts';
import CheckDetailsPage from './check-details.page.ts';
import CommonActionsUtility from 'cypress/page-utilities/common-actions.utility.ts';
import { runPageValidation } from 'cypress/page-utilities/page-validation.utility.ts';

class CaseDetailsPage {
	private readonly sectionSelectors: Record<CaseDetailsSection, string> = {
		overview: '#overview',
		'case-details': '#case-details',
		team: '#team',
		timetable: '#timetable',
		'key-contacts': '#key-contacts',
		'outcome-overview': '#outcome-overview',
		'additional-resource-locations': '#additional-resource-locations',
		invoicing: '#invoicing',
		'case-audit-log': '#case-audit-log'
	};

	visitPage(): void {}

	isPageDisplayed(fullValidation = true, caseName?: string): void {
		runPageValidation(
			fullValidation,
			() => {
				HeaderUtility.isHeaderDisplayed();
				cy.verifyPageLoaded('Case Details');

				if (caseName) {
					cy.verifyPageTitle(caseName);
					cy.get('h1.govuk-heading-l').should('exist').and('be.visible').and('contain.text', caseName);
				}
			},
			() => {
				cy.verifyPageURL('/cases/');
				FooterUtility.isFooterDisplayed();
			}
		);
	}

	private getSummaryRow<TSection extends CaseDetailsSection>(
		section: TSection,
		rowKeyText: CaseDetailsSectionRowMap[TSection]
	): Cypress.Chainable<JQuery<HTMLElement>> {
		return cy
			.get(this.sectionSelectors[section])
			.contains('.govuk-summary-list__key', rowKeyText)
			.parents('.govuk-summary-list__row');
	}

	validateSummaryRow<TSection extends CaseDetailsSection>(
		section: TSection,
		rowKeyText: CaseDetailsSectionRowMap[TSection],
		state: SummaryRowState,
		expectedValues: string[] = [],
		rowNumber?: number
	): void {
		this.getSummaryRow(section, rowKeyText).within(() => {
			cy.get('.govuk-summary-list__value')
				.should('exist')
				.and('be.visible')
				.then(($value) => {
					const actualText = $value.text().trim().replace(/\s+/g, ' ');

					if (state === 'noDetails') {
						expect(actualText, `Expected "${rowKeyText}" in section "${section}" to have no details`).to.equal('-');
						return;
					}

					expect(actualText, `Expected "${rowKeyText}" in section "${section}" to contain details`).to.not.equal('-');

					if (rowNumber) {
						const rowText = $value
							.find('[data-cy="answer-item"]')
							.eq(rowNumber - 1)
							.text()
							.trim()
							.replace(/\s+/g, ' ');

						expect(
							rowText,
							`Expected row ${rowNumber} for "${rowKeyText}" in section "${section}" to exist`
						).to.not.equal('');

						expectedValues.forEach((expectedValue) => {
							expect(
								rowText,
								`Expected row ${rowNumber} for "${rowKeyText}" in section "${section}" to contain "${expectedValue}"`
							).to.contain(expectedValue);
						});

						return;
					}

					expectedValues.forEach((expectedValue) => {
						expect(
							actualText,
							`Expected "${rowKeyText}" in section "${section}" to contain "${expectedValue}"`
						).to.contain(expectedValue);
					});
				});
		});
	}

	validateSummaryRowCount<TSection extends CaseDetailsSection>(
		section: TSection,
		rowKeyText: CaseDetailsSectionRowMap[TSection],
		expectedRowCount: number
	): void {
		this.getSummaryRow(section, rowKeyText).within(() => {
			if (expectedRowCount === 0) {
				cy.get('.govuk-summary-list__value')
					.invoke('text')
					.then((text) => {
						expect(
							text.trim().replace(/\s+/g, ' '),
							`Expected "${rowKeyText}" in section "${section}" to have no rows`
						).to.equal('-');
					});

				return;
			}

			cy.get('[data-cy="answer-item"]').should('have.length', expectedRowCount);
		});
	}

	clearSummaryRowDetailsIfPresent<TSection extends CaseDetailsSection>(
		section: TSection,
		rowKeyText: CaseDetailsSectionRowMap[TSection]
	): void {
		this.getSummaryRow(section, rowKeyText).then(($row) => {
			const actualText = $row.find('.govuk-summary-list__value').text().trim().replace(/\s+/g, ' ');

			if (actualText === '-') {
				return;
			}

			const minimumRows = section === 'case-details' && rowKeyText === 'Applicant or appellant' ? 1 : 0;

			cy.wrap($row)
				.find('.govuk-summary-list__actions a.govuk-link')
				.should('exist')
				.and('be.visible')
				.and('contain.text', 'Change')
				.click();

			CheckDetailsPage.removeAllRows(minimumRows);

			CommonActionsUtility.clickActionButton('saveAndContinue');

			this.isPageDisplayed(false);
		});
	}

	clickSummaryRowAction<TSection extends CaseDetailsSection>(
		section: TSection,
		rowKeyText: CaseDetailsSectionRowMap[TSection]
	): void {
		this.getSummaryRow(section, rowKeyText).within(() => {
			cy.get('.govuk-summary-list__actions a.govuk-link')
				.should('exist')
				.and('be.visible')
				.invoke('text')
				.then((rawText) => {
					const actionText = rawText.trim();

					if (!actionText.includes('Add') && !actionText.includes('Change') && !actionText.includes('View')) {
						throw new Error(
							`Expected action link for "${rowKeyText}" to be Add, Change or View, but found "${actionText}"`
						);
					}
				});

			cy.get('.govuk-summary-list__actions a.govuk-link').click();
		});
	}

	validateSuccessBanner(section: CaseDetailsSection, state: 'displayed' | 'notDisplayed' = 'displayed'): void {
		if (state === 'notDisplayed') {
			cy.get('.govuk-notification-banner__content').should('not.exist');
			return;
		}

		cy.get('.govuk-notification-banner__content')
			.should('exist')
			.and('be.visible')
			.within(() => {
				cy.contains('.govuk-notification-banner__heading', 'Case has been updated.').should('exist').and('be.visible');

				cy.contains('a.govuk-notification-banner__link', 'Return to section')
					.should('exist')
					.and('be.visible')
					.and('have.attr', 'href', this.sectionSelectors[section]);
			});
	}

	clickBannerReturnToSection(section: CaseDetailsSection): void {
		cy.contains('a.govuk-notification-banner__link', 'Return to section').should('exist').and('be.visible').click();
		cy.hash().should('eq', this.sectionSelectors[section]);
		cy.get(this.sectionSelectors[section]).scrollIntoView().should('be.visible');
	}

	validateCaseReference(caseReference: string): void {
		cy.get('h2.govuk-hint')
			.should('exist')
			.and('be.visible')
			.invoke('text')
			.then((text) => {
				expect(text.trim()).to.equal(caseReference);
			});
	}

	clickCaseAction(action: 'manageCaseFiles' | 'downloadCase' | 'downloadContacts'): void {
		const actionMap: Record<
			typeof action,
			{
				text: string;
				hrefPattern: RegExp;
				selector?: string;
			}
		> = {
			manageCaseFiles: {
				text: 'Manage case files',
				hrefPattern: /\/cases\/[0-9a-f-]+\/case-folders$/
			},
			downloadCase: {
				text: 'Download this case',
				selector: '[data-cy="download-case-button"]',
				hrefPattern: /\/cases\/[0-9a-f-]+\/download$/
			},
			downloadContacts: {
				text: 'Download all contacts',
				selector: '[data-cy="download-contacts-button"]',
				hrefPattern: /\/cases\/[0-9a-f-]+\/download\/contacts$/
			}
		};

		const { text, hrefPattern, selector } = actionMap[action];
		const button = selector ? cy.get(selector) : cy.contains('a.govuk-button--secondary', text);

		button
			.should('exist')
			.and('be.visible')
			.then(($button) => {
				const href = $button.attr('href');

				expect(href, `${text} href`).to.match(hrefPattern);

				cy.wrap($button).click();
			});
	}

	getCaseURL(): Cypress.Chainable<string> {
		return cy.url().then((url) => {
			const caseURL = new URL(url);
			const cleanPath = caseURL.pathname;

			cy.log(`Case URL: ${cleanPath}`);

			return cy.wrap(cleanPath, { log: false });
		});
	}

	clickAnchorNavigationLink(section: CaseDetailsSection): void {
		cy.get(`a[href="${this.sectionSelectors[section]}"]`).should('exist').and('be.visible').click();

		cy.get(this.sectionSelectors[section]).find('.govuk-summary-card__title').should('exist').and('be.visible');
	}

	clickCaseNotes(action: 'open' | 'add'): void {
		const summarySelector = '.govuk-details__summary-text';
		const addCaseNoteButtonText = 'Add case note';

		if (action === 'open') {
			cy.contains('button', addCaseNoteButtonText).should('exist').and('not.be.visible');
			cy.get(summarySelector).should('exist').and('be.visible').click();
			cy.contains('button', addCaseNoteButtonText).should('exist').and('be.visible');
		}

		if (action === 'add') {
			cy.contains('button', addCaseNoteButtonText).then(($btn) => {
				if (!$btn.length || !$btn.is(':visible')) {
					throw new Error('Test Failed: Tried to click "Add case note" before case notes were opened');
				}

				cy.wrap($btn).click();
			});
		}
	}

	enterCaseNoteComment(text: string): void {
		cy.get('#comment').should('exist').and('be.visible').clear().type(text).should('have.value', text);
	}

	validateShowMoreState<TSection extends CaseDetailsSection>(
		section: TSection,
		rowKeyText: CaseDetailsSectionRowMap[TSection],
		state: 'show' | 'hide'
	): void {
		this.getSummaryRow(section, rowKeyText).within(() => {
			const button = cy.get('[data-cy="expand-button"]').should('exist').and('be.visible');

			if (state === 'show') {
				button.should('have.attr', 'aria-expanded', 'false').and('contain.text', 'Show').and('contain.text', 'more');

				return;
			}

			button.should('have.attr', 'aria-expanded', 'true').and('contain.text', 'Hide');
		});
	}

	clickShowHideAndValidate<TSection extends CaseDetailsSection>(
		section: TSection,
		rowKeyText: CaseDetailsSectionRowMap[TSection],
		currentState: 'show' | 'hide'
	): void {
		const expectedStateAfterClick = currentState === 'show' ? 'hide' : 'show';

		this.validateShowMoreState(section, rowKeyText, currentState);

		this.getSummaryRow(section, rowKeyText).find('[data-cy="expand-button"]').should('exist').and('be.visible').click();

		this.validateShowMoreState(section, rowKeyText, expectedStateAfterClick);
	}
}

export default new CaseDetailsPage();
