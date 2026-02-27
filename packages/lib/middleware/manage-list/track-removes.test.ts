import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { bounceRemoveCancellation, trackRemovedItemId, resetRemovedListItems } from './track-removes.ts';
import type { Request, Response, NextFunction } from 'express';

const MANAGE_LIST_ACTIONS = { REMOVE: 'remove' };
const BOOLEAN_OPTIONS = { YES: 'yes', NO: 'no' };

describe('Manage List Removal Middleware', () => {
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
			redirect: ((url: string) => {
				redirectedUrl = url;
			}) as unknown as Response['redirect']
		};

		mockNext = (() => {
			nextCalledTimes++;
		}) as unknown as NextFunction;
	});

	describe('bounceRemoveCancellation', () => {
		it('should redirect to the base URL and NOT call next() if user selected "no"', async () => {
			mockReq.params = { manageListAction: MANAGE_LIST_ACTIONS.REMOVE, manageListItemId: '123' };
			mockReq.body = { remove: BOOLEAN_OPTIONS.NO };
			mockReq.originalUrl = '/overview/check-linked-cases/remove/123/confirm';

			await bounceRemoveCancellation(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(redirectedUrl, '/overview/check-linked-cases');
			assert.strictEqual(nextCalledTimes, 0);
		});

		it('should call next() and do nothing if user selected "yes"', async () => {
			mockReq.params = { manageListAction: MANAGE_LIST_ACTIONS.REMOVE, manageListItemId: '123' };
			mockReq.body = { remove: BOOLEAN_OPTIONS.YES };

			await bounceRemoveCancellation(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 1);
			assert.strictEqual(redirectedUrl, null);
		});

		it('should call next() and do nothing if action is not REMOVE', async () => {
			mockReq.params = { manageListAction: 'add', manageListItemId: '123' };
			mockReq.body = { remove: BOOLEAN_OPTIONS.NO };

			await bounceRemoveCancellation(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 1);
			assert.strictEqual(redirectedUrl, null);
		});

		it('should call next() and do nothing if manageListItemId is missing', async () => {
			mockReq.params = { manageListAction: MANAGE_LIST_ACTIONS.REMOVE };
			mockReq.body = { remove: BOOLEAN_OPTIONS.NO };

			await bounceRemoveCancellation(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 1);
			assert.strictEqual(redirectedUrl, null);
		});
	});

	describe('trackRemovedItemId', () => {
		it('should initialize the array, add the ID, and call next() if user selected "yes"', async () => {
			mockReq.params = { manageListAction: MANAGE_LIST_ACTIONS.REMOVE, manageListItemId: '123' };
			mockReq.body = { remove: BOOLEAN_OPTIONS.YES };

			await trackRemovedItemId(mockReq as Request, mockRes as Response, mockNext);

			assert.deepStrictEqual(mockReq.session?.removedListItems, ['123']);
			assert.strictEqual(nextCalledTimes, 1);
		});

		it('should append the ID to an existing array and call next() if user selected "yes"', async () => {
			mockReq.params = { manageListAction: MANAGE_LIST_ACTIONS.REMOVE, manageListItemId: '456' };
			mockReq.body = { remove: BOOLEAN_OPTIONS.YES };
			mockReq.session = { removedListItems: ['123'] } as unknown as Request['session'];

			await trackRemovedItemId(mockReq as Request, mockRes as Response, mockNext);

			assert.deepStrictEqual(mockReq.session?.removedListItems, ['123', '456']);
			assert.strictEqual(nextCalledTimes, 1);
		});

		it('should not add a duplicate ID to the array, but still call next() if user selected "yes"', async () => {
			mockReq.params = { manageListAction: MANAGE_LIST_ACTIONS.REMOVE, manageListItemId: '123' };
			mockReq.body = { remove: BOOLEAN_OPTIONS.YES };
			mockReq.session = { removedListItems: ['123'] } as unknown as Request['session'];

			await trackRemovedItemId(mockReq as Request, mockRes as Response, mockNext);

			assert.deepStrictEqual(mockReq.session?.removedListItems, ['123']);
			assert.strictEqual(nextCalledTimes, 1);
		});

		it('should call next() without modifying the session if user selected "no"', async () => {
			mockReq.params = { manageListAction: MANAGE_LIST_ACTIONS.REMOVE, manageListItemId: '123' };
			mockReq.body = { remove: BOOLEAN_OPTIONS.NO };

			await trackRemovedItemId(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(mockReq.session?.removedListItems, undefined);
			assert.strictEqual(nextCalledTimes, 1);
		});

		it('should call next() without modifying the session if action is not REMOVE', async () => {
			mockReq.params = { manageListAction: 'edit', manageListItemId: '123' };
			mockReq.body = { remove: BOOLEAN_OPTIONS.YES };

			await trackRemovedItemId(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(mockReq.session?.removedListItems, undefined);
			assert.strictEqual(nextCalledTimes, 1);
		});
	});

	describe('resetRemovedListItems', () => {
		it('should clear the removedListItems array in the session', () => {
			mockReq.session = { removedListItems: ['123', '456'] } as unknown as Request['session'];

			resetRemovedListItems(mockReq as Request, mockRes as Response, mockNext);

			assert.deepStrictEqual(mockReq.session?.removedListItems, []);
			assert.strictEqual(nextCalledTimes, 1);
		});

		it('should safely do nothing and call next if session is undefined', () => {
			mockReq.session = undefined;

			resetRemovedListItems(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 1);
		});
	});
});
