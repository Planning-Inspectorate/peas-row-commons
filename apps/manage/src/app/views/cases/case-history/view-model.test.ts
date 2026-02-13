import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCaseHistoryViewModel } from './view-model.ts';

describe('createCaseHistoryViewModel', () => {
	const createMockEvent = (overrides = {}) =>
		({
			id: 'evt-1',
			action: 'CASE_CREATED',
			userId: 'user-1',
			createdAt: '2026-02-11T14:31:00Z',
			metadata: { reference: 'REF-001' },
			userName: 'Jane Smith',
			...overrides
		}) as any;

	it('should map audit events to case history rows correctly', () => {
		const events = [
			createMockEvent({
				id: 'evt-1',
				action: 'CASE_CREATED',
				createdAt: '2026-02-11T14:31:00Z',
				userName: 'Jane Smith'
			}),
			createMockEvent({
				id: 'evt-2',
				action: 'FILE_UPLOADED',
				createdAt: '2026-01-05T09:05:00Z',
				metadata: null,
				userName: 'John Doe'
			})
		];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result.length, 2);

		assert.strictEqual(result[0].user, 'Jane Smith');
		assert.ok(result[0].date.includes('11'));
		assert.ok(result[0].date.includes('February'));
		assert.ok(result[0].date.includes('2026'));
		assert.ok(typeof result[0].time === 'string');
		assert.ok(typeof result[0].details === 'string');

		assert.strictEqual(result[1].user, 'John Doe');
		assert.ok(result[1].date.includes('5'));
		assert.ok(result[1].date.includes('January'));
		assert.ok(result[1].date.includes('2026'));
	});

	it('should format date as "day month year" (en-GB locale)', () => {
		const events = [createMockEvent({ createdAt: '2026-02-11T14:31:00Z' })];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result[0].date, '11 February 2026');
	});

	it('should format time in 12-hour lowercase format', () => {
		const events = [createMockEvent({ createdAt: '2026-02-11T14:31:00Z' })];

		const result = createCaseHistoryViewModel(events);

		// 14:31 UTC → in en-GB 12-hour format → "2:31 pm" (lowercase)
		assert.ok(result[0].time.includes('pm') || result[0].time.includes('am'));
		assert.strictEqual(result[0].time, result[0].time.toLowerCase());
	});

	it('should use userName from the event', () => {
		const events = [createMockEvent({ userName: 'Unknown User' })];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result[0].user, 'Unknown User');
	});

	it('should pass metadata to resolveTemplate for details', () => {
		const events = [
			createMockEvent({
				action: 'FIELD_UPDATED',
				metadata: { fieldName: 'Case status' }
			})
		];

		const result = createCaseHistoryViewModel(events);

		// The details string should be resolved from the template
		assert.ok(typeof result[0].details === 'string');
		assert.ok(result[0].details.length > 0);
	});

	it('should handle null metadata gracefully', () => {
		const events = [createMockEvent({ action: 'FILE_UPLOADED', metadata: null })];

		const result = createCaseHistoryViewModel(events);

		assert.ok(typeof result[0].details === 'string');
	});

	it('should return empty array if no events provided', () => {
		const result = createCaseHistoryViewModel([]);

		assert.deepStrictEqual(result, []);
	});

	it('should preserve event order in output', () => {
		const events = [
			createMockEvent({ userName: 'First' }),
			createMockEvent({ userName: 'Second' }),
			createMockEvent({ userName: 'Third' })
		];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result[0].user, 'First');
		assert.strictEqual(result[1].user, 'Second');
		assert.strictEqual(result[2].user, 'Third');
	});

	it('should return objects matching CaseHistoryRow interface', () => {
		const events = [createMockEvent()];

		const result = createCaseHistoryViewModel(events);

		assert.strictEqual(result.length, 1);
		assert.ok('date' in result[0]);
		assert.ok('time' in result[0]);
		assert.ok('details' in result[0]);
		assert.ok('user' in result[0]);
		assert.strictEqual(Object.keys(result[0]).length, 4);
	});
});
