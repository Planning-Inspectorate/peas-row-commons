import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';
import AddressValidator from '@planning-inspectorate/dynamic-forms/src/validator/address-validator.js';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import {  CASEWORK_AREAS } from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';
import {  PLANNING_ENVIRONMENTAL_APPLICATIONS_TYPES, PROCEDURE_TYPES, RIGHTS_OF_WAY_COMMON_LAND_TYPES } from '@pins/peas-row-commons-database/src/seed/static_data/types.ts';
import { COASTAL_ACCESS_SUBTYPES, COMMON_LAND_SUBTYPES, DROUGHT_SUBTYPES, HOUSING_PLANNING_CPOS_SUBTYPES, OTHER_SOS_CASEWORK_SUBTYPES, RIGHTS_OF_WAY_SUBTYPES, WAYLEAVES_SUBTYPES } from '@pins/peas-row-commons-database/src/seed/static_data/subtypes.ts';
import { CASE_TYPES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/types.ts';
import { CASEWORK_AREAS_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/casework-areas.ts';
import { CASE_NAME_IDS } from '@pins/peas-row-commons-database/src/seed/static_data/ids/casename.ts';
import StringValidator from '@planning-inspectorate/dynamic-forms/src/validator/string-validator.js';


const SUB_TYPE_ERROR = 'Select the case subtype';
const  CASE_NAME_ERROR= 'Case name must be between 1 and 200 characters';

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
			// url: 'case-name',
			// options: DROUGHT_SUBTYPES.map((t) => ({ text: t.displayName, value: t.id })),
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
		},
		coastalAccess: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Coastal Access',
			question: 'What Coastal Access subtype is it?',
			fieldName: CASE_TYPES_ID.COASTAL_ACCESS,
			url: 'coastal-subtype',
			options: COASTAL_ACCESS_SUBTYPES.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},
		commonLand: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Common Land',
			question: 'What Common Land subtype is it?',
			fieldName: CASE_TYPES_ID.COMMON_LAND,
			url: 'common-land-subtype',
			options: COMMON_LAND_SUBTYPES.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},
		rightsOfWay: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Rights of Way',
			question: 'What Rights of Way subtype is it?',
			fieldName: CASE_TYPES_ID.RIGHTS_OF_WAY,
			url: 'row-subtype',
			options: RIGHTS_OF_WAY_SUBTYPES.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},

			caseName: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Case name',
			question: 'What is the case name?',
			fieldName: CASE_NAME_IDS.CASE_NAME,
			url: 'case-name',
			validators: [
			new RequiredValidator('Enter the case name'),
			new StringValidator({
				maxLength: {
					maxLength: 200,
					maxLengthMessage: `Case name must be less than 200 characters`
				}
			})
		]
		},
		externalReference: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'External reference',
			question: 'What is the external reference?',
			hint:'(optional)',
			fieldName: CASE_NAME_IDS.EXTERNAL_REFERENCE,
			url: 'external-reference',
			validators: [
			new RequiredValidator('Enter the externel refernce'),
			new StringValidator({
				maxLength: {
					maxLength: 50,
					maxLengthMessage: `Case name must be less than 50 characters`
				}
			})
		]
		},
		caseReceived : {
			type: COMPONENT_TYPES.DATE,
			title: 'Case received',
			question: 'What was the case received?',
			hint:'For example, 27 3 2007',
			fieldName: CASE_NAME_IDS.CASE_RECEIVED,
			url: 'case-received-date',
				validators: [new DateValidator('Received date of submission')]
		},
		applicant: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Applicant',
			question: 'Who is the applicant?',
			hint:'Enter either the applicant or server',
			fieldName: CASE_NAME_IDS.APPLICANT,
			url: 'applicant',
			validators: [
			new RequiredValidator('Enter the applicant'),
			new StringValidator({
				maxLength: {
					maxLength: 150,
					maxLengthMessage: `Applicant must be less than 150 characters`
				}
			})
		]
		},
			
		siteAddress: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Site address',
			question: 'What is the site address?',
			hint: 'Optional',
			fieldName: CASE_NAME_IDS.SITE_ADDRESS,
			url: 'site-address',
	validators: [new AddressValidator()]
		},
		
			area: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Area',
			question: 'What is the area?',
			hint:'(optional)',
			fieldName: CASE_NAME_IDS.AREA,
			url: 'area',
			validators: [
			new RequiredValidator('Enter the area'),
			new StringValidator({
				maxLength: {
					maxLength: 150,
					maxLengthMessage: `Area must be less than 150 characters`
				}
			})
		]
		},
			authority: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Authority',
			question: 'Who is the authority?',
			hint:'Enter the Local Planning Authority or Common Registration Authority (optional)',
			fieldName: CASE_NAME_IDS.AUTHORITY,
			url: 'authority',
			validators: [
			new RequiredValidator('Enter the authority'),
			new StringValidator({
				maxLength: {
					maxLength: 150,
					maxLengthMessage: `Authority must be less than 150 characters`
				}
			})
		]
		},
					caseOfficer: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Case Officer',
			question: 'Who is the assigned case officer?',
			fieldName: CASE_NAME_IDS.CASE_OFFICER,
			url: 'case-officer',
			validators: [
			new RequiredValidator('Enter the authority'),
			new StringValidator({
				maxLength: {
					maxLength: 150,
					maxLengthMessage: `Authority must be less than 150 characters`
				}
			})
		]
		},
		
			procedure: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Procedure',
			question: 'Which procedure will be used?',
			fieldName: 'procedure',
			url: 'procedure',
			options: PROCEDURE_TYPES.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator(SUB_TYPE_ERROR)]
		},
							
	};

	return createQuestions(questions, questionClasses, {});
}
