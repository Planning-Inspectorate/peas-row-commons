import { describe, it } from 'node:test';
import assert from 'node:assert';
import NestedRequiredValidator from './validator.ts';

describe('NestedRequiredValidator', () => {
	const mockQuestion = {
		fieldName: 'destinationFolder'
	};

	describe('validate()', () => {
		it('should return an error if the root level folder is missing', async () => {
			const validator = new NestedRequiredValidator('Select a folder');
			const validationChain = validator.validate(mockQuestion);

			const req = {
				body: {}
			};

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors.length, 1);
			assert.strictEqual(result.context.errors[0].msg, 'Select a folder');
		});

		it('should pass if the root level folder is selected', async () => {
			const validator = new NestedRequiredValidator();
			const validationChain = validator.validate(mockQuestion);

			const req = {
				body: {
					destinationFolder_level_0_root: 'folder-id-123'
				}
			};

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors.length, 0);
		});

		it('should fail if the root value is present but empty string', async () => {
			const validator = new NestedRequiredValidator('Custom Error Message');
			const validationChain = validator.validate(mockQuestion);

			const req = {
				body: {
					destinationFolder_level_0_root: ''
				}
			};

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors.length, 1);
			assert.strictEqual(result.context.errors[0].msg, 'Custom Error Message');
		});

		it('should use default error message if none provided', async () => {
			const validator = new NestedRequiredValidator();
			const validationChain = validator.validate(mockQuestion);

			const req = { body: {} };

			const result = await validationChain.run(req);

			assert.strictEqual(result.context.errors[0].msg, 'Select a destination folder');
		});
	});
});
