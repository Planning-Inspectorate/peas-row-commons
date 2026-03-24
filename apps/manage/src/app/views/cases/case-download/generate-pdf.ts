import type { Browser, PDFOptions } from 'puppeteer';
import type { Logger } from 'pino';

/**
 * PDF page configuration.
 *
 * A4 format with 20mm margins on all sides, with background
 * graphics enabled so CSS backgrounds render correctly.
 */
const PDF_OPTIONS: PDFOptions = {
	format: 'A4',
	printBackground: true,
	margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
	scale: 1.0,
	timeout: 60_000
} as const;

/** Timeout for Puppeteer to finish loading page content */
const PAGE_LOAD_TIMEOUT_MS = 60_000;

/**
 * Generates a PDF buffer from an HTML string using a shared Puppeteer browser.
 *
 * Opens a new page in the browser, sets the HTML content, waits for DOM
 * to load, then generates an A4 PDF with GOV.UK-standard margins.
 *
 * The page is always closed after generation (even on error) but the
 * browser itself is kept alive for reuse — this is the key performance
 * optimisation for generating multiple PDFs in a single download.
 */
export async function generatePdf(browser: Browser, html: string, logger: Logger): Promise<Buffer> {
	if (!browser || typeof browser.newPage !== 'function') {
		throw new Error('Invalid browser instance provided for PDF generation.');
	}

	if (!html || html.trim().length === 0) {
		throw new Error('Cannot generate PDF from empty HTML content.');
	}

	logger.info({ htmlLength: html.length }, 'Starting PDF generation');

	// Each PDF gets its own page — pages are lightweight compared to browser processes
	const page = await browser.newPage();

	try {
		// Wire up page-level logging so rendering issues are visible in our logs
		page.on('console', (msg) => logger.debug({ type: msg.type() }, `Page console: ${msg.text()}`));
		page.on('pageerror', (err) => logger.error({ err }, 'Page JavaScript error'));
		page.on('requestfailed', (request) => {
			logger.warn({ url: request.url(), error: request.failure()?.errorText }, 'Page resource failed to load');
		});

		// Set the HTML content and wait for DOM to be ready
		await page.setContent(html, {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_LOAD_TIMEOUT_MS
		});

		// Use screen media type so CSS backgrounds and colours render properly
		await page.emulateMediaType('screen');

		// Generate the PDF
		const pdfUint8Array = await page.pdf(PDF_OPTIONS);
		const pdfBuffer = Buffer.from(pdfUint8Array);

		logger.info({ pdfSizeBytes: pdfBuffer.length }, 'PDF generation complete');

		return pdfBuffer;
	} finally {
		// Always close the page to free memory, even if generation failed.
		// The browser stays alive for the next PDF.
		try {
			await page.close();
		} catch (closeError) {
			logger.error({ error: closeError }, 'Error closing Puppeteer page');
		}
	}
}
