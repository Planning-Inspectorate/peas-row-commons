const DROUGHT_CASE_SUBTYPES_ID = Object.freeze({
	DROUGHT_PERMITS: 'drought-permits',
	DROUGHT_ORDERS: 'drought-orders'
});

const WAYLEAVES_CASE_SUBTYPES_ID = Object.freeze({
	NEW_LINES: 'new-lines',
	TREE_LOPPING: 'tree-lopping',
	WAYLEAVES_GENERIC: 'wayleaves-generic'
});

const HOUSING_PLANNING_CPOS_CASE_SUBTYPES_ID = Object.freeze({
	HOUSING: 'housing',
	PLANNING_SUB: 'planning-sub',
	ADHOC: 'adhoc'
});

const OTHER_SOS_CASEWORK_SUBTYPES_ID = Object.freeze({
	DEFRA_CPO: 'defra-cpo',
	DESNZ_CPO: 'desnz-cpo',
	DFT_CPO: 'dft-cpo',
	ADHOC_CPO: 'ad-hoc-cpo',
	SSSI: 'sssi',
	ADVERT: 'advert',
	DISCONTINUANCE_NOTICE: 'discontinuance-notice',
	REVOCATION: 'revocation',
	COMPLETION_NOTICE: 'completion-notice',
	MODIFICATION_TO_PP: 'modification-to-pp',
	REVIEW_OF_MINERAL_PP: 'review-of-mineral-pp'
});

const COASTAL_ACCESS_SUBTYPES_ID = Object.freeze({
	NOTICE_APPEAL: 'notice-appeal',
	COASTAL_ACCESS_APPEAL: 'coastal-access-appeal',
	OBJECTION: 'objection',
	RESTRICTION_APPEAL: 'restriction-appeal'
});

const COMMON_LAND_SUBTYPES_ID = Object.freeze({
	COMMONS_ECCLESIASTICAL: 'commons-ecclesiastical',
	COMMONS_GREATER_LONDON: 'commons-greater-london',
	COMPULSORY_PURCHASE_CL: 'compulsory-purchase-cl',
	CORRECTION_CL_REGISTER: 'correction-cl-register',
	DEREGISTRATION_EXCHANGE: 'deregistration-exchange',
	INCLOSURE: 'inclosure',
	INCLOSURE_OBSOLESCENT: 'inclosure-obsolescent',
	LAND_EXCHANGE: 'land-exchange',
	LOCAL_ACTS: 'local-acts',
	PUBLIC_ACCESS_LIMITATIONS: 'public-access-limitations',
	SCHEME_OF_MANAGEMENT: 'scheme-of-management',
	STINT_RATES: 'stint-rates',
	WORKS_COMMON_LAND: 'works-common-land',
	WORKS_COMMON_LAND_NT: 'works-common-land-nt'
});

const RIGHTS_OF_WAY_SUBTYPES_ID = Object.freeze({
	DISPENSATION_HA80: 'dispensation-ha80',
	DISPENSATION_TCPA90: 'dispensation-tcpa90',
	DISPENSATION_WCA81: 'dispensation-wca81',
	OPPOSED_DMMO: 'opposed-dmmo',
	OPPOSED_PPO_HA80: 'opposed-ppo-ha80',
	OPPOSED_PPO_TCPA90: 'opposed-ppo-tcpa90',
	SCHEDULE_14_APPEAL: 'schedule-14-appeal',
	SCHEDULE_14_DIRECTION: 'schedule-14-direction'
});

export const CASE_SUBTYPES_ID = Object.freeze({
	...DROUGHT_CASE_SUBTYPES_ID,
	...WAYLEAVES_CASE_SUBTYPES_ID,
	...HOUSING_PLANNING_CPOS_CASE_SUBTYPES_ID,
	...OTHER_SOS_CASEWORK_SUBTYPES_ID,
	...COASTAL_ACCESS_SUBTYPES_ID,
	...COMMON_LAND_SUBTYPES_ID,
	...RIGHTS_OF_WAY_SUBTYPES_ID
});
