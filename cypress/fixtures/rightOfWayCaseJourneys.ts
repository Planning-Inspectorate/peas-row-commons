import type { Journeys } from '../types/journeys.ts';

export const rightsOfWayJourneys: Journeys[] = [
	{
		name: 'Rights of Way > Coastal Access > Coastal access appeal',
		caseworkArea: 'rightsOfWay',
		caseType: 'coastalAccess',
		coastalAccessSubtype: 'coastalAccessAppeal',
		referencePrefix: 'MCA/CAA/'
	},
	{
		name: 'Rights of Way > Coastal Access > Notice appeal',
		caseworkArea: 'rightsOfWay',
		caseType: 'coastalAccess',
		coastalAccessSubtype: 'noticeAppeal',
		referencePrefix: 'MCA/NOT/'
	},
	{
		name: 'Rights of Way > Coastal Access > Objection',
		caseworkArea: 'rightsOfWay',
		caseType: 'coastalAccess',
		coastalAccessSubtype: 'objection',
		referencePrefix: 'MCA/OBJ/'
	},
	{
		name: 'Rights of Way > Coastal Access > Restriction appeal (access land)',
		caseworkArea: 'rightsOfWay',
		caseType: 'coastalAccess',
		coastalAccessSubtype: 'restrictionAppeal',
		referencePrefix: 'MCA/RES/'
	},
	{
		name: 'Rights of Way > Common Land > Commons for Ecclesiastical Purposes',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'ecclesiastical',
		referencePrefix: 'COM/ECC/'
	},
	{
		name: 'Rights of Way > Common Land > Commons in Greater London',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'greaterLondon',
		referencePrefix: 'COM/LDN/'
	},
	{
		name: 'Rights of Way > Common Land > Compulsory Purchase of Common Land',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'compulsoryPurchase',
		referencePrefix: 'COM/PCL/'
	},
	{
		name: 'Rights of Way > Common Land > Correction of the Common Land or Village Green Registers',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'correctionRegister',
		referencePrefix: 'COM/COR/'
	},
	{
		name: 'Rights of Way > Common Land > Deregistration & Exchange',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'deregistrationExchange',
		referencePrefix: 'COM/DRE/'
	},
	{
		name: 'Rights of Way > Common Land > Inclosure',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'inclosure',
		referencePrefix: 'COM/INC/'
	},
	{
		name: 'Rights of Way > Common Land > Inclosure : obsolescent functions',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'inclosureObsolescent',
		referencePrefix: 'COM/OBS/'
	},
	{
		name: 'Rights of Way > Common Land > Land Exchange',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'landExchange',
		referencePrefix: 'COM/LEX/'
	},
	{
		name: 'Rights of Way > Common Land > Local Acts and Provisional Order Confirmation Acts',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'localActs',
		referencePrefix: 'COM/LCA/'
	},
	{
		name: 'Rights of Way > Common Land > Public Access to Commons',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'publicAccessLimitations',
		referencePrefix: 'COM/PAC/'
	},
	{
		name: 'Rights of Way > Common Land > Scheme of Management',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'schemeOfManagement',
		referencePrefix: 'COM/SOM/'
	},
	{
		name: 'Rights of Way > Common Land > Stint Rates',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'stintRates',
		referencePrefix: 'COM/STI/'
	},
	{
		name: 'Rights of Way > Common Land > Works on Common Land',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'worksCommonLand',
		referencePrefix: 'COM/WCL/'
	},
	{
		name: 'Rights of Way > Common Land > Works on Common Land (National Trust)',
		caseworkArea: 'rightsOfWay',
		caseType: 'commonLand',
		commonLandSubtype: 'worksCommonLandNt',
		referencePrefix: 'COM/WNT/'
	},
	{
		name: 'Rights of Way > Rights of Way > Dispensation for Serving Notice HA80',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'dispensationHa80',
		referencePrefix: 'ROW/SNH/'
	},
	{
		name: 'Rights of Way > Rights of Way > Dispensation for Serving Notice TCPA90',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'dispensationTcpa90',
		referencePrefix: 'ROW/SNT/'
	},
	{
		name: 'Rights of Way > Rights of Way > Dispensation for Serving Notice WCA81',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'dispensationWca81',
		referencePrefix: 'ROW/SNW/'
	},
	{
		name: 'Rights of Way > Rights of Way > Opposed Definitive Map Modification Order (DMMO)',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'opposedDmmo',
		referencePrefix: 'ROW/DMM/'
	},
	{
		name: 'Rights of Way > Rights of Way > Opposed Public Path Order (PPO) HA80',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'opposedPpoHa80',
		referencePrefix: 'ROW/PPH/'
	},
	{
		name: 'Rights of Way > Rights of Way > Opposed Public Path Order (PPO) TCPA90',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'opposedPpoTcpa90',
		referencePrefix: 'ROW/PPT/'
	},
	{
		name: 'Rights of Way > Rights of Way > Schedule 14 Appeal',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'schedule14Appeal',
		referencePrefix: 'ROW/S14A/'
	},
	{
		name: 'Rights of Way > Rights of Way > Schedule 14 Direction',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'schedule14Direction',
		referencePrefix: 'ROW/S14D/'
	},
	{
		name: 'Rights of Way > Rights of Way > Schedule 13A Appeal',
		caseworkArea: 'rightsOfWay',
		caseType: 'rightsOfWay',
		rightsOfWaySubtype: 'schedule13aAppeal',
		referencePrefix: 'ROW/S13A/'
	}
];
