import type { Journeys } from '../types/journeys.ts';

/**
 * Test fixture defining supported planning journeys.
 *
 * Each entry represents a valid case creation path used in tests,
 * including its hierarchy (name), internal type mappings, and
 * expected reference prefix.
 *
 * The `name` field uses ">" to mirror the UI selection flow.
 */
export const planningJourneys = [
	{
		name: 'Planning > Drought > Drought Permits',
		caseworkArea: 'planning',
		caseType: 'drought',
		droughtSubtype: 'droughtPermits',
		referencePrefix: 'DRO/PER/',
		tags: ['regression']
	},
	{
		name: 'Planning > Drought > Drought Orders',
		caseworkArea: 'planning',
		caseType: 'drought',
		droughtSubtype: 'droughtOrders',
		referencePrefix: 'DRO/ORD/',
		tags: ['regression']
	},
	{
		name: 'Planning > Housing and Planning CPOs > Housing',
		caseworkArea: 'planning',
		caseType: 'housingAndPlanningCPOs',
		cpoSubtype: 'housing',
		referencePrefix: 'CPO/HOU/',
		tags: ['smoke', 'regression']
	},
	{
		name: 'Planning > Housing and Planning CPOs > Planning',
		caseworkArea: 'planning',
		caseType: 'housingAndPlanningCPOs',
		cpoSubtype: 'planning',
		referencePrefix: 'CPO/PLA/',
		tags: ['regression']
	},
	{
		name: 'Planning > Housing and Planning CPOs > Ad hoc',
		caseworkArea: 'planning',
		caseType: 'housingAndPlanningCPOs',
		cpoSubtype: 'adhoc',
		referencePrefix: 'CPO/ADH/',
		tags: ['regression']
	},
	{
		name: 'Planning > Other Secretary of State casework > DESNZ CPO',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'desnzCpo',
		referencePrefix: 'SOS/ENG/',
		tags: ['regression']
	},
	{
		name: 'Planning > Other Secretary of State casework > DfT CPO',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'dftCpo',
		referencePrefix: 'SOS/TRN/',
		tags: ['regression']
	},
	{
		name: 'Planning > Other Secretary of State casework > Ad hoc CPO',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'adHocCpo',
		referencePrefix: 'SOS/CPO/',
		tags: ['regression']
	},
	{
		name: 'Planning > Other Secretary of State casework > Advert',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'advert',
		referencePrefix: 'SOS/ADV/',
		tags: ['regression']
	},
	{
		name: 'Planning > Other Secretary of State casework > Completion notice',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'completionNotice',
		referencePrefix: 'SOS/COM/',
		tags: ['regression']
	},
	{
		name: 'Planning > Other Secretary of State casework > Discontinuance notice',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'discontinuanceNotice',
		referencePrefix: 'SOS/DIS/',
		tags: ['regression']
	},
	{
		name: 'Planning > Other Secretary of State casework > Modification to planning permission',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'modificationToPp',
		referencePrefix: 'SOS/MOD/',
		tags: ['regression']
	},
	{
		name: 'Planning > Other Secretary of State casework > Review of mineral permission',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'reviewOfMineralPp',
		referencePrefix: 'SOS/MIN/',
		tags: ['regression']
	},
	{
		name: 'Planning > Other Secretary of State casework > Revocation',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'revocation',
		referencePrefix: 'SOS/REV/',
		tags: ['regression']
	},
	{
		name: 'Planning > Other Secretary of State casework > Other',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'other',
		referencePrefix: 'SOS/OTH/',
		tags: ['regression']
	},
	{
		name: 'Planning > Purchase Notices',
		caseworkArea: 'planning',
		caseType: 'purchaseNotices',
		referencePrefix: 'PUR/',
		tags: ['regression']
	},
	{
		name: 'Planning > Wayleaves > New lines',
		caseworkArea: 'planning',
		caseType: 'wayleaves',
		wayleavesSubtype: 'newLines',
		referencePrefix: 'WAY/LIN/',
		tags: ['smoke', 'regression']
	},
	{
		name: 'Planning > Wayleaves > Tree lopping',
		caseworkArea: 'planning',
		caseType: 'wayleaves',
		wayleavesSubtype: 'treeLopping',
		referencePrefix: 'WAY/TRE/',
		tags: ['regression']
	},
	{
		name: 'Planning > Wayleaves > Wayleaves',
		caseworkArea: 'planning',
		caseType: 'wayleaves',
		wayleavesSubtype: 'wayleaves',
		referencePrefix: 'WAY/WAY/',
		tags: ['smoke', 'regression']
	}
] as const satisfies readonly Journeys[];
