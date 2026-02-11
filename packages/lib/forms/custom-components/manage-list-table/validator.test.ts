import { describe, it } from 'node:test';
import assert from 'node:assert';
import ManageListItemsCompleteValidator from './validator.ts';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import type ManageListQuestion from '@planning-inspectorate/dynamic-forms/src/components/manage-list/question.js';

describe('ManageListItemsCompleteValidator', () => {
	describe('validate()', () => {
		it('should pass if the manage list has no items (empty array)', async () => {
			const validator = new ManageListItemsCompleteValidator({
				childName: 'Enter a name'
			});

			const mockQuestion = {
				fieldName: 'myList',
				section: { questions: [] }
			} as unknown as ManageListQuestion;

			const mockJourneyResponse = {
				answers: { myList: [] }
			} as unknown as JourneyResponse;

			const validationChain = validator.validate(mockQuestion, mockJourneyResponse);
			const req = { body: {} };

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors.length, 0);
		});

		it('should pass if all required fields are present and valid', async () => {
			const validator = new ManageListItemsCompleteValidator({
				childName: 'Enter a name',
				childAge: 'Enter an age'
			});

			const mockQuestion = {
				fieldName: 'myList',
				section: {
					questions: [
						{ fieldName: 'childName', shouldDisplay: () => true },
						{ fieldName: 'childAge', shouldDisplay: () => true }
					]
				}
			} as unknown as ManageListQuestion;

			const mockJourneyResponse = {
				answers: {
					myList: [
						{ childName: 'John', childAge: 25 },
						{ childName: 'Jane', childAge: 30 }
					]
				}
			} as unknown as JourneyResponse;

			const validationChain = validator.validate(mockQuestion, mockJourneyResponse);
			const req = { body: {} };

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors.length, 0);
		});

		it('should fail and return the mapped error message if a required field is empty', async () => {
			const validator = new ManageListItemsCompleteValidator({
				childName: 'Please enter the child name'
			});

			const mockQuestion = {
				fieldName: 'myList',
				section: {
					questions: [{ fieldName: 'childName', shouldDisplay: () => true }]
				}
			} as unknown as ManageListQuestion;

			const mockJourneyResponse = {
				answers: {
					myList: [{ childName: 'John' }, { childName: '' }]
				}
			} as unknown as JourneyResponse;

			const validationChain = validator.validate(mockQuestion, mockJourneyResponse);
			const req = { body: {} };

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors.length, 1);
			assert.strictEqual(result.context.errors[0].msg, 'Please enter the child name');
		});

		it('should pass if a field is missing BUT shouldDisplay returns false (conditionally hidden)', async () => {
			const validator = new ManageListItemsCompleteValidator({
				childName: 'Please enter the child name'
			});

			const mockQuestion = {
				fieldName: 'myList',
				section: {
					questions: [{ fieldName: 'childName', shouldDisplay: () => false }]
				}
			} as unknown as ManageListQuestion;

			const mockJourneyResponse = {
				answers: {
					myList: [{}]
				}
			} as unknown as JourneyResponse;

			const validationChain = validator.validate(mockQuestion, mockJourneyResponse);
			const req = { body: {} };

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors.length, 0);
		});

		it('should aggregate and deduplicate multiple errors across rows and fields', async () => {
			const validator = new ManageListItemsCompleteValidator({
				childName: 'Name is required',
				childAge: 'Age is required'
			});

			const mockQuestion = {
				fieldName: 'myList',
				section: {
					questions: [
						{ fieldName: 'childName', shouldDisplay: () => true },
						{ fieldName: 'childAge', shouldDisplay: () => true }
					]
				}
			} as unknown as ManageListQuestion;

			const mockJourneyResponse = {
				answers: {
					myList: [
						{ childName: '', childAge: 25 },
						{ childName: 'Jane', childAge: null },
						{ childName: '', childAge: undefined }
					]
				}
			} as unknown as JourneyResponse;

			const validationChain = validator.validate(mockQuestion, mockJourneyResponse);
			const req = { body: {} };

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors.length, 1);
			assert.strictEqual(result.context.errors[0].msg, 'Name is required, Age is required');
		});

		it('should fail if the saved value is an object but all its values are empty (e.g. empty address)', async () => {
			const validator = new ManageListItemsCompleteValidator({
				childAddress: 'Address is required'
			});

			const mockQuestion = {
				fieldName: 'myList',
				section: {
					questions: [{ fieldName: 'childAddress', shouldDisplay: () => true }]
				}
			} as unknown as ManageListQuestion;

			const mockJourneyResponse = {
				answers: {
					myList: [{ childAddress: { line1: '', postcode: null } }]
				}
			} as unknown as JourneyResponse;

			const validationChain = validator.validate(mockQuestion, mockJourneyResponse);
			const req = { body: {} };

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors.length, 1);
			assert.strictEqual(result.context.errors[0].msg, 'Address is required');
		});
	});
});
