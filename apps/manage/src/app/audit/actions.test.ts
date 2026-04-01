import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTemplate, AUDIT_ACTIONS } from './actions.ts';

describe('resolveTemplate', () => {
	it('should return template as-is when no metadata is provided', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.FILE_UPLOADED);
		assert.strictEqual(result, '{fileName} was uploaded to {folderName}');
	});

	it('should return template as-is when metadata is undefined', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.FOLDER_CREATED, undefined);
		assert.strictEqual(result, '{folderName} was created');
	});

	it('should replace a placeholder with a metadata value', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.CASE_CREATED, { reference: 'DRT/PER/00015' });
		assert.strictEqual(result, 'DRT/PER/00015 was created');
	});

	it('should replace multiple placeholders', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.FIELD_UPDATED, {
			fieldName: 'Act',
			oldValue: 'Section 1',
			newValue: 'Section 2'
		});
		assert.strictEqual(result, 'Act was updated from Section 1 to Section 2');
	});

	it('should leave placeholder as-is when metadata key is missing', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.CASE_CREATED, {});
		assert.strictEqual(result, '{reference} was created');
	});

	it('should leave placeholder as-is when metadata value is undefined', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.FIELD_UPDATED, { fieldName: undefined });
		assert.strictEqual(result, '{fieldName} was updated from {oldValue} to {newValue}');
	});

	it('should replace placeholder when metadata value is null', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.CASE_CREATED, { reference: null });
		assert.strictEqual(result, '{reference} was created');
	});

	it('should convert numeric metadata values to strings', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.FIELD_UPDATED, {
			fieldName: 42,
			oldValue: 'old',
			newValue: 'new'
		});
		assert.strictEqual(result, '42 was updated from old to new');
	});

	it('should handle templates with no placeholders and metadata provided', () => {
		const result = resolveTemplate(AUDIT_ACTIONS.CASE_NOTE_ADDED, { extra: 'ignored' });
		assert.strictEqual(result, 'Case note added:\n{caseNote}');
	});
});
