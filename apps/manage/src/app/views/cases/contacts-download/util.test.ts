import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hasAnyContacts } from './util.ts';

describe('hasAnyContacts', () => {
	it('should return false when all contact arrays are empty', () => {
		const answers = {
			objectorDetails: [],
			contactDetails: [],
			applicantDetails: []
		};

		assert.strictEqual(hasAnyContacts(answers), false);
	});

	it('should return false when contact fields are undefined', () => {
		const answers = {};

		assert.strictEqual(hasAnyContacts(answers), false);
	});

	it('should return false when contact fields are null', () => {
		const answers = {
			objectorDetails: null,
			contactDetails: null,
			applicantDetails: null
		};

		assert.strictEqual(hasAnyContacts(answers as Record<string, unknown>), false);
	});

	it('should return true when there is at least one objector', () => {
		const answers = {
			objectorDetails: [{ firstName: 'Test' }],
			contactDetails: [],
			applicantDetails: []
		};

		assert.strictEqual(hasAnyContacts(answers), true);
	});

	it('should return true when there is at least one contact', () => {
		const answers = {
			objectorDetails: [],
			contactDetails: [{ firstName: 'Test' }],
			applicantDetails: []
		};

		assert.strictEqual(hasAnyContacts(answers), true);
	});

	it('should return true when there is at least one applicant', () => {
		const answers = {
			objectorDetails: [],
			contactDetails: [],
			applicantDetails: [{ firstName: 'Test' }]
		};

		assert.strictEqual(hasAnyContacts(answers), true);
	});

	it('should return true when multiple contact types have entries', () => {
		const answers = {
			objectorDetails: [{ firstName: 'Obj' }],
			contactDetails: [{ firstName: 'Con' }],
			applicantDetails: [{ firstName: 'App' }]
		};

		assert.strictEqual(hasAnyContacts(answers), true);
	});

	it('should return true when only one type has entries and others are missing', () => {
		const answers = {
			objectorDetails: [{ firstName: 'Obj' }]
		};

		assert.strictEqual(hasAnyContacts(answers), true);
	});

	it('should return false when contact fields are not arrays', () => {
		const answers = {
			objectorDetails: 'not an array',
			contactDetails: 42,
			applicantDetails: {}
		};

		assert.strictEqual(hasAnyContacts(answers as Record<string, unknown>), false);
	});
});
