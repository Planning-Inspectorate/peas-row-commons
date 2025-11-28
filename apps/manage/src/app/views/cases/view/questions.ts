import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';

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
		}
	};

	const textOverrides = {
		notStartedText: '-',
		continueButtonText: 'Save',
		changeActionText: 'Edit',
		answerActionText: 'Edit'
	};

	return createQuestions(questions, questionClasses, {}, textOverrides);
}
