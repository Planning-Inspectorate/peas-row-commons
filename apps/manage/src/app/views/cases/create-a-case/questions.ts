// @ts-expect-error - due to not having @types
import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
// @ts-expect-error - due to not having @types
import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
// @ts-expect-error - due to not having @types
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';
// @ts-expect-error - due to not having @types
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';

import { CASEWORK_AREAS } from '../../../../../../../packages/database/src/seed/static_data/casework-areas.ts';

export function getQuestions() {
	const questions = {
		documentType: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Select the document type',
			question: 'Select the document type',
			fieldName: 'documentType',
			url: 'document-type',
			options: CASEWORK_AREAS.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator()]
		},
		documentType1: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Select the document type 1',
			question: 'Select the document type 1',
			fieldName: 'documentType1',
			url: 'document-type-1',
			options: CASEWORK_AREAS.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator()]
		},
		documentType2: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Select the document type 2',
			question: 'Select the document type 2',
			fieldName: 'documentType2',
			url: 'document-type-2',
			options: CASEWORK_AREAS.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator()]
		}
	};

	return createQuestions(questions, questionClasses, {});
}
