/**
 * Utility class to assess footer
 */
class FooterUtility {
	header = '#pins-header';
	navLinks = 'a.govuk-header__link';

	isFooterDisplayed(): void {
		cy.get('.pins-footer-row').should('exist').and('be.visible');
		cy.contains('a.govuk-footer__link', 'Report a problem').should('exist').and('be.visible').and('have.attr', 'href');

		cy.contains('.govuk-footer__copyright', '© Planning Inspectorate').should('exist').and('be.visible');
	}

	clickFooterLink(option: 'reportProblem'): void {
		const linkTextMap = {
			reportProblem: 'Report a problem'
		};

		cy.contains('a.govuk-footer__link', linkTextMap[option]).should('exist').and('be.visible').click();
	}
}

export default new FooterUtility();
