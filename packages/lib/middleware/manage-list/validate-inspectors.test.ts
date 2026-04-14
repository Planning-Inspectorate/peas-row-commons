import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';

import { validateInspectorRemoval, checkForInspectorErrors, buildRemovalErrorSummary } from './validate-inspectors.ts';

const MANAGE_LIST_ACTIONS = { REMOVE: 'remove' };
const INSPECTOR_CONSTANTS = { INSPECTOR_URL: 'inspector-details' };

describe('Inspector Removal Logic', () => {
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
			locals: {
				journeyResponse: {
					answers: {
						procedureDetails: [],
						outcomeDetails: [],
						inspectorDetails: []
					}
				}
			},
			redirect: ((url: string) => {
				redirectedUrl = url;
			}) as unknown as Response['redirect']
		};

		mockNext = (() => {
			nextCalledTimes++;
		}) as unknown as NextFunction;
	});

	describe('buildRemovalErrorSummary', () => {
		it('should return an empty array if no procedures or outcomes are assigned', () => {
			const result = buildRemovalErrorSummary([], []);
			assert.deepStrictEqual(result, []);
		});

		it('should generate correct errors for a single assigned procedure', () => {
			const procedures = [{ inspectorId: 'id1', procedureTypeId: 'type1', procedureStatusId: 'status1' }];
			const result = buildRemovalErrorSummary(procedures, []);

			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0].text, 'Inspector is assigned to Procedure (unknown status) so cannot be removed.');
			assert.strictEqual(
				result[1].text,
				'You must assign a different inspector to the procedure before you can remove them from the case.'
			);
		});

		it('should generate correct pluralized instructions for multiple outcomes', () => {
			const outcomes = [
				{ decisionMakerInspectorId: 'id1', decisionTypeId: 'dec1' },
				{ decisionMakerInspectorId: 'id1', decisionTypeId: 'dec2' }
			];
			const result = buildRemovalErrorSummary([], outcomes);

			assert.strictEqual(result.length, 3);
			assert.strictEqual(
				result[2].text,
				'You must assign a different inspector to the outcomes before you can remove them from the case.'
			);
		});

		it('should generate correct combined instructions if both procedures and outcomes exist', () => {
			const procedures = [{ inspectorId: 'id1' }];
			const outcomes = [{ decisionMakerInspectorId: 'id1' }];
			const result = buildRemovalErrorSummary(procedures, outcomes);

			assert.strictEqual(result.length, 3);
			assert.strictEqual(
				result[2].text,
				'You must assign a different inspector to the procedure(s) and outcome(s) before you can remove them from the case.'
			);
		});
	});

	describe('validateInspectorRemoval', () => {
		it('should bypass and call next() if action is not REMOVE', () => {
			mockReq.params = {
				manageListAction: 'edit',
				manageListItemId: '123',
				question: INSPECTOR_CONSTANTS.INSPECTOR_URL
			};

			validateInspectorRemoval(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 1);
			assert.strictEqual(redirectedUrl, null);
		});

		it('should bypass and call next() if inspector is not assigned to any procedures or outcomes', () => {
			mockReq.params = {
				manageListAction: MANAGE_LIST_ACTIONS.REMOVE,
				manageListItemId: 'list-id-1',
				question: INSPECTOR_CONSTANTS.INSPECTOR_URL
			};

			if (mockRes.locals?.journeyResponse?.answers) {
				mockRes.locals.journeyResponse.answers.inspectorDetails = [{ id: 'list-id-1', inspectorId: 'user-123' }];
			}

			validateInspectorRemoval(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 1);
			assert.strictEqual(redirectedUrl, null);
		});

		it('should bypass and call next() if the inspector user appears more than once (duplicate fallback)', () => {
			mockReq.params = {
				manageListAction: MANAGE_LIST_ACTIONS.REMOVE,
				manageListItemId: 'list-id-1',
				question: INSPECTOR_CONSTANTS.INSPECTOR_URL
			};

			if (mockRes.locals?.journeyResponse?.answers) {
				mockRes.locals.journeyResponse.answers.inspectorDetails = [
					{ id: 'list-id-1', inspectorId: 'user-123' },
					{ id: 'list-id-2', inspectorId: 'user-123' }
				];

				mockRes.locals.journeyResponse.answers.procedureDetails = [{ inspectorId: 'user-123' }];
			}

			validateInspectorRemoval(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 1);
			assert.strictEqual(redirectedUrl, null);
		});

		it('should redirect and setup session errors if inspector is assigned and is the only instance of that user', () => {
			mockReq.params = {
				manageListAction: MANAGE_LIST_ACTIONS.REMOVE,
				manageListItemId: 'list-id-1',
				question: INSPECTOR_CONSTANTS.INSPECTOR_URL,
				id: 'case-123'
			};
			mockReq.originalUrl = '/cases/case-123/team/inspector-details/remove/list-id-1';

			if (mockRes.locals?.journeyResponse?.answers) {
				mockRes.locals.journeyResponse.answers.inspectorDetails = [{ id: 'list-id-1', inspectorId: 'user-123' }];
				mockRes.locals.journeyResponse.answers.procedureDetails = [{ inspectorId: 'user-123' }];
			}

			validateInspectorRemoval(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 0);
			assert.strictEqual(redirectedUrl, '/cases/case-123/team/inspector-details');
		});
	});

	describe('checkForInspectorErrors', () => {
		it('should call next() and do nothing if question is not INSPECTOR_URL', () => {
			mockReq.params = { question: 'some-other-page' };

			checkForInspectorErrors(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 1);
			assert.strictEqual(mockRes.locals?.errorSummary, undefined);
		});

		it('should extract error from session and assign to res.locals if valid', () => {
			mockReq.params = { question: INSPECTOR_CONSTANTS.INSPECTOR_URL, id: 'case-123' };

			mockReq.session = {
				inspectorDetails: {
					'case-123': {
						removalError: [{ text: 'Error text', href: '#remove' }]
					}
				}
			} as unknown as Request['session'];

			checkForInspectorErrors(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 1);
			assert.deepStrictEqual(mockRes.locals?.errorSummary, [{ text: 'Error text', href: '#remove' }]);
		});

		it('should call next() and not assign errorSummary if no errors exist', () => {
			mockReq.params = { question: INSPECTOR_CONSTANTS.INSPECTOR_URL, id: 'case-123' };
			mockReq.session = {} as unknown as Request['session'];

			checkForInspectorErrors(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 1);
			assert.strictEqual(mockRes.locals?.errorSummary, undefined);
		});
	});
});
