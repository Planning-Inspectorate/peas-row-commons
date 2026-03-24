import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { generatePdf } from './generate-pdf.ts';

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

function createMockPage() {
	const pdfBytes = new Uint8Array([37, 80, 68, 70]); // %PDF

	return {
		on: mock.fn((_event: string, _handler: (...args: unknown[]) => void) => {}),
		setContent: mock.fn(async (_html: string, _options: { waitUntil: string; timeout: number }) => {}),
		emulateMediaType: mock.fn(async (_type: string) => {}),
		pdf: mock.fn(async (_options: Record<string, unknown>) => pdfBytes),
		close: mock.fn(async () => {})
	};
}

function createMockBrowser(mockPage: ReturnType<typeof createMockPage>) {
	return {
		newPage: mock.fn(async () => mockPage)
	};
}

describe('generatePdf', () => {
	let mockLogger: ReturnType<typeof createMockLogger>;
	let mockPage: ReturnType<typeof createMockPage>;
	let mockBrowser: ReturnType<typeof createMockBrowser>;

	beforeEach(() => {
		mockLogger = createMockLogger();
		mockPage = createMockPage();
		mockBrowser = createMockBrowser(mockPage);
	});

	it('should throw if browser is null', async () => {
		await assert.rejects(() => generatePdf(null as any, '<html></html>', mockLogger as any), {
			message: 'Invalid browser instance provided for PDF generation.'
		});
	});

	it('should throw if browser has no newPage function', async () => {
		await assert.rejects(() => generatePdf({} as any, '<html></html>', mockLogger as any), {
			message: 'Invalid browser instance provided for PDF generation.'
		});
	});

	it('should throw if html is empty string', async () => {
		await assert.rejects(() => generatePdf(mockBrowser as any, '', mockLogger as any), {
			message: 'Cannot generate PDF from empty HTML content.'
		});
	});

	it('should throw if html is only whitespace', async () => {
		await assert.rejects(() => generatePdf(mockBrowser as any, '   \n\t  ', mockLogger as any), {
			message: 'Cannot generate PDF from empty HTML content.'
		});
	});

	it('should create a new page and return a PDF buffer', async () => {
		const result = await generatePdf(mockBrowser as any, '<html>test</html>', mockLogger as any);

		assert.strictEqual(mockBrowser.newPage.mock.callCount(), 1);
		assert.ok(Buffer.isBuffer(result));
		assert.strictEqual(result.length, 4);
	});

	it('should set HTML content with domcontentloaded and 60s timeout', async () => {
		await generatePdf(mockBrowser as any, '<html>test</html>', mockLogger as any);

		assert.strictEqual(mockPage.setContent.mock.callCount(), 1);

		const args = mockPage.setContent.mock.calls[0].arguments as unknown as [
			string,
			{ waitUntil: string; timeout: number }
		];
		assert.strictEqual(args[0], '<html>test</html>');
		assert.strictEqual(args[1].waitUntil, 'domcontentloaded');
		assert.strictEqual(args[1].timeout, 60_000);
	});

	it('should emulate screen media type', async () => {
		await generatePdf(mockBrowser as any, '<html>test</html>', mockLogger as any);

		assert.strictEqual(mockPage.emulateMediaType.mock.callCount(), 1);
		assert.strictEqual(mockPage.emulateMediaType.mock.calls[0].arguments[0], 'screen');
	});

	it('should call page.pdf with A4 format and 20mm margins', async () => {
		await generatePdf(mockBrowser as any, '<html>test</html>', mockLogger as any);

		assert.strictEqual(mockPage.pdf.mock.callCount(), 1);

		const pdfOptions = mockPage.pdf.mock.calls[0].arguments[0] as unknown as {
			format: string;
			printBackground: boolean;
			margin: { top: string; right: string; bottom: string; left: string };
		};

		assert.strictEqual(pdfOptions.format, 'A4');
		assert.strictEqual(pdfOptions.printBackground, true);
		assert.strictEqual(pdfOptions.margin.top, '20mm');
		assert.strictEqual(pdfOptions.margin.right, '20mm');
		assert.strictEqual(pdfOptions.margin.bottom, '20mm');
		assert.strictEqual(pdfOptions.margin.left, '20mm');
	});

	it('should register console, pageerror, and requestfailed listeners', async () => {
		await generatePdf(mockBrowser as any, '<html>test</html>', mockLogger as any);

		const registeredEvents = mockPage.on.mock.calls.map((call) => call.arguments[0] as string);

		assert.ok(registeredEvents.includes('console'));
		assert.ok(registeredEvents.includes('pageerror'));
		assert.ok(registeredEvents.includes('requestfailed'));
	});

	it('should close the page after successful generation', async () => {
		await generatePdf(mockBrowser as any, '<html>test</html>', mockLogger as any);

		assert.strictEqual(mockPage.close.mock.callCount(), 1);
	});

	it('should close the page even if setContent throws', async () => {
		mockPage.setContent.mock.mockImplementation(async () => {
			throw new Error('Navigation timeout');
		});

		await assert.rejects(() => generatePdf(mockBrowser as any, '<html>test</html>', mockLogger as any), {
			message: 'Navigation timeout'
		});

		assert.strictEqual(mockPage.close.mock.callCount(), 1);
	});

	it('should close the page even if pdf() throws', async () => {
		mockPage.pdf.mock.mockImplementation(async () => {
			throw new Error('PDF generation failed');
		});

		await assert.rejects(() => generatePdf(mockBrowser as any, '<html>test</html>', mockLogger as any), {
			message: 'PDF generation failed'
		});

		assert.strictEqual(mockPage.close.mock.callCount(), 1);
	});

	it('should log error but not throw if page.close() fails', async () => {
		mockPage.close.mock.mockImplementation(async () => {
			throw new Error('close failed');
		});

		// Should still return the PDF successfully
		const result = await generatePdf(mockBrowser as any, '<html>test</html>', mockLogger as any);

		assert.ok(Buffer.isBuffer(result));
		assert.ok(
			mockLogger.error.mock.calls.some((call) => {
				const arg = call.arguments[0] as { error?: Error };
				return arg?.error?.message === 'close failed';
			})
		);
	});

	it('should log html length at start and pdf size on completion', async () => {
		await generatePdf(mockBrowser as any, '<html>test</html>', mockLogger as any);

		const infoArgs = mockLogger.info.mock.calls.map(
			(call) => call.arguments[0] as { htmlLength?: number; pdfSizeBytes?: number }
		);

		assert.ok(infoArgs.some((arg) => arg.htmlLength === 17));
		assert.ok(infoArgs.some((arg) => typeof arg.pdfSizeBytes === 'number'));
	});
});
