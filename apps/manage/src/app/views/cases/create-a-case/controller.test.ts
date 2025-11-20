import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { getCreateCaseWorkArea, postCreateCaseWorkArea } from './controller.ts';
import { mockLogger } from '@pins/peas-row-commons-lib/testing/mock-logger.ts';
import { createCaseWorkAreaConstant } from './constant.ts';

describe('Create Case Work Area Controller', () => {
	describe('getCreateCaseWorkArea', () => {
		it('should render the create case work area page with empty options', async () => {
			const mockRes = {
				render: mock.fn()
			};

			const mockDb = {
				$queryRaw: mock.fn(() => Promise.resolve())
			};

			const mockService = {
				db: mockDb,
				logger: mockLogger()
			};

			const handler = getCreateCaseWorkArea(mockService as any);
			await handler({} as any, mockRes as any);

			// Verify database query was made
			assert.strictEqual(mockDb.$queryRaw.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.$queryRaw.mock.calls[0].arguments[0], ['SELECT 1']);

			// Verify render was called with correct parameters
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments;

			assert.strictEqual(renderArgs[0], 'views/cases/create-a-case/view.njk');
			assert.strictEqual(renderArgs[1].pageTitle, 'What area does this new case relate to?');

			// Check radioData structure without using expect
			const radioData = renderArgs[1].radioData;
			assert.strictEqual(radioData.name, 'caseType');
			assert.strictEqual(radioData.fieldset.legend.text, 'What area does this new case relate to?');
			assert.strictEqual(radioData.fieldset.legend.isPageHeading, true);
			assert.strictEqual(radioData.fieldset.legend.classes, 'govuk-fieldset__legend--l');
			assert.deepStrictEqual(radioData.items, createCaseWorkAreaConstant);
			assert.strictEqual(radioData.selected, undefined);

			assert.strictEqual(renderArgs[1].errorMessage, undefined);
		});

		it('should handle database connection error', async () => {
			const mockRes = {
				render: mock.fn()
			};

			const mockDb = {
				$queryRaw: mock.fn(() => Promise.reject(new Error('DB connection failed')))
			};

			const mockService = {
				db: mockDb,
				logger: mockLogger()
			};

			const handler = getCreateCaseWorkArea(mockService as any);

			await assert.rejects(() => handler({} as any, mockRes as any), {
				name: 'Error',
				message: 'DB connection failed'
			});
		});
	});

	describe('postCreateCaseWorkArea', () => {
		it('should redirect to PEA page when PEA case type is selected', async () => {
			const mockRes = {
				redirect: mock.fn()
			};

			const mockReq = {
				body: {
					caseType: 'PEA'
				}
			};

			const mockService = {
				logger: mockLogger()
			};

			const handler = postCreateCaseWorkArea(mockService as any);
			await handler(mockReq as any, mockRes as any);

			// Verify redirect was called with correct path
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/create-case/pea-page');
		});

		it('should redirect to RWC page when RWC case type is selected', async () => {
			const mockRes = {
				redirect: mock.fn()
			};

			const mockReq = {
				body: {
					caseType: 'RWC'
				}
			};

			const mockService = {
				logger: mockLogger()
			};

			const handler = postCreateCaseWorkArea(mockService as any);
			await handler(mockReq as any, mockRes as any);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/create-case/rwc-page');
		});

		it('should render with error when no case type is selected', async () => {
			const mockRes = {
				render: mock.fn()
			};

			const mockReq = {
				body: {
					caseType: ''
				}
			};

			const mockService = {
				logger: mockLogger()
			};

			const handler = postCreateCaseWorkArea(mockService as any);
			await handler(mockReq as any, mockRes as any);

			// Verify render was called with error message
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments;

			assert.strictEqual(renderArgs[0], 'views/cases/create-a-case/view.njk');
			assert.strictEqual(renderArgs[1].errorMessage, 'Select the casework area');
			assert.strictEqual(renderArgs[1].radioData.selected, '');
		});

		it('should render with error when caseType is undefined', async () => {
			const mockRes = {
				render: mock.fn()
			};

			const mockReq = {
				body: {} // No caseType provided
			};

			const mockService = {
				logger: mockLogger()
			};

			const handler = postCreateCaseWorkArea(mockService as any);
			await handler(mockReq as any, mockRes as any);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments;

			assert.strictEqual(renderArgs[1].errorMessage, 'Select the casework area');
			assert.strictEqual(renderArgs[1].radioData.selected, undefined);
		});

		it('should redirect to case-types when invalid case type is selected', async () => {
			const mockRes = {
				redirect: mock.fn()
			};

			const mockReq = {
				body: {
					caseType: 'INVALID_TYPE'
				}
			};

			const mockService = {
				logger: mockLogger()
			};

			const handler = postCreateCaseWorkArea(mockService as any);
			await handler(mockReq as any, mockRes as any);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/case-types');
		});

		it('should log the selected case type', async () => {
			const mockRes = {
				redirect: mock.fn()
			};

			const mockReq = {
				body: {
					caseType: 'PEA'
				}
			};

			const mockLoggerInstance = mockLogger();
			const mockService = {
				logger: mockLoggerInstance
			};

			const handler = postCreateCaseWorkArea(mockService as any);
			await handler(mockReq as any, mockRes as any);

			// Verify logger was called with correct message
			const logCalls = mockLoggerInstance.info.mock.calls;
			assert.strictEqual(logCalls.length, 1);
			assert.strictEqual(logCalls[0].arguments[0], 'Selected case type: PEA');
		});
	});

	describe('Edge Cases', () => {
		it('should handle null body in POST request', async () => {
			const mockRes = {
				render: mock.fn()
			};

			const mockReq = {
				body: null
			};

			const mockService = {
				logger: mockLogger()
			};

			const handler = postCreateCaseWorkArea(mockService as any);
			await handler(mockReq as any, mockRes as any);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments;
			assert.strictEqual(renderArgs[1].errorMessage, 'Select the casework area');
			assert.strictEqual(renderArgs[1].radioData.selected, undefined);
		});

		it('should handle case type with whitespace', async () => {
			const mockRes = {
				redirect: mock.fn()
			};

			const mockReq = {
				body: {
					caseType: '  PEA  ' // Whitespace around valid type
				}
			};

			const mockService = {
				logger: mockLogger()
			};

			const handler = postCreateCaseWorkArea(mockService as any);
			await handler(mockReq as any, mockRes as any);

			// This will redirect to case-types since trimmed value doesn't match exactly
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/case-types');
		});
	});
});
