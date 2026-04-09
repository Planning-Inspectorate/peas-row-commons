import type { Journeys } from '../types/journeys.ts';
import type { CaseAnswers } from '../types/answers.ts';

class AnswersUtility {
	private readonly alias = 'journeyAnswers';

	init(initial: CaseAnswers = {}): void {
		cy.wrap(initial, { log: false }).as(this.alias);
	}

	set<K extends keyof CaseAnswers>(key: K, value: CaseAnswers[K]): void {
		cy.get<CaseAnswers>(`@${this.alias}`, { log: false }).then((answers) => {
			const updated: CaseAnswers = { ...answers, [key]: value };
			cy.wrap(updated, { log: false }).as(this.alias);
		});
	}

	get(): Cypress.Chainable<CaseAnswers> {
		return cy.get<CaseAnswers>(`@${this.alias}`, { log: false });
	}

	getValue<K extends keyof CaseAnswers>(key: K): Cypress.Chainable<CaseAnswers[K]> {
		return this.get().then((answers) => {
			return cy.wrap(answers[key], { log: false }) as Cypress.Chainable<CaseAnswers[K]>;
		});
	}

	assertHas<K extends keyof CaseAnswers>(key: K): void {
		this.get().then((answers) => {
			expect(answers[key], `Expected journey answer "${String(key)}" to be recorded`).to.not.equal(undefined);
		});
	}

	formatDateForCheckAnswers(date?: { day: string; month: string; year: string }): string {
		if (!date) return '';

		const jsDate = new Date(Number(date.year), Number(date.month) - 1, Number(date.day));

		return jsDate.toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	getExpectedCaseTypeLabel(journey: Journeys): string {
		const map: Partial<Record<Journeys['caseType'], string>> = {
			drought: 'Drought',
			housingAndPlanningCPOs: 'Housing and Planning CPOs',
			otherSosCasework: 'Other Secretary of State casework',
			purchaseNotices: 'Purchase Notices',
			wayleaves: 'Wayleaves',
			coastalAccess: 'Coastal Access',
			commonLand: 'Common Land',
			rightsOfWay: 'Rights of Way'
		};

		return map[journey.caseType] ?? journey.caseType;
	}

	getExpectedSubtypeLabel(journey: Journeys): string {
		// keep your existing implementation
		if ('droughtSubtype' in journey && journey.droughtSubtype) {
			const map = {
				droughtPermits: 'Drought Permits',
				droughtOrders: 'Drought Orders'
			} as const;
			return map[journey.droughtSubtype];
		}

		if ('cpoSubtype' in journey && journey.cpoSubtype) {
			const map = {
				housing: 'Housing',
				planning: 'Planning',
				adhoc: 'Ad hoc'
			} as const;
			return map[journey.cpoSubtype];
		}

		if ('sosSubtype' in journey && journey.sosSubtype) {
			const map: Record<typeof journey.sosSubtype, string> = {
				defraCpo: 'DEFRA CPO',
				desnzCpo: 'DESNZ CPO',
				dftCpo: 'DfT CPO',
				adHocCpo: 'Ad hoc CPO',
				advert: 'Advert',
				completionNotice: 'Completion notice',
				discontinuanceNotice: 'Discontinuance notice',
				modificationToPp: 'Modification to planning permission',
				reviewOfMineralPp: 'Review of mineral permission',
				revocation: 'Revocation',
				other: 'Other'
			};

			return map[journey.sosSubtype];
		}

		if ('wayleavesSubtype' in journey && journey.wayleavesSubtype) {
			const map = {
				newLines: 'New lines',
				treeLopping: 'Tree lopping',
				wayleaves: 'Wayleaves'
			} as const;
			return map[journey.wayleavesSubtype];
		}

		if ('coastalAccessSubtype' in journey && journey.coastalAccessSubtype) {
			const map = {
				coastalAccessAppeal: 'Coastal access appeal',
				noticeAppeal: 'Notice appeal',
				objection: 'Objection',
				restrictionAppeal: 'Restriction appeal (access land)'
			} as const;
			return map[journey.coastalAccessSubtype];
		}

		if ('commonLandSubtype' in journey && journey.commonLandSubtype) {
			const map = {
				ecclesiastical: 'Commons for Ecclesiastical Purposes',
				greaterLondon: 'Commons in Greater London',
				compulsoryPurchase: 'Compulsory Purchase of Common Land',
				deregistrationExchange: 'Deregistration & Exchange',
				inclosure: 'Inclosure',
				inclosureObsolescent: 'Inclosure : obsolescent functions',
				landExchange: 'Land Exchange',
				localActs: 'Local Acts and Provisional Order Confirmation Acts',
				publicAccessLimitations: 'Public Access to Commons - limitations and restrictions',
				referredApplications: 'Referred applications from Commons Registration Authorities',
				schemeOfManagement: 'Scheme of Management',
				stintRates: 'Stint Rates',
				worksCommonLand: 'Works on Common Land',
				worksCommonLandNt: 'Works on Common Land (National Trust)'
			} as const;
			return map[journey.commonLandSubtype];
		}

		if ('rightsOfWaySubtype' in journey && journey.rightsOfWaySubtype) {
			const map = {
				dispensationHa80: 'Dispensation for Serving Notice HA80',
				dispensationTcpa90: 'Dispensation for Serving Notice TCPA90',
				dispensationWca81: 'Dispensation for Serving Notice WCA81',
				opposedDmmo: 'Opposed Definitive Map Modification Order (DMMO)',
				opposedPpoHa80: 'Opposed Public Path Order (PPO) HA80',
				opposedPpoTcpa90: 'Opposed Public Path Order (PPO) TCPA90',
				schedule14Appeal: 'Schedule 14 Appeal',
				schedule14Direction: 'Schedule 14 Direction',
				schedule13aAppeal: 'Schedule 13A Appeal'
			} as const;
			return map[journey.rightsOfWaySubtype];
		}

		return '';
	}
}

export default new AnswersUtility();
