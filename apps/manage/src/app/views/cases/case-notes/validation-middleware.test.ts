import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildValidateCaseNotesMiddleware } from './validation-middleware.ts';

describe('buildValidateCaseNotesMiddleware', () => {
	it('should throw an error if id param is missing', async () => {
		const req = {
			params: {},
			body: { comment: 'Valid comment' },
			session: {}
		};
		const res = {};
		const next = mock.fn();

		const middleware = buildValidateCaseNotesMiddleware();

		await assert.rejects(async () => await middleware(req as any, res as any, next), { message: 'id param required' });
	});

	it('should call next() when the comment is valid', async () => {
		const req = {
			params: { id: '123' },
			body: { comment: 'This is a valid comment' },
			baseUrl: '/case/123/case-note',
			session: {}
		};
		const res = {
			redirect: mock.fn()
		};
		const next = mock.fn();

		const middleware = buildValidateCaseNotesMiddleware();
		await middleware(req as any, res as any, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(res.redirect.mock.callCount(), 0);
	});

	it('should redirect and not call next() when comment is missing (empty string)', async () => {
		const req = {
			params: { id: '123' },
			body: { comment: '' },
			baseUrl: '/case/123/case-note',
			session: {}
		};
		const res = {
			redirect: mock.fn()
		};
		const next = mock.fn();

		const middleware = buildValidateCaseNotesMiddleware();
		await middleware(req as any, res as any, next);

		// Should not proceed to next middleware
		assert.strictEqual(next.mock.callCount(), 0);

		// Should redirect
		assert.strictEqual(res.redirect.mock.callCount(), 1);

		// Check redirect URL logic: removes /case-note
		const expectedUrl = '/case/123';
		assert.deepStrictEqual(res.redirect.mock.calls[0].arguments, [expectedUrl]);
	});

	it('should redirect when comment exceeds 500 characters', async () => {
		// Create a string with 501 characters
		const longComment = 'a'.repeat(501);

		const req = {
			params: { id: '123' },
			body: { comment: longComment },
			baseUrl: '/case/123/case-note',
			session: {}
		};
		const res = {
			redirect: mock.fn()
		};
		const next = mock.fn();

		const middleware = buildValidateCaseNotesMiddleware();
		await middleware(req as any, res as any, next);

		assert.strictEqual(next.mock.callCount(), 0);
		assert.strictEqual(res.redirect.mock.callCount(), 1);
	});

	it('should handle undefined comment as an error', async () => {
		const req = {
			params: { id: '123' },
			body: {}, // comment is undefined
			baseUrl: '/case/123/case-note',
			session: {}
		};
		const res = {
			redirect: mock.fn()
		};
		const next = mock.fn();

		const middleware = buildValidateCaseNotesMiddleware();
		await middleware(req as any, res as any, next);

		assert.strictEqual(res.redirect.mock.callCount(), 1);
	});
});
