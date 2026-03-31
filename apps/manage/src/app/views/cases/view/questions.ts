import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';

import {
	DATE_QUESTIONS,
	DOCUMENTS_QUESTIONS,
	COSTS_QUESTIONS,
	CASE_DETAILS_QUESTIONS,
	TEAM_QUESTIONS,
	createTeamQuestions,
	createOutcomeQuestions,
	createProcedureDetailQuestions,
	OVERVIEW_QUESTIONS,
	OUTCOME_QUESTIONS,
	createOverviewQuestions,
	KEY_CONTACTS_QUESTIONS,
	PROCEDURE_QUESTIONS,
	PROCEDURE_MANAGE_LIST_QUESTION
} from './question-utils.ts';

import { CUSTOM_COMPONENT_CLASSES } from '@pins/peas-row-commons-lib/forms/custom-components/index.ts';
import { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { EntraGroupMembers } from '#util/entra-groups-types.ts';

export function getQuestions(
	groupMembers: EntraGroupMembers,
	allUsers: Prisma.UserGetPayload<{ select: { id: true; idpUserId: true; legacyId: true } }>[],
	answers: Record<string, unknown>
) {
	// We must generate team questions due to the varying nature of groupMembers
	const generatedTeamQuestions = createTeamQuestions(TEAM_QUESTIONS, groupMembers, allUsers);
	const generateOutcomeQuestions = createOutcomeQuestions(
		OUTCOME_QUESTIONS,
		groupMembers,
		answers.inspectorDetails as Record<string, unknown>[]
	);
	const generateOverviewQuestions = createOverviewQuestions(OVERVIEW_QUESTIONS, answers);
	const generatedProcedureQuestions = createProcedureDetailQuestions(
		PROCEDURE_QUESTIONS,
		groupMembers,
		answers.inspectorDetails as Record<string, unknown>[]
	);

	const questions = {
		// Static questions
		...DATE_QUESTIONS,
		...DOCUMENTS_QUESTIONS,
		...COSTS_QUESTIONS,
		...CASE_DETAILS_QUESTIONS,
		...KEY_CONTACTS_QUESTIONS,
		// Questions where we need to inject some
		// sort of dynamic data (e.g. from DB or entra)
		...generatedTeamQuestions,
		...generateOverviewQuestions,
		...generateOutcomeQuestions,
		...PROCEDURE_MANAGE_LIST_QUESTION,
		...generatedProcedureQuestions,
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
