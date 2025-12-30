import { CASE_SUBTYPES_ID, CASE_TYPES_ID } from './ids/index.ts';

export const DROUGHT_SUBTYPES = [
	{
		id: CASE_SUBTYPES_ID.DROUGHT_PERMITS,
		displayName: 'Drought Permits',
		parentTypeId: CASE_TYPES_ID.DROUGHT
	},
	{
		id: CASE_SUBTYPES_ID.DROUGHT_ORDERS,
		displayName: 'Drought Orders',
		parentTypeId: CASE_TYPES_ID.DROUGHT
	}
];

export const WAYLEAVES_SUBTYPES = [
	{
		id: CASE_SUBTYPES_ID.NEW_LINES,
		displayName: 'New lines',
		parentTypeId: CASE_TYPES_ID.WAYLEAVES
	},
	{
		id: CASE_SUBTYPES_ID.TREE_LOPPING,
		displayName: 'Tree lopping',
		parentTypeId: CASE_TYPES_ID.WAYLEAVES
	},
	{
		id: CASE_SUBTYPES_ID.WAYLEAVES_GENERIC,
		displayName: 'Wayleaves',
		parentTypeId: CASE_TYPES_ID.WAYLEAVES
	}
];

export const HOUSING_PLANNING_CPOS_SUBTYPES = [
	{
		id: CASE_SUBTYPES_ID.HOUSING,
		displayName: 'Housing',
		parentTypeId: CASE_TYPES_ID.HOUSING_PLANNING_CPOS
	},
	{
		id: CASE_SUBTYPES_ID.PLANNING_SUB,
		displayName: 'Planning',
		parentTypeId: CASE_TYPES_ID.HOUSING_PLANNING_CPOS
	},
	{
		id: CASE_SUBTYPES_ID.ADHOC,
		displayName: 'Ad hoc',
		parentTypeId: CASE_TYPES_ID.HOUSING_PLANNING_CPOS
	}
];

export const OTHER_SOS_CASEWORK_SUBTYPES = [
	{
		id: CASE_SUBTYPES_ID.DEFRA_CPO,
		displayName: 'DEFRA CPO',
		parentTypeId: CASE_TYPES_ID.OTHER_SOS_CASEWORK
	},
	{
		id: CASE_SUBTYPES_ID.DESNZ_CPO,
		displayName: 'DESNZ CPO',
		parentTypeId: CASE_TYPES_ID.OTHER_SOS_CASEWORK
	},
	{
		id: CASE_SUBTYPES_ID.DFT_CPO,
		displayName: 'DfT CPO',
		parentTypeId: CASE_TYPES_ID.OTHER_SOS_CASEWORK
	},
	{
		id: CASE_SUBTYPES_ID.ADHOC_CPO,
		displayName: 'Ad hoc CPO',
		parentTypeId: CASE_TYPES_ID.OTHER_SOS_CASEWORK
	},
	{
		id: CASE_SUBTYPES_ID.ADVERT,
		displayName: 'Advert',
		parentTypeId: CASE_TYPES_ID.OTHER_SOS_CASEWORK
	},
	{
		id: CASE_SUBTYPES_ID.COMPLETION_NOTICE,
		displayName: 'Completion notice',
		parentTypeId: CASE_TYPES_ID.OTHER_SOS_CASEWORK
	},
	{
		id: CASE_SUBTYPES_ID.DISCONTINUANCE_NOTICE,
		displayName: 'Discontinuance notice',
		parentTypeId: CASE_TYPES_ID.OTHER_SOS_CASEWORK
	},
	{
		id: CASE_SUBTYPES_ID.MODIFICATION_TO_PP,
		displayName: 'Modification to planning permission',
		parentTypeId: CASE_TYPES_ID.OTHER_SOS_CASEWORK
	},
	{
		id: CASE_SUBTYPES_ID.REVIEW_OF_MINERAL_PP,
		displayName: 'Review of mineral permission',
		parentTypeId: CASE_TYPES_ID.OTHER_SOS_CASEWORK
	},
	{
		id: CASE_SUBTYPES_ID.REVOCATION,
		displayName: 'Revocation',
		parentTypeId: CASE_TYPES_ID.OTHER_SOS_CASEWORK
	}
];

export const COASTAL_ACCESS_SUBTYPES = [
	{
		id: CASE_SUBTYPES_ID.COASTAL_ACCESS_APPEAL,
		displayName: 'Coastal access appeal',
		parentTypeId: CASE_TYPES_ID.COASTAL_ACCESS
	},
	{
		id: CASE_SUBTYPES_ID.NOTICE_APPEAL,
		displayName: 'Notice appeal',
		parentTypeId: CASE_TYPES_ID.COASTAL_ACCESS
	},
	{
		id: CASE_SUBTYPES_ID.OBJECTION,
		displayName: 'Objection',
		parentTypeId: CASE_TYPES_ID.COASTAL_ACCESS
	},
	{
		id: CASE_SUBTYPES_ID.RESTRICTION_APPEAL,
		displayName: 'Restriction appeal (access land)',
		parentTypeId: CASE_TYPES_ID.COASTAL_ACCESS
	}
];

export const COMMON_LAND_SUBTYPES = [
	{
		id: CASE_SUBTYPES_ID.COMMONS_ECCLESIASTICAL,
		displayName: 'Commons for Ecclesiastical Purposes',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	},
	{
		id: CASE_SUBTYPES_ID.COMMONS_GREATER_LONDON,
		displayName: 'Commons in Greater London',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	},
	{
		id: CASE_SUBTYPES_ID.COMPULSORY_PURCHASE_CL,
		displayName: 'Compulsory Purchase of Common Land',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	},
	{
		id: CASE_SUBTYPES_ID.CORRECTION_CL_REGISTER,
		displayName: 'Correction of the Common Land or Village Green Registers',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	},
	{
		id: CASE_SUBTYPES_ID.DEREGISTRATION_EXCHANGE,
		displayName: 'Deregistration & Exchange',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	},
	{
		id: CASE_SUBTYPES_ID.INCLOSURE,
		displayName: 'Inclosure',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	},
	{
		id: CASE_SUBTYPES_ID.INCLOSURE_OBSOLESCENT,
		displayName: 'Inclosure : obsolescent functions',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	},
	{
		id: CASE_SUBTYPES_ID.LAND_EXCHANGE,
		displayName: 'Land Exchange',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	},
	{
		id: CASE_SUBTYPES_ID.LOCAL_ACTS,
		displayName: 'Local Acts and Provisional Order Confirmation Acts',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	},
	{
		id: CASE_SUBTYPES_ID.PUBLIC_ACCESS_LIMITATIONS,
		displayName: 'Public Access to Commons - limitations and restrictions',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	},
	{
		id: CASE_SUBTYPES_ID.SCHEME_OF_MANAGEMENT,
		displayName: 'Scheme of Management',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	},
	{
		id: CASE_SUBTYPES_ID.STINT_RATES,
		displayName: 'Stint Rates',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	},
	{
		id: CASE_SUBTYPES_ID.WORKS_COMMON_LAND,
		displayName: 'Works on Common Land',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	},
	{
		id: CASE_SUBTYPES_ID.WORKS_COMMON_LAND_NT,
		displayName: 'Works on Common Land (National Trust)',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	}
];

export const RIGHTS_OF_WAY_SUBTYPES = [
	{
		id: CASE_SUBTYPES_ID.DISPENSATION_HA80,
		displayName: 'Dispensation for Serving Notice HA80',
		parentTypeId: CASE_TYPES_ID.RIGHTS_OF_WAY
	},
	{
		id: CASE_SUBTYPES_ID.DISPENSATION_TCPA90,
		displayName: 'Dispensation for Serving Notice TCPA90',
		parentTypeId: CASE_TYPES_ID.RIGHTS_OF_WAY
	},
	{
		id: CASE_SUBTYPES_ID.DISPENSATION_WCA81,
		displayName: 'Dispensation for Serving Notice WCA81',
		parentTypeId: CASE_TYPES_ID.RIGHTS_OF_WAY
	},
	{
		id: CASE_SUBTYPES_ID.OPPOSED_DMMO,
		displayName: 'Opposed Definitive Map Modification Order (DMMO)',
		parentTypeId: CASE_TYPES_ID.RIGHTS_OF_WAY
	},
	{
		id: CASE_SUBTYPES_ID.OPPOSED_PPO_HA80,
		displayName: 'Opposed Public Path Order (PPO) HA80',
		parentTypeId: CASE_TYPES_ID.RIGHTS_OF_WAY
	},
	{
		id: CASE_SUBTYPES_ID.OPPOSED_PPO_TCPA90,
		displayName: 'Opposed Public Path Order (PPO) TCPA90',
		parentTypeId: CASE_TYPES_ID.RIGHTS_OF_WAY
	},
	{
		id: CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL,
		displayName: 'Schedule 14 Appeal',
		parentTypeId: CASE_TYPES_ID.RIGHTS_OF_WAY
	},
	{
		id: CASE_SUBTYPES_ID.SCHEDULE_14_DIRECTION,
		displayName: 'Schedule 14 Direction',
		parentTypeId: CASE_TYPES_ID.RIGHTS_OF_WAY
	},
	{
		id: CASE_SUBTYPES_ID.SCHEDULE_13A_APPEAL,
		displayName: 'Schedule 13A Appeal',
		parentTypeId: CASE_TYPES_ID.RIGHTS_OF_WAY
	}
];

export const CASE_SUBTYPES = [
	...DROUGHT_SUBTYPES,
	...WAYLEAVES_SUBTYPES,
	...HOUSING_PLANNING_CPOS_SUBTYPES,
	...OTHER_SOS_CASEWORK_SUBTYPES,
	...COASTAL_ACCESS_SUBTYPES,
	...COMMON_LAND_SUBTYPES,
	...RIGHTS_OF_WAY_SUBTYPES
];
