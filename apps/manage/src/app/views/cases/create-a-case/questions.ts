import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import { CASE_TYPES, CASEWORK_AREAS } from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';
import { PLANNING_ENVIRONMENTAL_APPLICATIONS_TYPES, RIGHTS_OF_WAY_COMMON_LAND_TYPES } from '@pins/peas-row-commons-database/src/seed/static_data/types.ts';
import { DROUGHT_SUBTYPES, HOUSING_PLANNING_CPOS_SUBTYPES, OTHER_SOS_CASEWORK_SUBTYPES, WAYLEAVES_SUBTYPES } from '@pins/peas-row-commons-database/src/seed/static_data/subtypes.ts';
import { CASE_TYPES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/types.ts';
import { CASEWORK_AREAS_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/casework-areas.ts';

const SUB_TYPE_ERROR = 'Select the case subtype';

export function getQuestions() {
	const questions = {
		caseworkArea: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Casework area',
			question: 'What area does this new case relate to?',
			fieldName: 'casework-area',
			url: 'casework-area',
			options: CASEWORK_AREAS.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator('Select a Casework')]
		},
		planningEnvironmentApplications: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Planning and Environmental Applications',
			question: 'What case type is it?',
			fieldName: CASEWORK_AREAS_ID.PLANNING_ENVIRONMENTAL_APPLICATIONS,
			url: 'peas-type-of-case',
			options: PLANNING_ENVIRONMENTAL_APPLICATIONS_TYPES.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator('Select a Planning and Environmental Applications')]
		},
	    drought: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Drought',
			question: 'What Drought subtype is it?',
			fieldName: CASE_TYPES_ID.DROUGHT,
			url: 'drought-subtype',
			options: DROUGHT_SUBTYPES.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)],
			  backLink: '/cases/create-a-case/questions/peas-type-of-case'  // ← assign back link here
		},
		housingAndPlanningCpos: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Housing and Planning CPOs',
			question: 'Select the subtype that covers this Compulsory Purchase Order(CPO)',
			fieldName: CASE_TYPES_ID.HOUSING_PLANNING_CPOS,
			url: 'housing-planning-cpos-subtype',
			options:HOUSING_PLANNING_CPOS_SUBTYPES.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},
		otherSecretaryofStatecasework: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Other Secretary of State casework',
			question: 'Who Other Secretary of State casework subtype is it?',
			fieldName: CASE_TYPES_ID.OTHER_SOS_CASEWORK,
			url: 'other-sos-casework-subtype',
			options: OTHER_SOS_CASEWORK_SUBTYPES.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},
		//To do bit amguity with purchase notice cant se the the screen in ui
		purchaseNotices: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Purchase Notices',
			question: 'Enter the submitter’s email address',
			fieldName: CASE_TYPES_ID.PURCHASE_NOTICES,
			url: 'case-name',
			options: DROUGHT_SUBTYPES.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},
		wayleaves: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Wayleaves',
			question: 'What Wayleaves subtype is it?',
			fieldName: CASE_TYPES_ID.WAYLEAVES,
			url: 'wayleaves-subtype',
				options: WAYLEAVES_SUBTYPES.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},
		rightsOfWayAndCommonLand: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Rights of Way and Common Land',
			question: 'Which Case type is it?',
			fieldName: CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND,
			url: 'row-type-of-case',
			options: RIGHTS_OF_WAY_COMMON_LAND_TYPES.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator('Select a Right of Way and Common Land')]
		}
	};

	return createQuestions(questions, questionClasses, {});
}
