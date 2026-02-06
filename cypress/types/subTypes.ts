export type Drought = 'droughtPermits' | 'droughtOrders';

export type CPOs = 'housing' | 'planning' | 'adhoc';

export type SoS =
	| 'defraCpo'
	| 'desnzCpo'
	| 'dftCpo'
	| 'adHocCpo'
	| 'advert'
	| 'completionNotice'
	| 'discontinuanceNotice'
	| 'modificationToPp'
	| 'reviewOfMineralPp'
	| 'revocation'
	| 'other';

export type Wayleaves = 'newLines' | 'treeLopping' | 'wayleaves';

export type CoastalAccess = 'coastalAccessAppeal' | 'noticeAppeal' | 'objection' | 'restrictionAppeal';

export type CommonLand =
	| 'ecclesiastical'
	| 'greaterLondon'
	| 'compulsoryPurchase'
	| 'correctionRegister'
	| 'deregistrationExchange'
	| 'inclosure'
	| 'inclosureObsolescent'
	| 'landExchange'
	| 'localActs'
	| 'publicAccessLimitations'
	| 'schemeOfManagement'
	| 'stintRates'
	| 'worksCommonLand'
	| 'worksCommonLandNt';

export type RightOfWay =
	| 'dispensationHa80'
	| 'dispensationTcpa90'
	| 'dispensationWca81'
	| 'opposedDmmo'
	| 'opposedPpoHa80'
	| 'opposedPpoTcpa90'
	| 'schedule14Appeal'
	| 'schedule14Direction'
	| 'schedule13aAppeal';
