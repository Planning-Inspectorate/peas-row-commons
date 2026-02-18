import TableManageListQuestion from '../question.ts';

/**
 * Class for the Linked Cases question, identical to the TableManageListQuestion
 * but we want its summary to merge the data points for reference and lead into
 * one line.
 */
export default class LinkedCasesListQuestion extends TableManageListQuestion {
	protected override formatItemAnswers(answer: Record<string, unknown>) {
		const reference = answer.linkedCaseReference as string;
		const isLead = answer.linkedCaseIsLead === 'yes';

		const formattedValue = isLead ? `${reference} (Lead)` : reference;

		return [
			{
				question: 'Case reference',
				answer: formattedValue
			}
		];
	}
}
