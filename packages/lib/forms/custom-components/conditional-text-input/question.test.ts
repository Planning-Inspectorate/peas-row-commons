import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import ConditionalOptionsQuestion from './question.ts';

let mockJourney: any;
let mockSection: any;
let req: any;

const questionParams = {
	title: 'Test Question',
	question: 'Do you agree?',
	fieldName: 'my_radio_field',
	options: [
		{
			text: 'Yes',
			value: 'yes',
			conditional: {
				question: 'Give us more details',
				fieldName: 'yes_details_db_field',
				type: 'textarea'
			}
		},
		{
			text: 'No',
			value: 'no'
		},
		{
			text: 'Maybe',
			value: 'maybe',
			conditional: {
				question: 'Why maybe?',
				fieldName: 'maybe_reason_db_field',
				type: 'text'
			}
		}
	]
};

describe('Conditional Options Question', () => {
	beforeEach(() => {
		mockJourney = {
			response: {
				answers: {}
			},
			answers: {},
			getBackLink: () => ''
		};

		mockSection = {};

		req = {
			body: {}
		};
	});

	describe('Constructor', () => {
		it('should correctly map conditional fields in conditionalMapping', () => {
			const question = new ConditionalOptionsQuestion(questionParams as any);

			assert.deepStrictEqual(question.conditionalMapping, {
				yes: 'yes_details_db_field',
				maybe: 'maybe_reason_db_field'
			});
		});

		it('should construct the correct proxy field names in options', () => {
			const question = new ConditionalOptionsQuestion(questionParams as any);

			const yesOption: any = question.options.find((o) => o.value === 'yes');

			assert.strictEqual(yesOption.conditional.fieldName, 'yes_text');
			assert.strictEqual(yesOption.conditional.type, 'textarea');
		});
	});

	describe('getDataToSave', () => {
		it('should save main value, save conditional text, and wipe other conditionals', async () => {
			const question = new ConditionalOptionsQuestion(questionParams as any);

			req.body = {
				my_radio_field: 'yes',
				my_radio_field_yes_text: 'My detail text',
				my_radio_field_maybe_text: 'Should be ignored'
			};

			const result = await question.getDataToSave(req as any);

			assert.strictEqual(result.answers['my_radio_field'], 'yes');

			assert.strictEqual(result.answers['yes_details_db_field'], 'My detail text');

			assert.strictEqual(result.answers['maybe_reason_db_field'], null);
		});

		it('should wipe all conditional fields if an option with NO conditional is selected', async () => {
			const question = new ConditionalOptionsQuestion(questionParams as any);

			req.body = {
				my_radio_field: 'no',
				my_radio_field_yes_text: 'Leftover text'
			};

			const result = await question.getDataToSave(req as any);

			assert.strictEqual(result.answers['my_radio_field'], 'no');
			assert.strictEqual(result.answers['yes_details_db_field'], null);
			assert.strictEqual(result.answers['maybe_reason_db_field'], null);
		});

		it('should wipe previous conditional answer when switching options', async () => {
			const question = new ConditionalOptionsQuestion(questionParams as any);

			req.body = {
				my_radio_field: 'maybe',
				my_radio_field_maybe_text: 'Unsure reason',
				my_radio_field_yes_text: 'Old yes text'
			};

			const result = await question.getDataToSave(req as any);

			assert.strictEqual(result.answers['maybe_reason_db_field'], 'Unsure reason');

			assert.strictEqual(result.answers['yes_details_db_field'], null);
		});
	});

	describe('formatAnswer', () => {
		it('should return notStartedText for a falsy answer', () => {
			const question = new ConditionalOptionsQuestion(questionParams as any);
			assert.strictEqual(question.formatAnswer(null), question.notStartedText);
			assert.strictEqual(question.formatAnswer(''), question.notStartedText);
		});

		it('should return the escaped option text for a plain string answer with no conditional', () => {
			const question = new ConditionalOptionsQuestion(questionParams as any);
			assert.strictEqual(question.formatAnswer('no'), 'No');
		});

		it('should join option text and conditional text with a <br> for a { value, conditional } answer', () => {
			const question = new ConditionalOptionsQuestion(questionParams as any);

			const result = question.formatAnswer({
				value: 'yes',
				conditional: { yes: 'Some detail text' }
			});

			assert.strictEqual(result, 'Yes<br>Some detail text');
		});

		it('should HTML-escape unsafe conditional text', () => {
			const question = new ConditionalOptionsQuestion(questionParams as any);

			const result = question.formatAnswer({
				value: 'yes',
				conditional: { yes: '<script>alert("x")</script>' }
			});

			assert.strictEqual(result, 'Yes<br>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
		});

		it('should not add a <br> if there is no conditional text for the selected value', () => {
			const question = new ConditionalOptionsQuestion(questionParams as any);

			const result = question.formatAnswer({ value: 'yes', conditional: {} });

			assert.strictEqual(result, 'Yes');
		});
	});

	describe('formatAnswerForSummary', () => {
		it('should render a plain answer with no conditional as just the option text', () => {
			const question = new ConditionalOptionsQuestion(questionParams as any);
			question.getAction = () => ({ href: '#', text: 'Change' });

			const result = question.formatAnswerForSummary('segment', mockJourney, 'no');

			assert.strictEqual(result[0].value, 'No');
		});

		it('should combine the option text and journey-stored conditional text with a <br>, not a raw newline', () => {
			const question = new ConditionalOptionsQuestion(questionParams as any);
			question.getAction = () => ({ href: '#', text: 'Change' });

			mockJourney.response.answers = {
				yes_details_db_field: 'My detail text'
			};

			const result = question.formatAnswerForSummary('segment', mockJourney, 'yes');

			assert.strictEqual(result[0].value, 'Yes<br>My detail text');
			assert.ok(!result[0].value.includes('\n'));
		});

		it('should ignore whitespace-only conditional text', () => {
			const question = new ConditionalOptionsQuestion(questionParams as any);
			question.getAction = () => ({ href: '#', text: 'Change' });

			mockJourney.response.answers = {
				yes_details_db_field: '   '
			};

			const result = question.formatAnswerForSummary('segment', mockJourney, 'yes');

			assert.strictEqual(result[0].value, 'Yes');
		});
	});
});
