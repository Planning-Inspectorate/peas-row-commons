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
});
