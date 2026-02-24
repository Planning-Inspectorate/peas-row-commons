/// <reference types ="cypress"/>
import CasesPage from 'cypress/pageObjects/cases.page.ts';

describe('Planning Inspectorate', () => {
	it('can authenticate', () => {
		cy.authVisit('');
		cy.visit('/cases');
		CasesPage.isPageDisplayed();
	});
});
