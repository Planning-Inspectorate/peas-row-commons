import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';

import {
	DATE_QUESTIONS,
	DOCUMENTS_QUESTIONS,
	COSTS_QUESTIONS,
	ABEYANCE_QUESTIONS,
	CASE_DETAILS_QUESTIONS
} from './question-utils.ts';

export function getQuestions() {
	const questions = {
		...DATE_QUESTIONS,
		...DOCUMENTS_QUESTIONS,
		...COSTS_QUESTIONS,
		...ABEYANCE_QUESTIONS,
		...CASE_DETAILS_QUESTIONS
	};

	const textOverrides = {
		notStartedText: '-',
		continueButtonText: 'Save',
		changeActionText: 'Change',
		answerActionText: 'Add'
	};

	return createQuestions(questions, questionClasses, {}, textOverrides);
}
