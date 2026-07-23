import type { Journeys } from '../types/journeys.ts';

/**
 * Test fixture defining supported Rights of Way journeys.
 *
 * Each entry maps a valid case creation path (UI hierarchy via `name`)
 * to its internal type/subtype values and expected reference prefix.
 *
 * The `name` field uses ">" to reflect the UI selection flow.
 */
export const rightsOfWayJourneys = [
	{
		name: 'Rights of Way > Coastal Access > Coastal access appeal',
		caseworkArea: 'rightsOfWay',
		caseType: 'coastalAccess',
		coastalAccessSubtype: 'coastalAccessAppeal',
		referencePrefix: 'MCA/CAA/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Coastal Access > Notice appeal',
		caseworkArea: 'rightsOfWay',
		caseType: 'coastalAccess',
		coastalAccessSubtype: 'noticeAppeal',
		referencePrefix: 'MCA/NOT/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Coastal Access > Objection',
		caseworkArea: 'rightsOfWay',
		caseType: 'coastalAccess',
		coastalAccessSubtype: 'objection',
		referencePrefix: 'MCA/OBJ/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Coastal Access > Restriction appeal (access land)',
		caseworkArea: 'rightsOfWay',
		caseType: 'coastalAccess',
		coastalAccessSubtype: 'restrictionAppeal',
		referencePrefix: 'MCA/RES/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Common Land > Commons for Ecclesiastical Purposes',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'ecclesiastical',
		referencePrefix: 'COM/ECC/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Common Land > Commons in Greater London',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'greaterLondon',
		referencePrefix: 'COM/LDN/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Common Land > Compulsory Purchase of Common Land',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'compulsoryPurchase',
		referencePrefix: 'COM/PCL/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Common Land > Deregistration & Exchange',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'deregistrationExchange',
		referencePrefix: 'COM/DRE/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Common Land > Inclosure',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'inclosure',
		referencePrefix: 'COM/INC/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Common Land > Inclosure: obsolescent functions',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'inclosureObsolescent',
		referencePrefix: 'COM/OBS/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Common Land > Land Exchange',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'landExchange',
		referencePrefix: 'COM/LEX/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Common Land > Local Acts and Provisional Order',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'localActs',
		referencePrefix: 'COM/LCA/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Common Land > Public Access to Commons',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'publicAccessLimitations',
		referencePrefix: 'COM/PAC/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Common Land > Referred applications',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'referredApplications',
		referencePrefix: 'COM/REF/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Common Land > Scheme of Management',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'schemeOfManagement',
		referencePrefix: 'COM/SOM/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Common Land > Stint Rates',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'stintRates',
		referencePrefix: 'COM/STI/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Common Land > Works on Common Land',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'worksCommonLand',
		referencePrefix: 'COM/WCL/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Common Land > Common Land (NT)',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'worksCommonLandNt',
		referencePrefix: 'COM/WNT/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Rights of Way > Dispensation for SN HA80',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'dispensationHa80',
		referencePrefix: 'ROW/SNH/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Rights of Way > Dispensation for SN TCPA90',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'dispensationTcpa90',
		referencePrefix: 'ROW/SNT/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Rights of Way > Dispensation for SN WCA81',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'dispensationWca81',
		referencePrefix: 'ROW/SNW/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Rights of Way > Opposed (DMMO)',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'opposedDmmo',
		referencePrefix: 'ROW/DMM/',
		tags: ['smoke', 'regression']
	},
	{
		name: 'Rights of Way > Rights of Way > Opposed (PPO) HA80',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'opposedPpoHa80',
		referencePrefix: 'ROW/PPH/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Rights of Way > Opposed (PPO) TCPA90',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'opposedPpoTcpa90',
		referencePrefix: 'ROW/PPT/',
		tags: ['smoke', 'regression']
	},
	{
		name: 'Rights of Way > Rights of Way > Schedule 14 Appeal',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'schedule14Appeal',
		referencePrefix: 'ROW/S14A/',
		tags: ['regression']
	},
	{
		name: 'Rights of Way > Rights of Way > Schedule 14 Direction',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'schedule14Direction',
		referencePrefix: 'ROW/S14D/',
		tags: ['smoke', 'regression']
	},
	{
		name: 'Rights of Way > Rights of Way > Schedule 13A Appeal',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'schedule13aAppeal',
		referencePrefix: 'ROW/S13A/',
		tags: ['regression']
	}
] as const satisfies readonly Journeys[];
