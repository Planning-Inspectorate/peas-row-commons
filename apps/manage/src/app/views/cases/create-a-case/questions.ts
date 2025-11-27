import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import { CASE_TYPES, CASEWORK_AREAS } from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';
import { PLANNING_ENVIRONMENTAL_APPLICATIONS_TYPES, RIGHTS_OF_WAY_COMMON_LAND_TYPES } from '@pins/peas-row-commons-database/src/seed/static_data/types.ts';
import { DROUGHT_SUBTYPES } from '@pins/peas-row-commons-database/src/seed/static_data/subtypes.ts';

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
			fieldName: 'planning-environment-applications',
			url: 'peas-type-of-case',
			options: PLANNING_ENVIRONMENTAL_APPLICATIONS_TYPES.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator('Select a Planning and Environmental Applications')]
		},
	    drought: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Drought',
			question: 'What Drought subtype is it?',
			fieldName: 'drought',
			url: 'drought-subtype',
			options: DROUGHT_SUBTYPES.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator('Select a drought')]
		},
		rightsOfWayAndCommonLand: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Rights of Way and Common Land',
			question: 'Which Case type is it?',
			fieldName: 'rights-of-way-and-common-land',
			url: 'row-type-of-case',
			options: RIGHTS_OF_WAY_COMMON_LAND_TYPES.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator('Select a Right of Way and Common Land')]
		}
	};

	return createQuestions(questions, questionClasses, {});
}
