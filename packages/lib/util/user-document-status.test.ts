import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { determineDefaultStatuses } from './user-document-status.ts';

describe('determineDefaultStatuses', () => {
	const closedStatuses = ['CLOSED', 'REJECTED', 'WITHDRAWN'];

	it('should return false for read and flagged by default (standard open case)', () => {
		const result = determineDefaultStatuses({
			legacyCaseId: null,
			statusId: 'OPEN',
			closedStatuses
		});

		assert.deepEqual(result, {
			defaultIsRead: false,
			defaultIsFlagged: false
		});
	});

	it('should return false for read if case is closed but NOT from Horizon', () => {
		const result = determineDefaultStatuses({
			legacyCaseId: '',
			statusId: 'CLOSED',
			closedStatuses
		});

		assert.deepEqual(result, {
			defaultIsRead: false,
			defaultIsFlagged: false
		});
	});

	it('should return false for read if case is from Horizon but NOT closed', () => {
		const result = determineDefaultStatuses({
			legacyCaseId: 'HORIZON-123',
			statusId: 'IN_PROGRESS',
			closedStatuses
		});

		assert.deepEqual(result, {
			defaultIsRead: false,
			defaultIsFlagged: false
		});
	});

	it('should return true for read if case is from Horizon AND is closed', () => {
		const result = determineDefaultStatuses({
			legacyCaseId: 'HORIZON-123',
			statusId: 'REJECTED',
			closedStatuses
		});

		assert.deepEqual(result, {
			defaultIsRead: true,
			defaultIsFlagged: false
		});
	});

	it('should handle undefined, null, and whitespace inputs safely', () => {
		const resultUndefined = determineDefaultStatuses({
			legacyCaseId: undefined,
			statusId: undefined,
			closedStatuses
		} as any); // Doing any here to force in undefined values

		const resultWhitespace = determineDefaultStatuses({
			legacyCaseId: '   ',
			statusId: 'CLOSED',
			closedStatuses
		});

		assert.strictEqual(resultUndefined.defaultIsRead, false);
		assert.strictEqual(resultWhitespace.defaultIsRead, false);
	});
});
