import { CASE_SUBTYPES_ID, CASE_TYPES_ID } from './ids/index.ts';

export const DROUGHT_SUBTYPES = [
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
	}
];

export const HOUSING_PLANNING_CPOS_SUBTYPES = [
	{
		id: CASE_SUBTYPES_ID.HOUSING,
		displayName: 'Housing',
		parentTypeId: CASE_TYPES_ID.HOUSING_PLANNING_CPOS
	}
];

export const OTHER_SOS_CASEWORK_SUBTYPES = [
	{
		id: CASE_SUBTYPES_ID.DEFRA_CPO,
		displayName: 'DEFRA CPO',
		parentTypeId: CASE_TYPES_ID.OTHER_SOS_CASEWORK
	}
];

export const COASTAL_ACCESS_SUBTYPES = [
	{
		id: CASE_SUBTYPES_ID.NOTICE_APPEAL,
		displayName: 'Notice appeal',
		parentTypeId: CASE_TYPES_ID.COASTAL_ACCESS
	}
];

export const COMMON_LAND_SUBTYPES = [
	{
		id: CASE_SUBTYPES_ID.COMMONS_ECCLESIASTICAL,
		displayName: 'Commons for Ecclesiastical Purposes',
		parentTypeId: CASE_TYPES_ID.COMMON_LAND
	}
];

export const RIGHTS_OF_WAY_SUBTYPES = [
	{
		id: CASE_SUBTYPES_ID.OPPOSED_DMMO,
		displayName: 'Opposed DMMO',
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
