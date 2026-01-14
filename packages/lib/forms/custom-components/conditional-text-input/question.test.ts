import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
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
});
