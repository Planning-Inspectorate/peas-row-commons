import type { JourneyAnswers } from '../types/journeys.ts';

class AnswersUtility {
	private readonly alias = 'journeyAnswers';

	init(initial: JourneyAnswers = {}): void {
		cy.wrap(initial, { log: false }).as(this.alias);
	}

	set<K extends keyof JourneyAnswers>(key: K, value: JourneyAnswers[K]): void {
		cy.get<JourneyAnswers>(`@${this.alias}`, { log: false }).then((answers) => {
			const updated: JourneyAnswers = { ...answers, [key]: value };
			cy.wrap(updated, { log: false }).as(this.alias);
		});
	}

	get(): Cypress.Chainable<JourneyAnswers> {
		return cy.get<JourneyAnswers>(`@${this.alias}`, { log: false });
	}

	getValue<K extends keyof JourneyAnswers>(key: K): Cypress.Chainable<JourneyAnswers[K]> {
		return this.get().then((answers) => {
			return cy.wrap(answers[key], { log: false }) as Cypress.Chainable<JourneyAnswers[K]>;
		});
	}

	assertHas<K extends keyof JourneyAnswers>(key: K): void {
		this.get().then((answers) => {
			expect(answers[key], `Expected journey answer "${String(key)}" to be recorded`).to.not.equal(undefined);
		});
	}
}

export default new AnswersUtility();
