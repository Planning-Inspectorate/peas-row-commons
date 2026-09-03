import type { Request } from 'express';
import assert from 'node:assert';
import { mock } from 'node:test';
import type { AsyncRequestHandler } from '../util/async-handler.js';

export async function assertRenders404Page(
	functionToTest: AsyncRequestHandler,
	mockReq: Request,
	isMiddleWare: boolean
) {
	const mockRes = {
		locals: {},
		status: mock.fn(),
		render: mock.fn()
	};

	if (isMiddleWare) {
		const next = mock.fn();
		// @ts-expect-error - due to mock res
		await assert.doesNotReject(() => functionToTest(mockReq, mockRes, next));
		assert.strictEqual(next.mock.callCount(), 0);
	} else {
		// @ts-expect-error - due to mock res
		await assert.doesNotReject(() => functionToTest(mockReq, mockRes));
	}
	assert.strictEqual(mockRes.status.mock.callCount(), 1);
	assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
	assert.strictEqual(mockRes.render.mock.callCount(), 1);
}
