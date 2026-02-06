import type { RightOfWay } from '../types/subTypes.ts';

class RightOfWaySubtypePage {
	isPageDisplayed(): void {
		cy.contains('h1', 'Which Rights of Way subtype is it?').should('exist').and('be.visible');

		const labels = [
			'Dispensation for Serving Notice HA80',
			'Dispensation for Serving Notice TCPA90',
			'Dispensation for Serving Notice WCA81',
			'Opposed Definitive Map Modification Order (DMMO)',
			'Opposed Public Path Order (PPO) HA80',
			'Opposed Public Path Order (PPO) TCPA90',
			'Schedule 14 Appeal',
			'Schedule 14 Direction',
			'Schedule 13A Appeal'
		];

		labels.forEach((text) => {
			cy.contains('label', text).should('exist').and('be.visible');
		});

		cy.get('[data-cy="button-save-and-continue"]').should('exist').and('be.visible');
	}

	selectRightsOfWaySubtype(option: RightOfWay): void {
		const selectorMap: Record<typeof option, string> = {
			dispensationHa80: '[data-cy="answer-dispensation-ha80"]',
			dispensationTcpa90: '[data-cy="answer-dispensation-tcpa90"]',
			dispensationWca81: '[data-cy="answer-dispensation-wca81"]',
			opposedDmmo: '[data-cy="answer-opposed-dmmo"]',
			opposedPpoHa80: '[data-cy="answer-opposed-ppo-ha80"]',
			opposedPpoTcpa90: '[data-cy="answer-opposed-ppo-tcpa90"]',
			schedule14Appeal: '[data-cy="answer-schedule-14-appeal"]',
			schedule14Direction: '[data-cy="answer-schedule-14-direction"]',
			schedule13aAppeal: '[data-cy="answer-schedule-13-a-appeal"]'
		};

		const selector = selectorMap[option];

		cy.get('body').then(($body) => {
			if ($body.find(selector).length === 0) {
				throw new Error("Test Failed: Option specified isn't displayed");
			}

			cy.get(selector).check().should('be.checked');
		});
	}
}

export default RightOfWaySubtypePage;
