import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import AddressWithIdQuestion from './question.ts';
import type { Request } from 'express';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import type { AddressItem } from '../../../util/types.ts';
import type { QuestionParameters } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

describe('AddressWithIdQuestion', () => {
	let question: AddressWithIdQuestion;

	beforeEach(() => {
		question = new AddressWithIdQuestion({
			title: 'Site Address',
			fieldName: 'siteAddress',
			question: 'What is the site address?'
		} as QuestionParameters);
	});

	describe('Constructor', () => {
		it('should set the custom view folder', () => {
			assert.strictEqual(question.viewFolder, 'custom-components/address-with-id');
		});
	});

	describe('getDataToSave()', () => {
		it('should append the hidden ID to the address if present in the request body', async () => {
			const req = {
				body: {
					siteAddress_addressLine1: '10 Downing St',
					siteAddress_townCity: 'London',
					siteAddress_hiddenId: '123-abc'
				}
			} as unknown as Request;

			const result = await question.getDataToSave(req, {} as JourneyResponse);

			assert.ok(result.answers.siteAddress);
			assert.strictEqual((result.answers.siteAddress as AddressItem).id, '123-abc');
			assert.strictEqual((result.answers.siteAddress as AddressItem).addressLine1, '10 Downing St');
			assert.strictEqual((result.answers.siteAddress as AddressItem).townCity, 'London');
		});

		it('should not add id if hiddenId is missing from the request body', async () => {
			const req = {
				body: {
					siteAddress_addressLine1: '10 Downing St'
				}
			} as unknown as Request;

			const result = await question.getDataToSave(req, {} as JourneyResponse);

			assert.ok(result.answers.siteAddress);
			assert.strictEqual((result.answers.siteAddress as AddressItem).id, undefined);
		});

		it('should safely handle missing address data (when parent returns null)', async () => {
			const req = {
				body: {
					siteAddress_hiddenId: '123-abc'
				}
			} as unknown as Request;

			const result = await question.getDataToSave(req, {} as JourneyResponse);

			assert.strictEqual(result.answers.siteAddress, null);
		});
	});

	describe('answerForViewModel()', () => {
		it('should append the id to the view model if it exists in the answers', () => {
			const answers = {
				siteAddress: {
					id: '999-xyz',
					addressLine1: '123 Fake St',
					townCity: 'Springfield'
				}
			};

			const result = question.answerForViewModel(answers);

			assert.strictEqual(result.id, '999-xyz');
			assert.strictEqual(result.addressLine1, '123 Fake St');
			assert.strictEqual(result.townCity, 'Springfield');
		});

		it('should return an empty string for id if it is not present in the answers', () => {
			const answers = {
				siteAddress: {
					addressLine1: '123 Fake St'
				}
			};

			const result = question.answerForViewModel(answers);

			assert.strictEqual(result.id, '');
			assert.strictEqual(result.addressLine1, '123 Fake St');
		});

		it('should handle missing address answer gracefully and return empty string for id', () => {
			const answers = {};

			const result = question.answerForViewModel(answers);

			assert.strictEqual(result.id, '');
			assert.strictEqual(result.addressLine1, '');
		});
	});
});
