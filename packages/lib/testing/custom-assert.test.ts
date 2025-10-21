import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertRenders404Page } from '@pins/peas-row-commons-lib/testing/custom-asserts.ts';
import { notFoundHandler } from '../middleware/errors.ts';

describe('custom-assert', () => {
	describe('assertRenders404Page', () => {
		const mockReq = { params: { id: 'case-1' }, baseUrl: 'case-1', session: {} };
		it('should throw if the function is a middleware and does not render a 404 page', async () => {
			const functionToTest = async () => {
				throw new Error('error');
			};
			await assert.rejects(() => assertRenders404Page(functionToTest, mockReq, true), {
				message: 'Got unwanted rejection.\nActual message: "error"'
			});
		});
		it('should throw if the function is not a middleware and does not render a 404 page', async () => {
			const functionToTest = async () => {
				throw new Error('error');
			};
			await assert.rejects(() => assertRenders404Page(functionToTest, mockReq, false), {
				message: 'Got unwanted rejection.\nActual message: "error"'
			});
		});
		it('should succeed when it renders a 404 page', async () => {
			const functionToTest = async (req, res) => {
				return notFoundHandler(req, res);
			};
			await assert.doesNotReject(() => assertRenders404Page(functionToTest, mockReq, false), {
				message: 'Got unwanted rejection.\nActual message: "error"'
			});
		});
	});
});
