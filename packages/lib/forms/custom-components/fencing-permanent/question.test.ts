import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import FencingPermanentQuestion from './question.ts';

let mockJourney: any;
let question: any;

const questionParams = {
	title: 'Fencing Check',
	question: 'Is the fencing permanent?',
	fieldName: 'fencing_permanent',
	options: [
		{
			text: 'Yes',
			value: 'yes',
			conditional: {
				question: 'Details',
				fieldName: 'fencing_details_db',
				type: 'textarea'
			}
		},
		{
			text: 'No',
			value: 'no'
		}
	]
};

describe('Fencing Permanent Question', () => {
	beforeEach(() => {
		mockJourney = {
			response: {
				answers: {}
			}
		};

		question = new FencingPermanentQuestion(questionParams as any);

		question.getAction = () => ({ href: '#', text: 'Change' });
	});

	describe('formatAnswerForSummary', () => {
		it('should return "-" if no answer is provided', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, null);

			assert.strictEqual(result[0].value, '-');
			assert.strictEqual(result[0].key, 'Fencing Check');
		});

		it('should return the Option Text (e.g., "No") for non-conditional answers', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'no');

			assert.strictEqual(result[0].value, 'No');
		});

		it('should return Option Text (e.g., "Yes") if conditional is selected but NO text is provided', () => {
			mockJourney.response.answers = {
				fencing_details_db: null
			};

			const result = question.formatAnswerForSummary('segment', mockJourney, 'yes');

			assert.strictEqual(result[0].value, 'Yes');
		});

		it('should return "Free text added" if conditional is selected AND text is provided', () => {
			mockJourney.response.answers = {
				fencing_details_db: 'The fence is made of wood.'
			};

			const result = question.formatAnswerForSummary('segment', mockJourney, 'yes');

			assert.strictEqual(result[0].value, 'Free text added');
		});

		it('should handle unknown answers gracefully by returning "-"', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'unknown_value');

			assert.strictEqual(result[0].value, '-');
		});
	});
});
