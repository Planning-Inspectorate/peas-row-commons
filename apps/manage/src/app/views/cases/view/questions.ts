import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';

import { DATE_QUESTIONS, DOCUMENTS_QUESTIONS, COSTS_QUESTIONS, ABEYANCE_QUESTIONS } from './question-utils.ts';

export function getQuestions() {
	const questions = {
		reference: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: 'Case reference',
			question: 'not editable',
			fieldName: 'reference',
			url: '',
			validators: [],
			editable: false
		},
		...DATE_QUESTIONS,
		...DOCUMENTS_QUESTIONS,
		...COSTS_QUESTIONS,
		...ABEYANCE_QUESTIONS
	};

	const textOverrides = {
		notStartedText: '-',
		continueButtonText: 'Save',
		changeActionText: 'Change',
		answerActionText: 'Add'
	};

	return createQuestions(questions, questionClasses, {}, textOverrides);
}
