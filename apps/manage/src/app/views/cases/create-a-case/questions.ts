import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import ConditionalRequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/conditional-required-validator.js';
import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';
import AddressValidator from '@planning-inspectorate/dynamic-forms/src/validator/address-validator.js';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import { CASEWORK_AREAS, PROCEDURES } from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';
import {
	PLANNING_ENVIRONMENTAL_APPLICATIONS_TYPES,
	RIGHTS_OF_WAY_COMMON_LAND_TYPES
} from '@pins/peas-row-commons-database/src/seed/static_data/types.ts';
import {
	COASTAL_ACCESS_SUBTYPES,
	COMMON_LAND_SUBTYPES,
	DROUGHT_SUBTYPES,
	HOUSING_PLANNING_CPOS_SUBTYPES,
	OTHER_SOS_CASEWORK_SUBTYPES,
	RIGHTS_OF_WAY_SUBTYPES,
	WAYLEAVES_SUBTYPES
} from '@pins/peas-row-commons-database/src/seed/static_data/subtypes.ts';
import StringValidator from '@planning-inspectorate/dynamic-forms/src/validator/string-validator.js';
import {
	referenceDataToRadioOptions,
	SUB_TYPE_ERROR,
	CASE_TYPES_CAMEL,
	CASEWORK_AREAS_CAMEL,
	generateConditionalOptions,
	getParentPageOptions,
	getChildPageOptions
} from './questions-utils.ts';

import { PROCEDURE_GROUP_IDS, PROCEDURE_GROUPS, GROUP_RELATIONSHIPS } from './view-model.ts';

export function getQuestions(groupMembers = { caseOfficers: [] }) {
	const mappedGroupMembers = groupMembers.caseOfficers.map(referenceDataToRadioOptions);

	mappedGroupMembers.unshift({ text: '', value: '' });

	const questions = {
		caseworkArea: {
			type: COMPONENT_TYPES.RADIO,
			title: 'What area does this new case relate to?',
			question: 'What area does this new case relate to?',
			fieldName: 'caseworkArea',
			url: 'casework-area',
			options: CASEWORK_AREAS.map(referenceDataToRadioOptions),
			validators: [new RequiredValidator('Select the casework area')]
		},
		planningEnvironmentApplications: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Which Case type is it?',
			question: 'Which Case type is it?',
			fieldName: CASEWORK_AREAS_CAMEL.PLANNING_ENVIRONMENTAL_APPLICATIONS,
			url: 'peas-type-of-case',
			options: PLANNING_ENVIRONMENTAL_APPLICATIONS_TYPES.map(referenceDataToRadioOptions),
			validators: [new RequiredValidator('Select Planning, Environmental and Applications case type')]
		},
		drought: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Which Drought subtype is it?',
			question: 'Which Drought subtype is it?',
			fieldName: CASE_TYPES_CAMEL.DROUGHT,
			url: 'drought-subtype',
			options: DROUGHT_SUBTYPES.map(referenceDataToRadioOptions),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},
		housingAndPlanningCpos: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Which Compulsory Purchase Order (CPO) subtype is it?',
			question: 'Which Compulsory Purchase Order (CPO) subtype is it?',
			fieldName: CASE_TYPES_CAMEL.HOUSING_PLANNING_CPOS,
			url: 'housing-planning-cpos-subtype',
			options: HOUSING_PLANNING_CPOS_SUBTYPES.map(referenceDataToRadioOptions),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},
		otherSecretaryofStateCasework: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Which Other Secretary of State casework subtype is it?',
			question: 'Which Other Secretary of State casework subtype is it?',
			fieldName: CASE_TYPES_CAMEL.OTHER_SOS_CASEWORK,
			url: 'other-sos-casework-subtype',
			options: generateConditionalOptions(OTHER_SOS_CASEWORK_SUBTYPES, { conditionalKeys: [], addOther: true }),
			validators: [
				new RequiredValidator(SUB_TYPE_ERROR),
				new ConditionalRequiredValidator('Other SoS Subtype must be between 1 and 150 characters')
			]
		},
		wayleaves: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Wayleaves',
			question: 'What Wayleaves subtype is it?',
			fieldName: CASE_TYPES_CAMEL.WAYLEAVES,
			url: 'wayleaves-subtype',
			options: WAYLEAVES_SUBTYPES.map(referenceDataToRadioOptions),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},
		rightsOfWayAndCommonLand: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Which Case type is it?',
			question: 'Which Case type is it?',
			fieldName: CASEWORK_AREAS_CAMEL.RIGHTS_OF_WAY_COMMON_LAND,
			url: 'row-type-of-case',
			options: RIGHTS_OF_WAY_COMMON_LAND_TYPES.map(referenceDataToRadioOptions),
			validators: [new RequiredValidator('Select the Right of Way and Common Land case type')]
		},
		coastalAccess: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Which Coastal Access subtype is it?',
			question: 'Which Coastal Access subtype is it?',
			fieldName: CASE_TYPES_CAMEL.COASTAL_ACCESS,
			url: 'coastal-subtype',
			options: COASTAL_ACCESS_SUBTYPES.map(referenceDataToRadioOptions),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},
		commonLand: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Which Common Land subtype is it?',
			question: 'Which Common Land subtype is it?',
			fieldName: CASE_TYPES_CAMEL.COMMON_LAND,
			url: 'common-land-subtype',
			options: COMMON_LAND_SUBTYPES.map(referenceDataToRadioOptions),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},
		rightsOfWay: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Which Rights of Way subtype is it?',
			question: 'Which Rights of Way subtype is it?',
			fieldName: CASE_TYPES_CAMEL.RIGHTS_OF_WAY,
			url: 'row-subtype',
			options: RIGHTS_OF_WAY_SUBTYPES.map(referenceDataToRadioOptions),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},
		caseName: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'What is the case name?',
			question: 'What is the case name?',
			fieldName: 'name',
			url: 'case-name',
			validators: [
				new RequiredValidator('Enter the case name'),
				new StringValidator({
					maxLength: {
						maxLength: 200,
						maxLengthMessage: 'Case name must be less than 200 characters'
					}
				})
			]
		},
		externalReference: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'What is the external reference?',
			question: 'What is the external reference?',
			hint: '(optional)',
			fieldName: 'externalReference',
			url: 'external-reference',
			validators: [
				new StringValidator({
					maxLength: {
						maxLength: 50,
						maxLengthMessage: 'Case name must be less than 50 characters'
					}
				})
			]
		},
		receivedDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'When was the case received?',
			question: 'When was the case received?',
			hint: 'For example, 27 3 2007',
			fieldName: 'receivedDate',
			url: 'case-received-date',
			validators: [new DateValidator('Received date of submission')]
		},
		applicant: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Who is the applicant?',
			question: 'Who is the applicant?',
			hint: 'Enter either the applicant or server',
			fieldName: 'applicant',
			url: 'applicant',
			validators: [
				new RequiredValidator('Enter the applicant'),
				new StringValidator({
					maxLength: {
						maxLength: 150,
						maxLengthMessage: 'Applicant must be less than 150 characters'
					}
				})
			]
		},
		siteAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'What is the site address?',
			question: 'What is the site address?',
			hint: '(optional)',
			fieldName: 'siteAddress',
			url: 'site-address',
			validators: [new AddressValidator()]
		},
		location: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'What is the site location if no address was added?',
			question: 'What is the site location if no address was added?',
			hint: 'For example, name of common, village green, area or body of water',
			fieldName: 'location',
			url: 'location',
			validators: [
				new StringValidator({
					maxLength: {
						maxLength: 150,
						maxLengthMessage: 'Location must be less than 150 characters'
					}
				})
			]
		},
		authority: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Who is the authority?',
			question: 'Who is the authority?',
			hint: 'Enter the Local Planning Authority or Common Registration Authority (optional)',
			fieldName: 'authority',
			url: 'authority',
			validators: [
				new StringValidator({
					maxLength: {
						maxLength: 150,
						maxLengthMessage: 'Authority must be less than 150 characters'
					}
				})
			]
		},
		caseOfficer: {
			type: COMPONENT_TYPES.SELECT,
			title: 'Who is the assigned case officer?',
			question: 'Who is the assigned case officer?',
			fieldName: 'caseOfficerId',
			url: 'case-officer',
			validators: [new RequiredValidator('Select a case officer')],
			options: mappedGroupMembers
		},
		procedure: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Which procedure will be used?',
			question: 'Which procedure will be used?',
			fieldName: 'procedureId',
			url: 'procedure',
			options: getParentPageOptions(PROCEDURES, PROCEDURE_GROUPS, GROUP_RELATIONSHIPS).map(referenceDataToRadioOptions),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},
		adminProcedure: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Which in house admin procedure will be used?',
			question: 'Which in house admin procedure will be used?',
			fieldName: 'adminProcedureId',
			url: 'admin-procedure',
			options: getChildPageOptions(PROCEDURE_GROUP_IDS.ADMIN, PROCEDURES, GROUP_RELATIONSHIPS).map(
				referenceDataToRadioOptions
			),
			validators: [new RequiredValidator('Select in house admin procedure')]
		},
		siteVisitProcedure: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Which type of site visit will be conducted?',
			question: 'Which type of site visit will be conducted?',
			fieldName: 'siteVisitProcedureId',
			url: 'site-visit-procedure',
			options: getChildPageOptions(PROCEDURE_GROUP_IDS.SITE_VISIT, PROCEDURES, GROUP_RELATIONSHIPS).map(
				referenceDataToRadioOptions
			),
			validators: [new RequiredValidator('Select type of site visit')]
		}
	};

	return createQuestions(questions, questionClasses, {});
}
