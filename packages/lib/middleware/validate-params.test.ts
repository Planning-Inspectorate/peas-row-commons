import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildValidateParamFormat, validateIdFormat, validateNoteIdFormat } from './validate-params.ts';

describe('validate-params middleware', () => {
	const newMockRes = () => ({
		render: mock.fn(),
		status: mock.fn(() => ({ send: mock.fn() }))
	});

	describe('buildValidateParamFormat', () => {
		it('should call next() when param is a valid UUID', () => {
			const middleware = buildValidateParamFormat('testParam');
			const mockReq = { params: { testParam: '00000000-0000-0000-0000-000000000001' } };
			const mockRes = newMockRes();
			const next = mock.fn();

			middleware(mockReq as any, mockRes as any, next);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 0, 'Should not render 404');
		});

		it('should return 404 when param is an invalid UUID format', () => {
			const middleware = buildValidateParamFormat('testParam');
			const mockReq = { params: { testParam: 'invalid-uuid-format' } };
			const mockRes = newMockRes();
			const next = mock.fn();

			middleware(mockReq as any, mockRes as any, next);

			assert.strictEqual(next.mock.callCount(), 0, 'Should not call next()');
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderCall = mockRes.render.mock.calls[0];
			assert.strictEqual(renderCall.arguments[0], 'views/layouts/error', 'Should render 404 page');
		});

		it('should return 404 when param is missing', () => {
			const middleware = buildValidateParamFormat('testParam');
			const mockReq = { params: {} };
			const mockRes = newMockRes();
			const next = mock.fn();

			middleware(mockReq as any, mockRes as any, next);

			assert.strictEqual(next.mock.callCount(), 0, 'Should not call next()');
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
		});

		it('should return 404 when param is empty string', () => {
			const middleware = buildValidateParamFormat('testParam');
			const mockReq = { params: { testParam: '' } };
			const mockRes = newMockRes();
			const next = mock.fn();

			middleware(mockReq as any, mockRes as any, next);

			assert.strictEqual(next.mock.callCount(), 0, 'Should not call next()');
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
		});

		it('should work with different param names', () => {
			const middleware = buildValidateParamFormat('customParam');
			const mockReq = { params: { customParam: '11111111-1111-1111-1111-111111111111' } };
			const mockRes = newMockRes();
			const next = mock.fn();

			middleware(mockReq as any, mockRes as any, next);

			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('should handle case-insensitive UUIDs', () => {
			const middleware = buildValidateParamFormat('id');
			const mockReq = { params: { id: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE' } };
			const mockRes = newMockRes();
			const next = mock.fn();

			middleware(mockReq as any, mockRes as any, next);

			assert.strictEqual(next.mock.callCount(), 1);
		});
	});

	describe('validateIdFormat', () => {
		it('should call next() when id is a valid UUID', () => {
			const mockReq = { params: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' } };
			const mockRes = newMockRes();
			const next = mock.fn();

			validateIdFormat(mockReq as any, mockRes as any, next);

			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('should return 404 when id is invalid', () => {
			const mockReq = { params: { id: 'not-a-uuid' } };
			const mockRes = newMockRes();
			const next = mock.fn();

			validateIdFormat(mockReq as any, mockRes as any, next);

			assert.strictEqual(next.mock.callCount(), 0, 'Should not call next()');
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
		});

		it('should return 404 when id is missing', () => {
			const mockReq = { params: {} };
			const mockRes = newMockRes();
			const next = mock.fn();

			validateIdFormat(mockReq as any, mockRes as any, next);

			assert.strictEqual(next.mock.callCount(), 0, 'Should not call next()');
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
		});
	});

	describe('validateNoteIdFormat', () => {
		it('should call next() when noteId is a valid UUID', () => {
			const mockReq = { params: { noteId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' } };
			const mockRes = newMockRes();
			const next = mock.fn();

			validateNoteIdFormat(mockReq as any, mockRes as any, next);

			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('should return 404 when noteId is invalid', () => {
			const mockReq = { params: { noteId: 'not-a-uuid' } };
			const mockRes = newMockRes();
			const next = mock.fn();

			validateNoteIdFormat(mockReq as any, mockRes as any, next);

			assert.strictEqual(next.mock.callCount(), 0, 'Should not call next()');
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
		});

		it('should return 404 when noteId is missing', () => {
			const mockReq = { params: {} };
			const mockRes = newMockRes();
			const next = mock.fn();

			validateNoteIdFormat(mockReq as any, mockRes as any, next);

			assert.strictEqual(next.mock.callCount(), 0, 'Should not call next()');
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
		});
	});
});
