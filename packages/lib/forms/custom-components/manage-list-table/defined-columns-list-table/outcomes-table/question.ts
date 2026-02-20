import DefinedColumnsTableQuestion from '../question.ts';

/**
 * We want to show only the decision type as the item inside of the summary items.
 */
export default class OutcomesTableQuestion extends DefinedColumnsTableQuestion {
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
