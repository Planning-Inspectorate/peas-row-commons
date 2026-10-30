import type { DefinedColumnsTableParams } from '../question.ts';
import DefinedColumnsTableQuestion from '../question.ts';

export interface OutcomesTableQuestionProps extends DefinedColumnsTableParams {
	type: 'outcomes-list';
}

/**
 * We want to show only the decision type as the item inside of the summary items.
 */
export default class OutcomesTableQuestion extends DefinedColumnsTableQuestion {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO HRP-705 simplify Outcomes journey using dynamic sections
	override formatItemAnswers(answer: Record<string, any>) {
		const decisionType = answer.DecisionType?.displayName ?? 'Unknown';

		return [
			{
				question: '',
				answer: decisionType
			}
		];
	}
}
