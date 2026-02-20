import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import DefinedColumnsTableQuestion, { type TableColumn } from './question.ts';
import DateQuestion from '@planning-inspectorate/dynamic-forms/src/components/date/question.js';
import type { QuestionViewModel } from '../types.js';
import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import type { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';

describe('DefinedColumnsTableQuestion', () => {
	let question: DefinedColumnsTableQuestion;
	let mockViewModel: QuestionViewModel;

	beforeEach(() => {
		question = new DefinedColumnsTableQuestion({
			title: 'Defined Table',
			fieldName: 'definedTable',
			question: 'What details?',
			columns: [
				{ header: 'Reference', fieldName: 'caseRef' },
				{
					header: 'Officer Name',
					fieldName: 'officer',
					format: (val: string) => `Formatted: ${val}`
				},
				{ header: 'Decision Date', fieldName: 'date', sortType: 'date' }
			]
		});

		question.section = {
			questions: [
				{
					fieldName: 'caseRef',
					formatAnswerForSummary: (section: Section, journey: JourneyResponse, val: string) => [{ value: val }]
				},
				{
					fieldName: 'officer',
					formatAnswerForSummary: (section: Section, journey: JourneyResponse, val: string) => [{ value: val }]
				},
				{
					fieldName: 'date',
					formatAnswerForSummary: (section: Section, journey: JourneyResponse, val: string) => [{ value: val }]
				}
			]
		};

		mockViewModel = {
			question: {
				value: [{ id: '1', caseRef: 'ABC', officer: 'John', date: '2024-01-01' }],
				firstQuestionUrl: 'ref-page'
			},
			originalUrl: '/my-url/',
			util: {
				trimTrailingSlash: (url: string) => url.replace(/\/$/, '')
			}
		} as unknown as QuestionViewModel;
	});

	describe('createHeaders()', () => {
		it('should generate headers based on explicit columns plus Actions', () => {
			const headers = question.createHeaders();

			assert.strictEqual(headers.length, 4);
			assert.strictEqual(headers[0].text, 'Reference');
			assert.strictEqual(headers[1].text, 'Officer Name');
			assert.strictEqual(headers[2].text, 'Decision Date');
			assert.strictEqual(headers[3].text, 'Actions');
		});
	});

	describe('createRow()', () => {
		it('should use explicit format function when provided', () => {
			const item = { id: '1', officer: 'Oscar' };
			const rows = question.createRow(mockViewModel, item);

			assert.strictEqual(rows[1].html, 'Formatted: Oscar');
		});

		it('should use raw value if no formatter or linked question exists', () => {
			question.section = { questions: [] };
			const item = { id: '1', caseRef: 'REF-001' };
			const rows = question.createRow(mockViewModel, item);

			assert.strictEqual(rows[0].html, 'REF-001');
		});

		it('should return em-dash if linked question shouldDisplay returns false', () => {
			question.section!.questions[0].shouldDisplay = () => false;
			const item = { id: '1', caseRef: 'HIDDEN' };
			const rows = question.createRow(mockViewModel, item);

			assert.strictEqual(rows[0].html, '—');
		});

		it('should fallback to dash if value is missing', () => {
			const item = { id: '1' };
			const rows = question.createRow(mockViewModel, item);

			assert.strictEqual(rows[0].html, '-');
		});
	});

	describe('handleSorting()', () => {
		it('should return unix timestamp when column sortType is date', () => {
			const col = { header: 'Date', fieldName: 'date', sortType: 'date' };
			const result = question.handleSorting('', col as TableColumn, {} as Question, '2024-12-25');

			assert.strictEqual(result, new Date('2024-12-25').getTime());
		});

		it('should return unix timestamp if linked question is DateQuestion', () => {
			const col = { header: 'Date', fieldName: 'dob' };
			const dateQuestion = new DateQuestion({ fieldName: 'dob', title: 't', question: 'q' });

			const result = question.handleSorting('01/01/2024', col as TableColumn, dateQuestion as Question, '2024-01-01');

			assert.strictEqual(result, new Date('01/01/2024').getTime());
		});

		it('should return cell content as fallback', () => {
			const col = { header: 'Ref', fieldName: 'ref' };
			const result = question.handleSorting('ABC', col as TableColumn, {} as Question, 'ABC');

			assert.strictEqual(result, 'ABC');
		});
	});

	describe('formatItemAnswers()', () => {
		it('should generate summary list using column definitions', () => {
			const item = { caseRef: 'REF-123', officer: 'John' };
			const result = question.formatItemAnswers(item);

			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0].question, 'Reference');
			assert.strictEqual(result[0].answer, 'REF-123');
			assert.strictEqual(result[1].question, 'Officer Name');
			assert.strictEqual(result[1].answer, 'Formatted: John');
		});

		it('should return empty array if no columns are defined', () => {
			question.columns = [];
			const result = question.formatItemAnswers({});
			assert.deepStrictEqual(result, []);
		});
	});
});
