import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';

import { loadQuestionSpecificErrors, loadQuestionSpecificValidation } from './middleware.ts';

import { INSPECTOR_CONSTANTS } from '@pins/peas-row-commons-lib/constants/inspectors.ts';
import { MANAGE_LIST_ACTIONS } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-actions.js';

describe('Question Specific Loaders (Middleware Routing)', () => {
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let mockNext: NextFunction;

	let nextCalledTimes = 0;
	let redirectedUrl: string | null = null;

	beforeEach(() => {
		nextCalledTimes = 0;
		redirectedUrl = null;

		mockReq = {
			params: {},
			body: {},
			session: {} as unknown as Request['session'],
			originalUrl: ''
		};

		mockRes = {
			locals: {},
			redirect: ((url: string) => {
				redirectedUrl = url;
			}) as unknown as Response['redirect']
		};

		mockNext = (() => {
			nextCalledTimes++;
		}) as unknown as NextFunction;
	});

	describe('loadQuestionSpecificErrors', () => {
		it('should call next() and do nothing for unknown questions', () => {
			mockReq.params = { question: 'some-random-question' };

			loadQuestionSpecificErrors(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 1);
			assert.strictEqual(mockRes.locals?.errorSummary, undefined);
		});

		it('should execute checkForInspectorErrors if question is inspector-details', () => {
			mockReq.params = { question: INSPECTOR_CONSTANTS.INSPECTOR_URL, id: 'case-123' };

			mockReq.session = {
				inspectorDetails: {
					'case-123': {
						removalError: [{ text: 'Routed correctly!', href: '#remove' }]
					}
				}
			} as unknown as Request['session'];

			loadQuestionSpecificErrors(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 1);
			assert.deepStrictEqual(mockRes.locals?.errorSummary, [{ text: 'Routed correctly!', href: '#remove' }]);
		});
	});

	describe('loadQuestionSpecificValidation', () => {
		it('should call next() and do nothing for unknown questions', () => {
			mockReq.params = {
				question: 'some-random-question',
				manageListAction: MANAGE_LIST_ACTIONS.REMOVE
			};

			loadQuestionSpecificValidation(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 1);
			assert.strictEqual(redirectedUrl, null);
		});

		it('should execute validateInspectorRemoval if question is inspector-details', () => {
			mockReq.params = {
				question: INSPECTOR_CONSTANTS.INSPECTOR_URL,
				manageListAction: MANAGE_LIST_ACTIONS.REMOVE,
				manageListItemId: 'list-id-1',
				id: 'case-123'
			};
			mockReq.originalUrl = '/cases/case-123/team/inspector-details/remove/list-id-1';

			mockRes.locals = {
				journeyResponse: {
					answers: {
						inspectorDetails: [{ id: 'list-id-1', inspectorId: 'user-abc' }],
						procedureDetails: [{ inspectorId: 'user-abc' }],
						outcomeDetails: []
					}
				}
			};

			loadQuestionSpecificValidation(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 0);
			assert.strictEqual(redirectedUrl, '/cases/case-123/team/inspector-details');
		});
	});
});
