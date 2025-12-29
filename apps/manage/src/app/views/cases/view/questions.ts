import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';

import {
	DATE_QUESTIONS,
	DOCUMENTS_QUESTIONS,
	COSTS_QUESTIONS,
	ABEYANCE_QUESTIONS,
	CASE_DETAILS_QUESTIONS,
	TEAM_QUESTIONS,
	createTeamQuestions
} from './question-utils.ts';

import type { CaseOfficer } from './types.ts';

export function getQuestions(groupMembers: { caseOfficers: CaseOfficer[] }) {
	// We must generate team questions due to the varying nature of groupMembers
	const generatedTeamQuestions = createTeamQuestions(TEAM_QUESTIONS, groupMembers);

	const questions = {
		...DATE_QUESTIONS,
		...DOCUMENTS_QUESTIONS,
		...COSTS_QUESTIONS,
		...ABEYANCE_QUESTIONS,
		...CASE_DETAILS_QUESTIONS,
		...generatedTeamQuestions
	};

	const textOverrides = {
		notStartedText: '-',
		continueButtonText: 'Save',
		changeActionText: 'Change',
		answerActionText: 'Add'
	};

	return createQuestions(questions, questionClasses, {}, textOverrides);
}
