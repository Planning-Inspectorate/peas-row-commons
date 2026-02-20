import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildAuditService } from './service.ts';
import type { AuditEntry } from './types.ts';
import { mockLogger } from '@pins/peas-row-commons-lib/testing/mock-logger.ts';

describe('Audit Service', () => {
	const createMockDb = () => ({
		caseHistory: {
			create: mock.fn() as any,
			findMany: mock.fn() as any,
			findFirst: mock.fn() as any,
			count: mock.fn() as any
		}
	});

	describe('record', () => {
		it('should create an audit event with correct data', async () => {
			const mockDb = createMockDb();
			mockDb.caseHistory.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'event-1' }));

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			const entry: AuditEntry = {
				caseId: 'case-123',
				action: 'CASE_CREATED',
				userId: 'user-456',
				metadata: { caseName: 'Test Case' }
			};

			await service.record(entry);

			const createCall = mockDb.caseHistory.create.mock.calls[0];
			const data = createCall.arguments[0].data;

			assert.deepStrictEqual(data.Case, { connect: { id: 'case-123' } });
			assert.strictEqual(data.action, 'CASE_CREATED');
			assert.deepStrictEqual(data.User, {
				connectOrCreate: {
					where: { idpUserId: 'user-456' },
					create: { idpUserId: 'user-456' }
				}
			});
			assert.strictEqual(data.metadata, JSON.stringify({ caseName: 'Test Case' }));
		});

		it('should handle metadata being undefined', async () => {
			const mockDb = createMockDb();
			mockDb.caseHistory.create.mock.mockImplementationOnce(() => Promise.resolve({ id: 'event-1' }));

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			await service.record({
				caseId: 'case-123',
				action: 'CASE_CREATED',
				userId: 'user-456'
			});

			const createCall = mockDb.caseHistory.create.mock.calls[0];
			assert.strictEqual(createCall.arguments[0].data.metadata, '{}');
		});

		it('should log error but not throw when database fails', async () => {
			const mockDb = createMockDb();
			const dbError = new Error('Database connection failed');
			mockDb.caseHistory.create.mock.mockImplementationOnce(() => Promise.reject(dbError));

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			// Should not throw
			await assert.doesNotReject(() =>
				service.record({
					caseId: 'case-123',
					action: 'CASE_CREATED',
					userId: 'user-456'
				})
			);

			assert.strictEqual(logger.error.mock.callCount(), 1);
			const errorCall = logger.error.mock.calls[0];
			assert.strictEqual(errorCall.arguments[0].error, dbError);
			assert.strictEqual(errorCall.arguments[0].caseId, 'case-123');
			assert.strictEqual(errorCall.arguments[1], 'Failed to record audit event');
		});
	});

	describe('getAllForCase', () => {
		it('should retrieve and parse audit events', async () => {
			const mockDb = createMockDb();
			mockDb.caseHistory.findMany.mock.mockImplementationOnce(() =>
				Promise.resolve([
					{
						id: 'event-1',
						caseId: 'case-123',
						action: 'CASE_CREATED',
						metadata: '{"caseName":"Test"}',
						userId: 'user-1',
						userName: 'John Doe',
						createdAt: new Date('2025-01-01')
					},
					{
						id: 'event-2',
						caseId: 'case-123',
						action: 'CASE_UPDATED',
						metadata: null,
						userId: 'user-2',
						userName: 'Jane Doe',
						createdAt: new Date('2025-01-02')
					}
				])
			);

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			const events = await service.getAllForCase('case-123');

			assert.strictEqual(events.length, 2);
			assert.deepStrictEqual(events[0].metadata, { caseName: 'Test' });
			assert.strictEqual(events[1].metadata, null);
		});

		it('should use default pagination options', async () => {
			const mockDb = createMockDb();
			mockDb.caseHistory.findMany.mock.mockImplementationOnce(() => Promise.resolve([]));

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			await service.getAllForCase('case-123');

			const findManyCall = mockDb.caseHistory.findMany.mock.calls[0];
			assert.strictEqual(findManyCall.arguments[0].skip, 0);
			assert.strictEqual(findManyCall.arguments[0].take, 50);
		});

		it('should accept custom pagination options', async () => {
			const mockDb = createMockDb();
			mockDb.caseHistory.findMany.mock.mockImplementationOnce(() => Promise.resolve([]));

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			await service.getAllForCase('case-123', { skip: 10, take: 20 });

			const findManyCall = mockDb.caseHistory.findMany.mock.calls[0];
			assert.strictEqual(findManyCall.arguments[0].skip, 10);
			assert.strictEqual(findManyCall.arguments[0].take, 20);
		});

		it('should return empty array and log error on failure', async () => {
			const mockDb = createMockDb();
			const dbError = new Error('Query failed');
			mockDb.caseHistory.findMany.mock.mockImplementationOnce(() => Promise.reject(dbError));

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			const events = await service.getAllForCase('case-123');

			assert.deepStrictEqual(events, []);
			assert.strictEqual(logger.error.mock.callCount(), 1);
			const errorCall = logger.error.mock.calls[0];
			assert.strictEqual(errorCall.arguments[0].error, dbError);
			assert.strictEqual(errorCall.arguments[1], 'Failed to fetch audit events');
		});
	});

	describe('countForCase', () => {
		it('should return the count of audit events', async () => {
			const mockDb = createMockDb();
			mockDb.caseHistory.count.mock.mockImplementationOnce(() => Promise.resolve(42));

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			const count = await service.countForCase('case-123');

			assert.strictEqual(count, 42);
			assert.strictEqual(mockDb.caseHistory.count.mock.callCount(), 1);
		});

		it('should return 0 and log error on failure', async () => {
			const mockDb = createMockDb();
			const dbError = new Error('Count failed');
			mockDb.caseHistory.count.mock.mockImplementationOnce(() => Promise.reject(dbError));

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			const count = await service.countForCase('case-123');

			assert.strictEqual(count, 0);
			assert.strictEqual(logger.error.mock.callCount(), 1);
		});
	});

	describe('getLatestForCase', () => {
		it('should retrieve and parse the latest audit event', async () => {
			const mockDb = createMockDb();
			mockDb.caseHistory.findFirst.mock.mockImplementationOnce(() =>
				Promise.resolve({
					id: 'event-1',
					caseId: 'case-123',
					action: 'CASE_UPDATED',
					metadata: '{"field":"value"}',
					userId: 'user-1',
					userName: 'John Doe',
					createdAt: new Date('2025-01-15')
				})
			);

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			const event = await service.getLatestForCase('case-123');

			assert.strictEqual(event?.id, 'event-1');
			assert.deepStrictEqual(event?.metadata, { field: 'value' });
		});

		it('should return null if no events exist', async () => {
			const mockDb = createMockDb();
			mockDb.caseHistory.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			const event = await service.getLatestForCase('case-123');

			assert.strictEqual(event, null);
		});

		it('should handle null metadata', async () => {
			const mockDb = createMockDb();
			mockDb.caseHistory.findFirst.mock.mockImplementationOnce(() =>
				Promise.resolve({
					id: 'event-1',
					caseId: 'case-123',
					action: 'CASE_UPDATED',
					metadata: null,
					userId: 'user-1',
					userName: 'John Doe',
					createdAt: new Date('2025-01-15')
				})
			);

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			const event = await service.getLatestForCase('case-123');

			assert.strictEqual(event?.metadata, null);
		});

		it('should return null and log error on failure', async () => {
			const mockDb = createMockDb();
			const dbError = new Error('Query failed');
			mockDb.caseHistory.findFirst.mock.mockImplementationOnce(() => Promise.reject(dbError));

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			const event = await service.getLatestForCase('case-123');

			assert.strictEqual(event, null);
			assert.strictEqual(logger.error.mock.callCount(), 1);
		});
	});

	describe('getLastModifiedInfo', () => {
		it('should return formatted date and user display name', async () => {
			const mockDb = createMockDb();
			mockDb.caseHistory.findFirst.mock.mockImplementationOnce(() =>
				Promise.resolve({
					createdAt: new Date('2025-01-15T14:30:00Z'),
					userId: 'user-123'
				})
			);

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			const groupMembers = {
				caseOfficers: [
					{ id: 'user-123', displayName: 'John Smith' },
					{ id: 'user-456', displayName: 'Jane Doe' }
				]
			};

			const info = await service.getLastModifiedInfo('case-123', groupMembers);

			assert.strictEqual(info.date, '15 January 2025');
			assert.strictEqual(info.by, 'John Smith');
		});

		it('should return "Unknown" if user not found in group members', async () => {
			const mockDb = createMockDb();
			mockDb.caseHistory.findFirst.mock.mockImplementationOnce(() =>
				Promise.resolve({
					createdAt: new Date('2025-01-15T14:30:00Z'),
					userId: 'user-999'
				})
			);

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			const groupMembers = {
				caseOfficers: [{ id: 'user-123', displayName: 'John Smith' }]
			};

			const info = await service.getLastModifiedInfo('case-123', groupMembers);

			assert.strictEqual(info.by, 'Unknown');
		});

		it('should return null values if no events exist', async () => {
			const mockDb = createMockDb();
			mockDb.caseHistory.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			const groupMembers = { caseOfficers: [] };

			const info = await service.getLastModifiedInfo('case-123', groupMembers);

			assert.strictEqual(info.date, null);
			assert.strictEqual(info.by, null);
		});

		it('should return null values and log error on failure', async () => {
			const mockDb = createMockDb();
			const dbError = new Error('Query failed');
			mockDb.caseHistory.findFirst.mock.mockImplementationOnce(() => Promise.reject(dbError));

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			const groupMembers = { caseOfficers: [] };

			const info = await service.getLastModifiedInfo('case-123', groupMembers);

			assert.strictEqual(info.date, null);
			assert.strictEqual(info.by, null);
			assert.strictEqual(logger.error.mock.callCount(), 1);
		});

		it('should handle empty caseOfficers array', async () => {
			const mockDb = createMockDb();
			mockDb.caseHistory.findFirst.mock.mockImplementationOnce(() =>
				Promise.resolve({
					createdAt: new Date('2025-01-15T14:30:00Z'),
					userId: 'user-123'
				})
			);

			const logger = mockLogger();
			const service = buildAuditService(mockDb as any, logger as any);

			const groupMembers = { caseOfficers: [] };

			const info = await service.getLastModifiedInfo('case-123', groupMembers);

			assert.strictEqual(info.by, 'Unknown');
		});
	});
});
