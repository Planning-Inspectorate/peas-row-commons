import HeaderUtility from 'cypress/page-utilities/header.utility.ts';
import FooterUtility from 'cypress/page-utilities/footer.utility.ts';

class CasesListPage {
	visitPage() {}

	isPageDisplayed() {
		HeaderUtility.isHeaderDisplayed();
		cy.verifyPageLoaded('Case list');
		cy.verifyPageURL('/cases');
		cy.verifyPageTitle('Case list');

		const timeout = 20_000;
		const visible = (selector: string, text?: string) => {
			const el = cy.get(selector, { timeout }).should('exist').and('be.visible');
			if (text) el.and('contain.text', text);
		};

		const exists = (selector: string, text?: string) => {
			const el = cy.get(selector, { timeout }).should('exist');
			if (text) el.and('contain.text', text);
		};

		visible('.moj-filter__header-title .govuk-heading-m', 'Filter');
		visible('.moj-filter__selected-heading .govuk-heading-m', 'Selected filters');
		visible('a[href="/cases"]', 'Clear filters');
		visible('[data-test-id="submit-button"]', 'Apply filters');
		visible('label#search-label', 'Search cases');
		visible('#search-input');
		visible('#search-button', 'Search');
		visible('#pagination');
		visible('table.govuk-table');
		exists('table.govuk-table thead');
		exists('table.govuk-table tbody');
		exists('table.govuk-table tbody tr');
		visible('nav.govuk-pagination[aria-label="Pagination"]');

		FooterUtility.isFooterDisplayed();
	}
}

export default new CasesListPage();
