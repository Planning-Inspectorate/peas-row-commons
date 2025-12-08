import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { getQuestions } from './questions.ts';

describe('case details journey', () => {
	it('should error if used with the wrong router structure', () => {
		const mockQuestions = { reference: {} };
		const mockRes = {};

		assert.throws(() => createJourney(mockQuestions, mockRes as any, { params: {}, baseUrl: '/some/path' } as any), {
			message: `not a valid request for the ${JOURNEY_ID} journey (no id param)`
		});

		assert.throws(
			() =>
				createJourney(mockQuestions, mockRes as any, { params: { id: 'id-1' }, baseUrl: '/some/other/path' } as any),
			{ message: `not a valid request for the ${JOURNEY_ID} journey (invalid baseUrl)` }
		);
	});

	it('should create a journey instance with correct structure and questions', () => {
		const mockReq = { params: { id: 'case-1' }, baseUrl: '/cases/case-1', session: {} };
		const mockRes = {};

		const questions = getQuestions();

		const journey: any = createJourney(questions, mockRes as any, mockReq as any);

		assert.strictEqual(journey.journeyId, JOURNEY_ID);

		assert.strictEqual(journey.journeyTitle, 'Case details');
		assert.strictEqual(journey.returnToListing, true);

		assert.strictEqual(journey.baseUrl, '/cases/case-1');

		const overviewSection = journey.sections[0];
		assert.strictEqual(overviewSection.segment, 'questions');

		assert.strictEqual(overviewSection.questions.length, 1);
		assert.strictEqual(overviewSection.questions[0].fieldName, 'reference');
	});
});
