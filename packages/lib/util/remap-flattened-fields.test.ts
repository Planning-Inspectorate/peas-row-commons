import { describe, it } from 'node:test';
import assert from 'node:assert';
import { remapFlattenedFieldsToArray } from './remap-flattened-fields.ts';

describe('remapFlattenedFieldsToArray', () => {
	const pattern = /^procedureDetails_(\d+)_(.+)$/;

	it('should merge a single flattened field back into the correct array item', () => {
		const flatData: Record<string, unknown> = {
			procedureDetails_0_siteVisitDate: '2025-06-15'
		};
		const existing = [{ procedureTypeId: 'hearing', procedureStatusId: 'active' }];

		remapFlattenedFieldsToArray(flatData, existing, pattern, 'procedureDetails');

		const result = flatData.procedureDetails as Record<string, unknown>[];
		assert.ok(Array.isArray(result));
		assert.strictEqual(result[0].siteVisitDate, '2025-06-15');
		assert.strictEqual(result[0].procedureTypeId, 'hearing');
	});

	it('should merge fields into different array indices', () => {
		const flatData: Record<string, unknown> = {
			procedureDetails_0_hearingTargetDate: '2025-03-01',
			procedureDetails_1_inquiryTargetDate: '2025-04-01'
		};
		const existing = [{ procedureTypeId: 'hearing' }, { procedureTypeId: 'inquiry' }];

		remapFlattenedFieldsToArray(flatData, existing, pattern, 'procedureDetails');

		const result = flatData.procedureDetails as Record<string, unknown>[];
		assert.strictEqual(result.length, 2);
		assert.strictEqual(result[0].hearingTargetDate, '2025-03-01');
		assert.strictEqual(result[0].procedureTypeId, 'hearing');
		assert.strictEqual(result[1].inquiryTargetDate, '2025-04-01');
		assert.strictEqual(result[1].procedureTypeId, 'inquiry');
	});

	it('should remove flattened keys from flatData after merging', () => {
		const flatData: Record<string, unknown> = {
			procedureDetails_0_siteVisitDate: '2025-06-15',
			name: 'Keep Me'
		};
		const existing = [{ procedureTypeId: 'hearing' }];

		remapFlattenedFieldsToArray(flatData, existing, pattern, 'procedureDetails');

		assert.strictEqual(flatData['procedureDetails_0_siteVisitDate'], undefined);
		assert.strictEqual(flatData.name, 'Keep Me');
	});

	it('should do nothing when no flattened keys match the pattern', () => {
		const flatData: Record<string, unknown> = {
			name: 'Some Case',
			startDate: '2025-01-01'
		};
		const existing = [{ procedureTypeId: 'hearing' }];

		remapFlattenedFieldsToArray(flatData, existing, pattern, 'procedureDetails');

		assert.strictEqual(flatData.procedureDetails, undefined);
		assert.strictEqual(flatData.name, 'Some Case');
		assert.strictEqual(flatData.startDate, '2025-01-01');
	});

	it('should not create an entry if the index exceeds the existing array length', () => {
		const flatData: Record<string, unknown> = {
			procedureDetails_5_siteVisitDate: '2025-06-15'
		};
		const existing = [{ procedureTypeId: 'hearing' }];

		remapFlattenedFieldsToArray(flatData, existing, pattern, 'procedureDetails');

		const result = flatData.procedureDetails as Record<string, unknown>[];
		assert.ok(Array.isArray(result));
		assert.strictEqual(result.length, 1);
		assert.strictEqual(result[0].siteVisitDate, undefined);
	});

	it('should merge multiple fields for the same index', () => {
		const flatData: Record<string, unknown> = {
			procedureDetails_0_hearingTargetDate: '2025-03-01',
			procedureDetails_0_hearingFormatId: 'virtual'
		};
		const existing = [{ procedureTypeId: 'hearing', procedureStatusId: 'active' }];

		remapFlattenedFieldsToArray(flatData, existing, pattern, 'procedureDetails');

		const result = flatData.procedureDetails as Record<string, unknown>[];
		assert.strictEqual(result[0].hearingTargetDate, '2025-03-01');
		assert.strictEqual(result[0].hearingFormatId, 'virtual');
		assert.strictEqual(result[0].procedureTypeId, 'hearing');
		assert.strictEqual(result[0].procedureStatusId, 'active');
	});

	it('should override existing values when flattened field conflicts', () => {
		const flatData: Record<string, unknown> = {
			procedureDetails_0_procedureStatusId: 'completed'
		};
		const existing = [{ procedureTypeId: 'hearing', procedureStatusId: 'active' }];

		remapFlattenedFieldsToArray(flatData, existing, pattern, 'procedureDetails');

		const result = flatData.procedureDetails as Record<string, unknown>[];
		assert.strictEqual(result[0].procedureStatusId, 'completed');
	});

	it('should not mutate the original existing items array', () => {
		const flatData: Record<string, unknown> = {
			procedureDetails_0_siteVisitDate: '2025-06-15'
		};
		const existing = [{ procedureTypeId: 'hearing' }];
		const originalRef = existing[0];

		remapFlattenedFieldsToArray(flatData, existing, pattern, 'procedureDetails');

		assert.strictEqual(originalRef.procedureTypeId, 'hearing');
		assert.strictEqual((originalRef as any).siteVisitDate, undefined);
	});

	it('should handle an empty existing items array', () => {
		const flatData: Record<string, unknown> = {
			procedureDetails_0_siteVisitDate: '2025-06-15'
		};

		remapFlattenedFieldsToArray(flatData, [], pattern, 'procedureDetails');

		const result = flatData.procedureDetails as Record<string, unknown>[];
		assert.ok(Array.isArray(result));
		assert.strictEqual(result.length, 0);
	});
});
