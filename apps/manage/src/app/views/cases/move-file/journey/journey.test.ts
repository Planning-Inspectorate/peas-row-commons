import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney } from './journey.ts';
import type { Handler, Request } from 'express';

describe('move files journey', () => {
	it('should throw error when used with wrong router structure', () => {
		assert.throws(() => createJourney('move', {}, {} as Handler, { baseUrl: '/wrong' } as Request));
	});

	it('should create a journey with correct section and back link', () => {
		const mockQuestions = {
			moveFolder: { fieldName: 'destinationFolder' }
		};

		const mockReq = {
			baseUrl: '/cases/123/folder/456/move'
		} as Request;

		const mockResponse = { answers: {} };

		const journey = createJourney('move', mockQuestions, mockResponse as any, mockReq) as any;

		assert.strictEqual(journey.journeyId, 'move');
		assert.strictEqual(journey.journeyTitle, 'Move Files');

		assert.strictEqual(journey.initialBackLink, '/cases/123/folder/456');

		assert.strictEqual(journey.sections.length, 1);
		const section = journey.sections[0];

		assert.strictEqual(section.segment, 'folder');

		assert.strictEqual(section.questions.length, 1);
		assert.strictEqual(section.questions[0].fieldName, 'destinationFolder');
	});
});
