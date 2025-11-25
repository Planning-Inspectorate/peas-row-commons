import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import { CASEWORK_AREAS } from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';

export function getQuestions() {
	const questions = {
		caseworkArea: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Casework area',
			question: 'What area does this new case relate to?',
			fieldName: 'casework-area',
			url: 'casework-area',
			options: CASEWORK_AREAS.map((t) => ({ text: t.displayName, value: t.id })),
			validators: [new RequiredValidator('Select a casework')]
		}
	};

	return createQuestions(questions, questionClasses, {});
}
