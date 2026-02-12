import { describe, it } from 'node:test';
import assert from 'node:assert';
import LinkedCasesListQuestion from './question.ts';
import type { TableManageListQuestionParameters } from '../types.ts';

describe('LinkedCasesListQuestion', () => {
	const mockParams = {
		title: 'Linked cases',
		question: 'Linked cases',
		fieldName: 'linkedCases',
		viewFolder: 'linked-cases'
	};

	describe('formatItemAnswers', () => {
		it('should append "(Lead)" to the reference if the case is marked as lead', () => {
			const question = new LinkedCasesListQuestion(mockParams as any);

			const answer = {
				linkedCaseReference: 'APP/123/A',
				linkedCaseIsLead: 'yes'
			};

			const result = (question as any).formatItemAnswers(answer);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].question, 'Case reference');
			assert.strictEqual(result[0].answer, 'APP/123/A (Lead)');
		});

		it('should return only the reference string if the case is NOT lead', () => {
			const question = new LinkedCasesListQuestion(mockParams as TableManageListQuestionParameters);

			const answer = {
				linkedCaseReference: 'APP/456/B',
				linkedCaseIsLead: 'no'
			};

			const result = (question as any).formatItemAnswers(answer);

			assert.strictEqual(result[0].answer, 'APP/456/B');
		});

		it('should handle missing lead status gracefully (defaults to not lead)', () => {
			const question = new LinkedCasesListQuestion(mockParams as TableManageListQuestionParameters);

			const answer = {
				linkedCaseReference: 'APP/789/C'
			};

			const result = (question as any).formatItemAnswers(answer);

			assert.strictEqual(result[0].answer, 'APP/789/C');
		});
	});
});
