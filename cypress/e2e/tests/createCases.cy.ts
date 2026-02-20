/// <reference types ="cypress"/>

import LoginPage from '../../pageObjects/login.page.ts';
import CasesPage from 'cypress/pageObjects/cases.page.ts';

describe('example to-do app', () => {
	beforeEach(() => {
		LoginPage.loginToTestEnviroment();
		CasesPage.isPageDisplayed();
	});

	it('displays two todo items by default', () => {
		CasesPage.isPageDisplayed();
	});
});
