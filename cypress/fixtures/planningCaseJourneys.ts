import type { Journeys } from '../types/journeys.ts';

export const journeys: Journeys[] = [
	{
		name: 'Planning > Drought > Drought Permits',
		caseworkArea: 'planning',
		caseType: 'drought',
		droughtSubtype: 'droughtPermits'
	},
	{
		name: 'Planning > Drought > Drought Orders',
		caseworkArea: 'planning',
		caseType: 'drought',
		droughtSubtype: 'droughtOrders'
	},
	{
		name: 'Planning > Housing and Planning CPOs > Housing',
		caseworkArea: 'planning',
		caseType: 'housingAndPlanningCPOs',
		cpoSubtype: 'housing'
	},
	{
		name: 'Planning > Housing and Planning CPOs > Planning',
		caseworkArea: 'planning',
		caseType: 'housingAndPlanningCPOs',
		cpoSubtype: 'planning'
	},
	{
		name: 'Planning > Housing and Planning CPOs > Ad hoc',
		caseworkArea: 'planning',
		caseType: 'housingAndPlanningCPOs',
		cpoSubtype: 'adhoc'
	},
	{
		name: 'Planning > Other Secretary of State casework > DESNZ CPO',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'desnzCpo'
	},
	{
		name: 'Planning > Other Secretary of State casework > DfT CPO',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'dftCpo'
	},
	{
		name: 'Planning > Other Secretary of State casework > Ad hoc CPO',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'adHocCpo'
	},
	{
		name: 'Planning > Other Secretary of State casework > Advert',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'advert'
	},
	{
		name: 'Planning > Other Secretary of State casework > Completion notice',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'completionNotice'
	},
	{
		name: 'Planning > Other Secretary of State casework > Discontinuance notice',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'discontinuanceNotice'
	},
	{
		name: 'Planning > Other Secretary of State casework > Modification to planning permission',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'modificationToPp'
	},
	{
		name: 'Planning > Other Secretary of State casework > Review of mineral permission',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'reviewOfMineralPp'
	},
	{
		name: 'Planning > Other Secretary of State casework > Revocation',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'revocation'
	},
	{
		name: 'Planning > Other Secretary of State casework > Other',
		caseworkArea: 'planning',
		caseType: 'otherSosCasework',
		sosSubtype: 'other'
	},
	{
		name: 'Planning > Purchase Notices',
		caseworkArea: 'planning',
		caseType: 'purchaseNotices'
	},
	{
		name: 'Planning > Wayleaves > New lines',
		caseworkArea: 'planning',
		caseType: 'wayleaves',
		wayleavesSubtype: 'newLines'
	},
	{
		name: 'Planning > Wayleaves > Tree lopping',
		caseworkArea: 'planning',
		caseType: 'wayleaves',
		wayleavesSubtype: 'treeLopping'
	},
	{
		name: 'Planning > Wayleaves > Wayleaves',
		caseworkArea: 'planning',
		caseType: 'wayleaves',
		wayleavesSubtype: 'wayleaves'
	}
];
