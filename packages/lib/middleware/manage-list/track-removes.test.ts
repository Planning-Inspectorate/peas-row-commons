import type { NextFunction, Request, Response } from 'express';
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { resetRemovedListItems, trackRemovedItemId } from './track-removes.ts';

const MANAGE_LIST_ACTIONS = { REMOVE: 'remove' };

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
			session: {} as Request['session'],
			originalUrl: ''
		};

		mockRes = {
			redirect: ((url: string) => {
				redirectedUrl = url;
			}) as Response['redirect']
		};

		mockNext = () => {
			nextCalledTimes++;
		};
	});

	describe('trackRemovedItemId', () => {
		it('should initialize the array and track the ID when Remove is submitted', async () => {
			mockReq.params = {
				manageListAction: MANAGE_LIST_ACTIONS.REMOVE,
				manageListItemId: '123'
			};
			mockReq.body = { remove: 'remove' };

			await trackRemovedItemId(mockReq as Request, mockRes as Response, mockNext);

			assert.deepStrictEqual(mockReq.session?.removedListItems, ['123']);
			assert.strictEqual(nextCalledTimes, 1);
		});

		it('should append the ID to an existing array when Remove is submitted', async () => {
			mockReq.params = {
				manageListAction: MANAGE_LIST_ACTIONS.REMOVE,
				manageListItemId: '456'
			};
			mockReq.body = { remove: 'remove' };
			mockReq.session = {
				removedListItems: ['123']
			} as unknown as Request['session'];

			await trackRemovedItemId(mockReq as Request, mockRes as Response, mockNext);

			assert.deepStrictEqual(mockReq.session?.removedListItems, ['123', '456']);
			assert.strictEqual(nextCalledTimes, 1);
		});

		it('should not add a duplicate ID when Remove is submitted', async () => {
			mockReq.params = {
				manageListAction: MANAGE_LIST_ACTIONS.REMOVE,
				manageListItemId: '123'
			};
			mockReq.body = { remove: 'remove' };
			mockReq.session = {
				removedListItems: ['123']
			} as unknown as Request['session'];

			await trackRemovedItemId(mockReq as Request, mockRes as Response, mockNext);

			assert.deepStrictEqual(mockReq.session?.removedListItems, ['123']);
			assert.strictEqual(nextCalledTimes, 1);
		});

		for (const remove of ['cancel', undefined, 'invalid', 'yes', 'no']) {
			it(`should not initialize removal tracking for action ${String(remove)}`, async () => {
				mockReq.params = {
					manageListAction: MANAGE_LIST_ACTIONS.REMOVE,
					manageListItemId: '123'
				};
				mockReq.body = remove === undefined ? {} : { remove };

				await trackRemovedItemId(mockReq as Request, mockRes as Response, mockNext);

				assert.strictEqual(mockReq.session?.removedListItems, undefined);
				assert.strictEqual(nextCalledTimes, 1);
			});
		}

		it('should preserve previously tracked IDs when Cancel is submitted', async () => {
			mockReq.params = {
				manageListAction: MANAGE_LIST_ACTIONS.REMOVE,
				manageListItemId: '456'
			};
			mockReq.body = { remove: 'cancel' };
			mockReq.session = {
				removedListItems: ['123']
			} as unknown as Request['session'];

			await trackRemovedItemId(mockReq as Request, mockRes as Response, mockNext);

			assert.deepStrictEqual(mockReq.session?.removedListItems, ['123']);
			assert.strictEqual(nextCalledTimes, 1);
		});

		it('should not modify the session if the route action is not REMOVE', async () => {
			mockReq.params = {
				manageListAction: 'edit',
				manageListItemId: '123'
			};
			mockReq.body = { remove: 'remove' };

			await trackRemovedItemId(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(mockReq.session?.removedListItems, undefined);
			assert.strictEqual(nextCalledTimes, 1);
		});

		it('should not modify the session if manageListItemId is missing', async () => {
			mockReq.params = { manageListAction: MANAGE_LIST_ACTIONS.REMOVE };
			mockReq.body = { remove: 'remove' };

			await trackRemovedItemId(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(mockReq.session?.removedListItems, undefined);
			assert.strictEqual(nextCalledTimes, 1);
		});
	});

	describe('resetRemovedListItems', () => {
		it('should clear the removedListItems array in the session', () => {
			mockReq.session = {
				removedListItems: ['123', '456']
			} as unknown as Request['session'];

			resetRemovedListItems(mockReq as Request, mockRes as Response, mockNext);

			assert.deepStrictEqual(mockReq.session?.removedListItems, []);
			assert.strictEqual(nextCalledTimes, 1);
		});

		it('should call next() without error if the session is undefined', () => {
			mockReq.session = undefined;

			resetRemovedListItems(mockReq as Request, mockRes as Response, mockNext);

			assert.strictEqual(nextCalledTimes, 1);
		});
	});
});
