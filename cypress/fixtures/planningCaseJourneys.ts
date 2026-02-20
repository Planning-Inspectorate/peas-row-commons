import type { Journeys } from '../types/journeys.ts';

export const journeys: Journeys[] = [
	{
		name: 'Planning > Drought > Drought Permits',
		caseworkArea: 'planning',
		caseType: 'drought',
		droughtSubtype: 'droughtPermits',
		referencePrefix: 'DRO/PER/'
	},
	{
		name: 'Planning > Drought > Drought Orders',
		caseworkArea: 'planning',
		caseType: 'drought',
		droughtSubtype: 'droughtOrders',
		referencePrefix: 'DRO/ORD/'
	},
	{
		name: 'Planning > Housing and Planning CPOs > Housing',
		caseworkArea: 'planning',
		caseType: 'housingAndPlanningCPOs',
		cpoSubtype: 'housing',
		referencePrefix: 'CPO/HOU/'
	},
	{
		name: 'Planning > Housing and Planning CPOs > Planning',
		caseworkArea: 'planning',
		caseType: 'housingAndPlanningCPOs',
		cpoSubtype: 'planning',
		referencePrefix: 'CPO/PLA/'
	},
	{
		name: 'Planning > Housing and Planning CPOs > Ad hoc',
		caseworkArea: 'planning',
		caseType: 'housingAndPlanningCPOs',
		cpoSubtype: 'adhoc',
		referencePrefix: 'CPO/ADH/'
	},
	{
		name: 'Planning > Other Secretary of State casework > DESNZ CPO',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'desnzCpo',
		referencePrefix: 'SOS/ENG/'
	},
	{
		name: 'Planning > Other Secretary of State casework > DfT CPO',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'dftCpo',
		referencePrefix: 'SOS/TRN/'
	},
	{
		name: 'Planning > Other Secretary of State casework > Ad hoc CPO',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'adHocCpo',
		referencePrefix: 'SOS/CPO/'
	},
	{
		name: 'Planning > Other Secretary of State casework > Advert',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'advert',
		referencePrefix: 'SOS/ADV/'
	},
	{
		name: 'Planning > Other Secretary of State casework > Completion notice',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'completionNotice',
		referencePrefix: 'SOS/COM/'
	},
	{
		name: 'Planning > Other Secretary of State casework > Discontinuance notice',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'discontinuanceNotice',
		referencePrefix: 'SOS/DIS/'
	},
	{
		name: 'Planning > Other Secretary of State casework > Modification to planning permission',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'modificationToPp',
		referencePrefix: 'SOS/MOD/'
	},
	{
		name: 'Planning > Other Secretary of State casework > Review of mineral permission',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'reviewOfMineralPp',
		referencePrefix: 'SOS/MIN/'
	},
	{
		name: 'Planning > Other Secretary of State casework > Revocation',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'revocation',
		referencePrefix: 'SOS/REV/'
	},
	{
		name: 'Planning > Other Secretary of State casework > Other',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'other',
		referencePrefix: 'SOS/OTH/'
	},
	{
		name: 'Planning > Purchase Notices',
		caseworkArea: 'planning',
		caseType: 'purchaseNotices',
		referencePrefix: 'PUR/'
	},
	{
		name: 'Planning > Wayleaves > New lines',
		caseworkArea: 'planning',
		caseType: 'wayleaves',
		wayleavesSubtype: 'newLines',
		referencePrefix: 'WAY/LIN/'
	},
	{
		name: 'Planning > Wayleaves > Tree lopping',
		caseworkArea: 'planning',
		caseType: 'wayleaves',
		wayleavesSubtype: 'treeLopping',
		referencePrefix: 'WAY/TRE/'
	},
	{
		name: 'Planning > Wayleaves > Wayleaves',
		caseworkArea: 'planning',
		caseType: 'wayleaves',
		wayleavesSubtype: 'wayleaves',
		referencePrefix: 'WAY/WAY/'
	}
];
