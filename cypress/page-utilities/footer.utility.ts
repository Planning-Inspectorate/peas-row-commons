/**
 * Utility class to assess footer
 */
class FooterUtility {
	header = '#pins-header';
	navLinks = 'a.govuk-header__link';

	isFooterDisplayed() {
		cy.get('footer[role="contentinfo"]').should('exist').and('be.visible');
	}
}

export default new FooterUtility();
