import { describe, it } from 'node:test';
import assert from 'node:assert';
import { caseToViewModel } from './view-model.ts';

describe('view-model', () => {
	describe('caseToViewModel', () => {
		it('should flatten nested Dates and Costs objects into the root', () => {
			const input = {
				id: '123',
				receivedDate: new Date(),
				Dates: { targetDate: '2024-12-25' },
				Costs: { estimate: 500 }
			};

			const result: any = caseToViewModel(input as any);

			assert.strictEqual(result.targetDate, '2024-12-25');
			assert.strictEqual(result.estimate, 500);

			assert.strictEqual((result as any).Dates, undefined);
		});

		it('should NOT overwrite the main ID with nested IDs from Dates or Costs', () => {
			const input = {
				id: 'MAIN_ID',
				receivedDate: new Date(),
				Dates: { id: 'BAD_DATE_ID', targetDate: '2024-01-01' },
				Costs: { id: 'BAD_COST_ID', estimate: 100 }
			};

			const result: any = caseToViewModel(input as any);

			assert.strictEqual(result.id, 'MAIN_ID');
			assert.strictEqual(result.targetDate, '2024-01-01');
		});

		it('should convert boolean values to "Yes"/"No" strings', () => {
			const input = {
				id: '123',
				receivedDate: new Date(),
				isUrgent: true,
				isClosed: false,
				status: 'INTERIM'
			};

			const result: any = caseToViewModel(input as any);

			assert.strictEqual(result.isUrgent, 'yes');
			assert.strictEqual(result.isClosed, 'no');
			assert.strictEqual(result.status, 'INTERIM');
		});

		it('should format receivedDate and create a sortable timestamp', () => {
			const input = {
				id: '123',
				reference: 'ROW/001',
				receivedDate: new Date('2024-01-15T12:00:00.000Z'),
				Type: { displayName: 'Rights of Way' }
			};

			const result: any = caseToViewModel(input as any);

			assert.strictEqual(result.reference, 'ROW/001');

			assert.strictEqual(result.receivedDateDisplay, '15 Jan 2024');
			assert.strictEqual(result.receivedDateSortable, input.receivedDate.getTime());
		});
	});
});
