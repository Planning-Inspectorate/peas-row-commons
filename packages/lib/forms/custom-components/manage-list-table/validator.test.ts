import { describe, it } from 'node:test';
import assert from 'node:assert';
import ManageListItemsCompleteValidator from './validator.ts';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import type ManageListQuestion from '@planning-inspectorate/dynamic-forms/src/components/manage-list/question.js';
import { MANAGE_LIST_ACTIONS } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-actions.js';

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
				childName: 'Child name'
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
			assert.strictEqual(result.context.errors[0].msg, "Add 'Child name'");
		});

		it('should pass if a field is missing BUT shouldDisplay returns false (conditionally hidden)', async () => {
			const validator = new ManageListItemsCompleteValidator({
				childName: 'child name'
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
				childName: 'Name',
				childAge: 'Age'
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
			assert.strictEqual(result.context.errors[0].msg, "Add 'Name', 'Age'");
		});

		it('should fail if the saved value is an object but all its values are empty (e.g. empty address)', async () => {
			const validator = new ManageListItemsCompleteValidator({
				childAddress: 'Address'
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
			assert.strictEqual(result.context.errors[0].msg, "Add 'Address'");
		});

		it('should pass if at least one field in an OR group (|) is filled', async () => {
			const validator = new ManageListItemsCompleteValidator({
				'firstName|lastName': 'Name'
			});

			const mockQuestion = {
				fieldName: 'myList',
				section: {
					questions: [
						{ fieldName: 'firstName', shouldDisplay: () => true },
						{ fieldName: 'lastName', shouldDisplay: () => true }
					]
				}
			} as unknown as ManageListQuestion;

			const mockJourneyResponse = {
				answers: {
					myList: [
						{ firstName: 'John', lastName: '' },
						{ firstName: '', lastName: 'Doe' }
					]
				}
			} as unknown as JourneyResponse;

			const validationChain = validator.validate(mockQuestion, mockJourneyResponse);
			const req = { body: {} };

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors.length, 0);
		});

		it('should fail if all visible fields in an OR group (|) are empty', async () => {
			const validator = new ManageListItemsCompleteValidator({
				'firstName|lastName': 'Name'
			});

			const mockQuestion = {
				fieldName: 'myList',
				section: {
					questions: [
						{ fieldName: 'firstName', shouldDisplay: () => true },
						{ fieldName: 'lastName', shouldDisplay: () => true }
					]
				}
			} as unknown as ManageListQuestion;

			const mockJourneyResponse = {
				answers: {
					myList: [{ firstName: '', lastName: null }]
				}
			} as unknown as JourneyResponse;

			const validationChain = validator.validate(mockQuestion, mockJourneyResponse);
			const req = { body: {} };

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors.length, 1);
			assert.strictEqual(result.context.errors[0].msg, "Add 'Name'");
		});

		it('should correctly handle OR groups (|) when some fields are conditionally hidden', async () => {
			const validator = new ManageListItemsCompleteValidator({
				'firstName|lastName': 'Name'
			});

			const mockQuestion = {
				fieldName: 'myList',
				section: {
					questions: [
						// firstName is hidden, so it shouldn't count towards the OR logic at all
						{ fieldName: 'firstName', shouldDisplay: () => false },
						{ fieldName: 'lastName', shouldDisplay: () => true }
					]
				}
			} as unknown as ManageListQuestion;

			const mockJourneyResponse = {
				answers: {
					myList: [
						// Even though firstName has a value, it is hidden so it doesn't count
						// and this should fail beccause there is no lastName
						{ firstName: 'Ghost Value', lastName: '' }
					]
				}
			} as unknown as JourneyResponse;

			const validationChain = validator.validate(mockQuestion, mockJourneyResponse);
			const req = { body: {} };

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors.length, 1);
			assert.strictEqual(result.context.errors[0].msg, "Add 'Name'");
		});

		it('should pass an OR group (|) if all fields in the group are conditionally hidden', async () => {
			const validator = new ManageListItemsCompleteValidator({
				'firstName|lastName': 'Name'
			});

			const mockQuestion = {
				fieldName: 'myList',
				section: {
					questions: [
						{ fieldName: 'firstName', shouldDisplay: () => false },
						{ fieldName: 'lastName', shouldDisplay: () => false }
					]
				}
			} as unknown as ManageListQuestion;

			const mockJourneyResponse = {
				answers: {
					myList: [{ firstName: '', lastName: '' }]
				}
			} as unknown as JourneyResponse;

			const validationChain = validator.validate(mockQuestion, mockJourneyResponse);
			const req = { body: {} };

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors.length, 0);
		});

		it('should pass if request is a REMOVE even if the journey is incomplete / failing', async () => {
			const validator = new ManageListItemsCompleteValidator({
				'firstName|lastName': 'Enter a name'
			});

			const mockQuestion = {
				fieldName: 'myList',
				section: {
					questions: [
						{ fieldName: 'firstName', shouldDisplay: () => true },
						{ fieldName: 'lastName', shouldDisplay: () => true }
					]
				}
			} as unknown as ManageListQuestion;

			const mockJourneyResponse = {
				answers: {
					myList: [{ firstName: '', lastName: null }]
				}
			} as unknown as JourneyResponse;

			const validationChain = validator.validate(mockQuestion, mockJourneyResponse);
			const req = { body: {}, params: { manageListAction: MANAGE_LIST_ACTIONS.REMOVE } };

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors.length, 0);
		});
	});
});
