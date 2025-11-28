import { describe, it } from 'node:test';
import assert from 'node:assert';
import { caseToViewModel } from './view-model.ts';

describe('view-model', () => {
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
});
