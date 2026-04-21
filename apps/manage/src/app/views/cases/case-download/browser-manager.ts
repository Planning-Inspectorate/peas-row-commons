import puppeteer, { type Browser } from 'puppeteer-core';
import type { Logger } from 'pino';

/**
 * Recommended Chromium launch arguments for headless Docker/Linux environments.
 *
 * These flags disable GPU rendering, sandboxing, and shared memory usage
 * which are common sources of crashes in containerised environments.
 */
const CHROMIUM_LAUNCH_ARGS: readonly string[] = [
	'--disable-gpu',
	'--disable-dev-shm-usage',
	'--disable-setuid-sandbox',
	'--no-sandbox',
	'--disable-extensions',
	'--disable-component-extensions-with-background-pages'
] as const;

/** Singleton browser instance, lazily created on first use */
let browserInstance: Browser | null = null;

/**
 * Returns a shared Puppeteer browser instance, launching one if it doesn't exist yet.
 *
 * Uses lazy initialisation — the browser is only started when the first
 * PDF generation is requested, not on app startup. Once launched, the
 * same instance is reused for all subsequent PDF generations to avoid
 * the overhead of launching a new browser process each time.
 *
 * If the browser disconnects unexpectedly, the reference
 * is cleared so the next call will launch a fresh instance.
 */
export async function getOrLaunchBrowser(
	logger: Logger,
	chromiumPath = '/usr/bin/chromium',
	launchFn: (options: Parameters<typeof puppeteer.launch>[0]) => Promise<Browser> = puppeteer.launch.bind(puppeteer)
): Promise<Browser> {
	if (browserInstance) {
		return browserInstance;
	}

	logger.info(`Launching Puppeteer browser instance on first use from: ${chromiumPath}`);

	const browser = await launchFn({
		executablePath: chromiumPath,
		headless: true,
		args: [...CHROMIUM_LAUNCH_ARGS]
	});

	browserInstance = browser;

	browser.on('disconnected', () => {
		logger.error('Browser instance disconnected unexpectedly — will relaunch on next use');
		browserInstance = null;
	});

	return browser;
}

/**
 * Gracefully closes the shared browser instance if one is running.
 *
 * Call this during app shutdown (e.g. SIGTERM handler) to clean up.
 * Safe to call even if no browser has been launched — it will no-op.
 */
export async function closeBrowser(logger: Logger): Promise<void> {
	if (!browserInstance) {
		return;
	}

	logger.info('Closing shared browser instance');

	try {
		await browserInstance.close();
		browserInstance = null;
		logger.info('Browser instance closed successfully');
	} catch (error) {
		logger.error({ error }, 'Error closing browser instance');
	}
}

/** Resets the singleton — only exported for testing */
export function _resetForTesting(): void {
	browserInstance = null;
}
