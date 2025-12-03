import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney } from './journey.ts';
import type { Handler, Request } from 'express';

import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { getQuestions } from './questions.ts';

describe('create-a-case journey', () => {
	it('should throw error when used with wrong router structure', () => {
		assert.throws(() => createJourney('create-a-case', {}, {} as Handler, { baseUrl: '/wrong' } as Request));
	});

	it('should create a journey with no Section title', () => {
		const questions = getQuestions();

		const mockReq = {
			baseUrl: '/cases/create-a-case'
		} as Request;

		const answers = {};
		const response = new JourneyResponse('create-a-case', 'session-1', answers);

		const journey = createJourney('create-a-case', questions, response as any, mockReq) as any;
		const section = journey.sections[0];

		// Dynamic Forms uses *undefined*, not null
		assert.strictEqual(section.title, undefined);

		// Questions added
		assert.strictEqual(section.questions.length, 21);

		assert.strictEqual(section.questions[0].fieldName, 'caseworkArea');
	});
});
