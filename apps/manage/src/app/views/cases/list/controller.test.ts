import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildListCases } from './controller.ts';
import { configureNunjucks } from '../../../nunjucks.ts';
import { mockLogger } from '@pins/peas-row-commons-lib/testing/mock-logger.ts';

describe('list items', () => {
	it('should render without error', async () => {
		const nunjucks = configureNunjucks();
		// mock response that calls nunjucks to render a result
		const mockRes = {
			render: mock.fn((view, data) => nunjucks.render(view, data))
		};
		const mockDb = {
			$queryRaw: mock.fn()
		};
		const listItems = buildListCases({ db: mockDb, logger: mockLogger() });
		await assert.doesNotReject(() => listItems({}, mockRes));
		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments.length, 2);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/cases/list/view.njk');
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageHeading, 'Some Service Name');
	});
});
