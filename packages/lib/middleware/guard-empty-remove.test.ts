import { test, describe, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { guardEmptyRemove } from './guard-empty-remove.ts';

describe('guardEmptyRemove', () => {
	const mockJourney = (fieldName = 'act') => ({
		taskListUrl: '/cases/123/overview',
		getQuestionByParams: mock.fn(() => (fieldName ? { fieldName } : null))
	});

	const mockRes = (journey: any) => ({
		locals: { journey },
		redirect: mock.fn()
	});

	const mockReq = (body = {}, params = { id: '123', section: 'overview', question: 'act' }) => ({
		body,
		params,
		session: {}
	});

	describe('redirects when value is empty', () => {
		test('undefined value', () => {
			const journey = mockJourney();
			const res = mockRes(journey);
			const req = mockReq({});
			const next = mock.fn();

			guardEmptyRemove(req as any, res as any, next);

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/cases/123/overview');
			assert.strictEqual(next.mock.callCount(), 0);
		});

		test('null value', () => {
			const journey = mockJourney();
			const res = mockRes(journey);
			const req = mockReq({ act: null });
			const next = mock.fn();

			guardEmptyRemove(req as any, res as any, next);

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(next.mock.callCount(), 0);
		});

		test('empty string value', () => {
			const journey = mockJourney();
			const res = mockRes(journey);
			const req = mockReq({ act: '' });
			const next = mock.fn();

			guardEmptyRemove(req as any, res as any, next);

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(next.mock.callCount(), 0);
		});

		test('array of falsy values', () => {
			const journey = mockJourney();
			const res = mockRes(journey);
			const req = mockReq({ act: [undefined, null] });
			const next = mock.fn();

			guardEmptyRemove(req as any, res as any, next);

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(next.mock.callCount(), 0);
		});
	});

	describe('calls next when value is present', () => {
		test('string value', () => {
			const journey = mockJourney();
			const res = mockRes(journey);
			const req = mockReq({ act: 'some-act-id' });
			const next = mock.fn();

			guardEmptyRemove(req as any, res as any, next);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(res.redirect.mock.callCount(), 0);
		});

		test('array with valid values', () => {
			const journey = mockJourney();
			const res = mockRes(journey);
			const req = mockReq({ act: ['some-act-id'] });
			const next = mock.fn();

			guardEmptyRemove(req as any, res as any, next);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(res.redirect.mock.callCount(), 0);
		});
	});

	describe('redirects when question not found', () => {
		test('null question', () => {
			const journey = {
				taskListUrl: '/cases/123/overview',
				getQuestionByParams: mock.fn(() => null)
			};
			const res = mockRes(journey);
			const req = mockReq({});
			const next = mock.fn();

			guardEmptyRemove(req as any, res as any, next);

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(next.mock.callCount(), 0);
		});
	});
});
