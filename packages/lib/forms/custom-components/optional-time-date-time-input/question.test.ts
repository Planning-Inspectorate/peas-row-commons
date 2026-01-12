import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import OptionalTimeDateTimeInput from './question.ts';

let mockJourney: any;
let mockResponse: any; // New variable for the specific response object
let question: any;
let mockReq: any;
let mockSection: any;

const questionParams = {
	title: 'Event Date',
	question: 'When is the event?',
	fieldName: 'event_date',
	dateFormat: 'dd/MM/yyyy',
	timeFormat: 'HH:mm'
};

describe('Optional Time Date Time Input', () => {
	beforeEach(() => {
		mockResponse = {
			answers: {}
		};

		mockJourney = {
			response: mockResponse
		};

		mockReq = {
			body: {}
		};

		mockSection = {};

		// @ts-expect-error - due to class not having a constructor but using parent's.
		question = new OptionalTimeDateTimeInput(questionParams);

		question.getAction = () => ({ href: '#', text: 'Change' });
	});

	describe('safeConvertTo24Hour', () => {
		it('should convert 12am to 0', () => {
			const result = question.safeConvertTo24Hour(12, 'am');
			assert.strictEqual(result, 0);
		});

		it('should convert 12pm to 12', () => {
			const result = question.safeConvertTo24Hour(12, 'pm');
			assert.strictEqual(result, 12);
		});

		it('should convert 1pm to 13', () => {
			const result = question.safeConvertTo24Hour(1, 'pm');
			assert.strictEqual(result, 13);
		});
	});

	describe('getDataToSave', () => {
		it('should save correctly with AM time', async () => {
			mockReq.body = {
				event_date_day: '10',
				event_date_month: '12',
				event_date_year: '2023',
				event_date_hour: '10',
				event_date_minutes: '30',
				event_date_period: 'am'
			};

			const result = await question.getDataToSave(mockReq, mockResponse);

			const savedDate = new Date(result.answers.event_date as string);
			assert.strictEqual(savedDate.getUTCHours(), 10);
			assert.strictEqual(savedDate.getUTCMinutes(), 30);

			assert.strictEqual(mockResponse.answers.event_date, result.answers.event_date);
		});

		it('should save correctly with PM time', async () => {
			mockReq.body = {
				event_date_day: '10',
				event_date_month: '12',
				event_date_year: '2023',
				event_date_hour: '2',
				event_date_minutes: '15',
				event_date_period: 'pm'
			};

			const result = await question.getDataToSave(mockReq, mockResponse);

			const savedDate = new Date(result.answers.event_date as string);
			assert.strictEqual(savedDate.getUTCHours(), 14);
		});
	});

	describe('formatAnswerForSummary', () => {
		it('should return date only if time is midnight', () => {
			const midnightDate = new Date('2023-12-25T00:00:00.000Z');
			const dateStr = midnightDate.toISOString();

			const result = question.formatAnswerForSummary('segment', mockJourney, dateStr);

			assert.ok(result[0].value.includes('25/12/2023'));
			assert.ok(!result[0].value.includes('00:00'));
		});

		it('should return date and time if time is not midnight', () => {
			const noonDate = new Date('2023-12-25T12:00:00.000Z');
			const dateStr = noonDate.toISOString();

			const result = question.formatAnswerForSummary('segment', mockJourney, dateStr);

			assert.ok(result[0].value.includes('25/12/2023'));
			assert.ok(result[0].value.includes('12:00'));
		});
	});

	describe('prepQuestionForRendering', () => {
		let parentProto: any;
		let originalParentPrep: any;

		beforeEach(() => {
			parentProto = Object.getPrototypeOf(OptionalTimeDateTimeInput.prototype);
			originalParentPrep = parentProto.prepQuestionForRendering;
		});

		afterEach(() => {
			parentProto.prepQuestionForRendering = originalParentPrep;
		});

		it('should return view model immediately if payload exists', () => {
			const payload = { test: 'data' };
			parentProto.prepQuestionForRendering = () => ({ question: { value: {} } });

			const result = question.prepQuestionForRendering(mockSection, mockJourney, {}, payload);
			assert.deepStrictEqual(result.question.value, {});
		});

		it('should clear time fields if saved answer is midnight', () => {
			const midnightDate = new Date('2023-01-01T00:00:00.000Z');

			mockJourney.response.answers['event_date'] = midnightDate;

			const mockViewModel = {
				question: {
					value: {
						event_date_hour: '00',
						event_date_minutes: '00',
						event_date_period: 'am'
					}
				}
			};

			parentProto.prepQuestionForRendering = () => mockViewModel;

			const result = question.prepQuestionForRendering(mockSection, mockJourney, {});

			assert.strictEqual(result.question.value.event_date_hour, '');
			assert.strictEqual(result.question.value.event_date_minutes, '');
		});

		it('should not clear time fields if saved answer is not midnight', () => {
			const otherDate = new Date('2023-01-01T10:00:00.000Z');
			mockJourney.response.answers['event_date'] = otherDate;

			const mockViewModel = {
				question: {
					value: {
						event_date_hour: '10',
						event_date_minutes: '00',
						event_date_period: 'am'
					}
				}
			};

			parentProto.prepQuestionForRendering = () => mockViewModel;

			const result = question.prepQuestionForRendering(mockSection, mockJourney, {});

			assert.strictEqual(result.question.value.event_date_hour, '10');
		});
	});
});
