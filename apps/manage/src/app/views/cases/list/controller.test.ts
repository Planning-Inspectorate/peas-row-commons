import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildListCases, caseToViewModel } from './controller.ts';
import { configureNunjucks } from '../../../nunjucks.ts';
import { mockLogger } from '@pins/peas-row-commons-lib/testing/mock-logger.ts';

describe('Case Controller', () => {
	describe('caseToViewModel', () => {
		it('should format receivedDate and create a sortable timestamp', () => {
			const input = {
				id: '123',
				reference: 'ROW/001',
				receivedDate: new Date('2024-01-15T12:00:00.000Z'),
				Type: { displayName: 'Rights of Way' }
			};

			const result = caseToViewModel(input as any);

			assert.strictEqual(result.id, '123');
			assert.strictEqual(result.Type.displayName, 'Rights of Way');
			assert.strictEqual(result.receivedDate, '15 Jan 2024');
			assert.strictEqual(result.receivedDateSortable, input.receivedDate.getTime());
		});
	});

	describe('buildListCases', () => {
		it('should fetch cases, map them, and render the view', async () => {
			const nunjucks = configureNunjucks();

			const mockRes = {
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};

			const mockReq = {};

			const mockDb = {
				case: {
					// Added _args: any so TS knows this function accepts arguments
					findMany: mock.fn((_args: any) => [
						{
							id: '1',
							reference: 'A',
							receivedDate: new Date('2024-01-01'),
							Type: { displayName: 'Type A' }
						},
						{
							id: '2',
							reference: 'B',
							receivedDate: new Date('2024-02-01'),
							Type: { displayName: 'Type B' }
						}
					])
				}
			};

			const listCases = buildListCases({ db: mockDb, logger: mockLogger() } as any);

			await assert.doesNotReject(() => listCases(mockReq as any, mockRes as any));

			assert.strictEqual(mockDb.case.findMany.mock.callCount(), 1);

			const dbArgs = mockDb.case.findMany.mock.calls[0].arguments[0];

			assert.deepStrictEqual(dbArgs.orderBy, { receivedDate: 'desc' });
			assert.strictEqual(dbArgs.take, 1000);
			assert.deepStrictEqual(dbArgs.include, { Type: { select: { displayName: true } } });

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments;

			assert.strictEqual(renderArgs[0], 'views/cases/list/view.njk');
			assert.strictEqual(renderArgs[1].pageHeading, 'Case list');
			assert.strictEqual(renderArgs[1].cases.length, 2);
			assert.strictEqual(renderArgs[1].cases[0].receivedDate, '01 Jan 2024');
		});
	});
});
