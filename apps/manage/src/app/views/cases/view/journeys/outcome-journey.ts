import { ManageListSection } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-section.js';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import { whenQuestionHasAnswer } from '@planning-inspectorate/dynamic-forms';
import { DECISION_MAKER_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/decision-maker-type.ts';
import { OutcomeSectionBuilder } from '@pins/peas-row-commons-lib/util/dynamic-sections/outcomes-section/outcomes-section-builder.ts';

export function buildOutcomeManageList(questions: Record<string, Question>): ManageListSection {
	return (
		new ManageListSection()
			.addQuestion(questions.decisionType)
			.addQuestion(questions.decisionMakerType)

			/**
			 * Inspector gets its own question of currently selected inspectors on case
			 */
			.addQuestion(questions.decisionMakerInspector)
			.withCondition(whenQuestionHasAnswer(questions.decisionMakerType, DECISION_MAKER_TYPE_ID.INSPECTOR))

			/**
			 * Case officer likewise gets its own question of users in general.
			 */
			.addQuestion(questions.decisionMakerOfficer)
			.withCondition(whenQuestionHasAnswer(questions.decisionMakerType, DECISION_MAKER_TYPE_ID.OFFICER))

			.addQuestion(questions.outcome)
			.addQuestion(questions.outcomeDate)
			.addQuestion(questions.decisionReceivedDate)
	);
}

export function buildDynamicOutcomeSections(
	outcomeManageList: ManageListSection,
	response: JourneyResponse
): Section[] {
	const outcomeBuilder = new OutcomeSectionBuilder(outcomeManageList as Section);
	return outcomeBuilder.build(response);
}
