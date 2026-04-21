import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { getOrLaunchBrowser, closeBrowser, _resetForTesting } from './browser-manager.ts';

function createMockBrowser() {
	const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
	return {
		close: mock.fn(async () => {}),
		newPage: mock.fn(async () => ({})),
		on: mock.fn((event: string, handler: (...args: unknown[]) => void) => {
			if (!listeners[event]) listeners[event] = [];
			listeners[event].push(handler);
		}),
		_triggerDisconnect: () => {
			for (const handler of listeners['disconnected'] ?? []) handler();
		}
	};
}

function createMockLogger() {
	return {
		info: mock.fn(),
		warn: mock.fn(),
		error: mock.fn(),
		debug: mock.fn(),
		fatal: mock.fn(),
		trace: mock.fn(),
		child: mock.fn()
	};
}

describe('browser-manager', () => {
	let mockBrowser: ReturnType<typeof createMockBrowser>;
	let mockLogger: ReturnType<typeof createMockLogger>;
	let mockLaunch: ReturnType<typeof mock.fn>;

	beforeEach(() => {
		_resetForTesting();
		mockBrowser = createMockBrowser();
		mockLogger = createMockLogger();
		mockLaunch = mock.fn(async () => mockBrowser);
	});

	describe('getOrLaunchBrowser', () => {
		it('should launch a new browser on first call', async () => {
			const browser = await getOrLaunchBrowser(mockLogger as any, undefined, mockLaunch as any);
			assert.strictEqual(mockLaunch.mock.callCount(), 1);
			assert.strictEqual(browser, mockBrowser);
		});

		it('should reuse existing browser on subsequent calls', async () => {
			const first = await getOrLaunchBrowser(mockLogger as any, undefined, mockLaunch as any);
			const second = await getOrLaunchBrowser(mockLogger as any, undefined, mockLaunch as any);
			assert.strictEqual(first, second);
			assert.strictEqual(mockLaunch.mock.callCount(), 1);
		});

		it('should launch with headless true and chromium args', async () => {
			await getOrLaunchBrowser(mockLogger as any, undefined, mockLaunch as any);
			const args = mockLaunch.mock.calls[0].arguments[0] as unknown as { headless: boolean; args: string[] };
			assert.strictEqual(args.headless, true);
			assert.ok(args.args.includes('--no-sandbox'));
			assert.ok(args.args.includes('--disable-gpu'));
		});

		it('should register a disconnected listener', async () => {
			await getOrLaunchBrowser(mockLogger as any, undefined, mockLaunch as any);
			assert.strictEqual(mockBrowser.on.mock.callCount(), 1);
			assert.strictEqual(mockBrowser.on.mock.calls[0].arguments[0], 'disconnected');
		});

		it('should relaunch after unexpected disconnect', async () => {
			await getOrLaunchBrowser(mockLogger as any, undefined, mockLaunch as any);
			mockBrowser._triggerDisconnect();

			const freshBrowser = createMockBrowser();
			mockLaunch.mock.mockImplementation(async () => freshBrowser);

			const browser = await getOrLaunchBrowser(mockLogger as any, undefined, mockLaunch as any);
			assert.strictEqual(mockLaunch.mock.callCount(), 2);
			assert.strictEqual(browser, freshBrowser);
		});

		it('should throw if launch fails', async () => {
			mockLaunch.mock.mockImplementation(async () => {
				throw new Error('Chromium not found');
			});
			await assert.rejects(() => getOrLaunchBrowser(mockLogger as any, undefined, mockLaunch as any), {
				message: 'Chromium not found'
			});
		});
	});

	describe('closeBrowser', () => {
		it('should no-op if no browser has been launched', async () => {
			await closeBrowser(mockLogger as any);
			assert.strictEqual(mockBrowser.close.mock.callCount(), 0);
		});

		it('should close the browser if one is running', async () => {
			await getOrLaunchBrowser(mockLogger as any, undefined, mockLaunch as any);
			await closeBrowser(mockLogger as any);
			assert.strictEqual(mockBrowser.close.mock.callCount(), 1);
		});

		it('should allow a new browser to launch after closing', async () => {
			await getOrLaunchBrowser(mockLogger as any, undefined, mockLaunch as any);
			await closeBrowser(mockLogger as any);
			const freshBrowser = createMockBrowser();
			mockLaunch.mock.mockImplementation(async () => freshBrowser);
			const browser = await getOrLaunchBrowser(mockLogger as any, undefined, mockLaunch as any);
			assert.strictEqual(mockLaunch.mock.callCount(), 2);
			assert.strictEqual(browser, freshBrowser);
		});

		it('should log error but not throw if close fails', async () => {
			mockBrowser.close.mock.mockImplementation(async () => {
				throw new Error('close failed');
			});
			await getOrLaunchBrowser(mockLogger as any, undefined, mockLaunch as any);
			await closeBrowser(mockLogger as any);
			assert.ok(
				mockLogger.error.mock.calls.some(
					(call) => typeof call.arguments[0] === 'object' && (call.arguments[0] as Record<string, unknown>).error
				)
			);
		});
	});
});
