import { DECISION_MAKER_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/decision-maker-type.ts';
import { OutcomeSectionBuilder } from '@pins/peas-row-commons-lib/util/dynamic-sections/outcomes-section/outcomes-section-builder.ts';
import {
	ManageListSection,
	whenQuestionHasAnswer,
	type JourneyResponse,
	type Question,
	type Section
} from '@planning-inspectorate/dynamic-forms';

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
	const outcomeBuilder = new OutcomeSectionBuilder(outcomeManageList);
	return outcomeBuilder.build(response);
}
