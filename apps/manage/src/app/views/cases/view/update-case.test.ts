import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildUpdateCase, mapCasePayload } from './update-case.ts';
import { mockLogger } from '@pins/peas-row-commons-lib/testing/mock-logger.ts';

const mockFindUnique = mock.fn();
const mockUpdate = mock.fn();

const mockTx = {
	case: {
		findUnique: mockFindUnique,
		update: mockUpdate
	}
};

const mockDbTransaction = mock.fn(async (callback) => {
	return callback(mockTx);
});

const mockDb = {
	$transaction: mockDbTransaction
};

const mockService = {
	db: mockDb as any,
	logger: mockLogger()
};

describe('Update Case Controller', () => {
	beforeEach(() => {
		// Reset mocks before each test
		mockFindUnique.mock.resetCalls();
		mockUpdate.mock.resetCalls();
		mockDbTransaction.mock.resetCalls();
		mockService.logger.info.mock.resetCalls();
	});

	describe('buildUpdateCase', () => {
		it('should throw error if id param is missing', async () => {
			const req = { params: {} };
			const handler = buildUpdateCase(mockService as any);

			await assert.rejects(() => handler({ req: req as any, res: {} as any, data: {} }));
		});

		it('should log and return early if there are no answers to save', async () => {
			const req = { params: { id: 'case-123' } };
			const data = { answers: {} };

			const handler = buildUpdateCase(mockService as any);
			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockService.logger.info.mock.callCount(), 2);
			assert.strictEqual(mockDbTransaction.mock.callCount(), 0);
		});

		it('should clear answers (set to null) if clearAnswer flag is true', async () => {
			const req = { params: { id: 'case-123' } };
			const data = { answers: { name: 'Keep Me' } };

			const handler = buildUpdateCase(mockService as any, true);

			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123' }) as any);

			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockUpdate.mock.callCount(), 1);
			const updateArgs = mockUpdate.mock.calls[0].arguments[0];

			assert.strictEqual(updateArgs.data.name, null);
		});

		it('should update valid case data correctly', async () => {
			const req = { params: { id: 'case-123' } };
			const data = { answers: { name: 'New Name' } };

			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123' }) as any);

			const handler = buildUpdateCase(mockService as any);
			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockDbTransaction.mock.callCount(), 1);
			assert.strictEqual(mockUpdate.mock.callCount(), 1);

			const updateArgs = mockUpdate.mock.calls[0].arguments[0];
			assert.strictEqual(updateArgs.where.id, 'case-123');
			assert.strictEqual(updateArgs.data.name, 'New Name');
			assert.ok(updateArgs.data.updatedDate instanceof Date, 'Should set updatedDate');
		});

		it('should throw "Case not found" if case does not exist', async () => {
			const req = { params: { id: 'missing-case' } };
			const data = { answers: { name: 'Val' } };

			mockFindUnique.mock.mockImplementationOnce(() => null as any);

			const handler = buildUpdateCase(mockService as any);

			await assert.rejects(() => handler({ req: req as any, res: {} as any, data }), { message: 'Case not found' });

			assert.strictEqual(mockUpdate.mock.callCount(), 0);
		});
	});

	describe('mapCasePayload (Transformation Logic)', () => {
		it('should keep main table fields at root level', () => {
			const input = { name: 'My Case', reference: 'REF001' };
			const result = mapCasePayload(input);

			assert.strictEqual(result.name, 'My Case');
			assert.strictEqual(result.reference, 'REF001');
			assert.strictEqual((result as any).Dates, undefined);
		});

		it('should nest Date fields into "Dates" upsert object', () => {
			const input = { startDate: '2025-01-01', expiryDate: '2025-12-31' };
			const result = mapCasePayload(input);

			const datesUpdate = (result as any).Dates;

			assert.ok(datesUpdate, 'Should have Dates property');
			assert.ok(datesUpdate.upsert, 'Should be an upsert');

			assert.strictEqual(datesUpdate.upsert.create.startDate, '2025-01-01');
			assert.strictEqual(datesUpdate.upsert.create.expiryDate, '2025-12-31');

			assert.strictEqual(datesUpdate.upsert.update.startDate, '2025-01-01');
		});

		it('should handle mixed main and nested fields', () => {
			const input = {
				name: 'Main Field',
				startDate: '2025-01-01'
			};
			const result = mapCasePayload(input);

			assert.strictEqual(result.name, 'Main Field');
			assert.strictEqual((result as any).Dates.upsert.create.startDate, '2025-01-01');
		});
	});
});
