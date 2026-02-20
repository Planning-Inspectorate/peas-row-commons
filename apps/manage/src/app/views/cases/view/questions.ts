import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';

import {
	DATE_QUESTIONS,
	DOCUMENTS_QUESTIONS,
	COSTS_QUESTIONS,
	ABEYANCE_QUESTIONS,
	CASE_DETAILS_QUESTIONS,
	TEAM_QUESTIONS,
	createTeamQuestions,
	createOutcomeQuestions,
	OVERVIEW_QUESTIONS,
	OUTCOME_QUESTIONS,
	createProcedureQuestions,
	KEY_CONTACTS_QUESTIONS
} from './question-utils.ts';

import type { CaseOfficer, Inspector } from './types.ts';
import { CUSTOM_COMPONENT_CLASSES } from '@pins/peas-row-commons-lib/forms/custom-components/index.ts';

export function getQuestions(groupMembers: { caseOfficers: CaseOfficer[] }, inspectors: Inspector[]) {
	// We must generate team questions due to the varying nature of groupMembers
	const generatedTeamQuestions = createTeamQuestions(TEAM_QUESTIONS, groupMembers);
	const generateOutcomeQuestions = createOutcomeQuestions(OUTCOME_QUESTIONS, groupMembers, inspectors);

	const procedureOneQuestions = createProcedureQuestions('One');
	const procedureTwoQuestions = createProcedureQuestions('Two');
	const procedureThreeQuestions = createProcedureQuestions('Three');

	const questions = {
		...DATE_QUESTIONS,
		...DOCUMENTS_QUESTIONS,
		...COSTS_QUESTIONS,
		...ABEYANCE_QUESTIONS,
		...CASE_DETAILS_QUESTIONS,
		...generatedTeamQuestions,
		...OVERVIEW_QUESTIONS,
		...generateOutcomeQuestions,
		...procedureOneQuestions,
		...procedureTwoQuestions,
		...procedureThreeQuestions,
		...KEY_CONTACTS_QUESTIONS
	};

	const textOverrides = {
		notStartedText: '-',
		continueButtonText: 'Save',
		changeActionText: 'Change',
		answerActionText: 'Add'
	};

	const classes = {
		...questionClasses,
		...CUSTOM_COMPONENT_CLASSES
	};

	return createQuestions(questions, classes, {}, textOverrides);
}
