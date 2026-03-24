import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { streamCaseZip } from './zip-builder.ts';
import type { DownloadableDocument } from './types.ts';

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

function createMockResponse() {
	return {
		setHeader: mock.fn((_name: string, _value: string) => {}),
		destroy: mock.fn((_err?: Error) => {}),
		pipe: mock.fn()
	};
}

function createMockArchive() {
	const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

	return {
		on: mock.fn((event: string, handler: (...args: unknown[]) => void) => {
			if (!listeners[event]) listeners[event] = [];
			listeners[event].push(handler);
		}),
		pipe: mock.fn((_destination: unknown) => {}),
		append: mock.fn((_source: unknown, _data: { name: string }) => {}),
		finalize: mock.fn(async () => {}),
		pointer: mock.fn(() => 12345),
		_triggerError: (err: Error) => {
			for (const handler of listeners['error'] ?? []) handler(err);
		},
		_triggerWarning: (warn: Error) => {
			for (const handler of listeners['warning'] ?? []) handler(warn);
		}
	};
}

function createMockArchiverFactory(mockArchive: ReturnType<typeof createMockArchive>) {
	return mock.fn((_format: string, _options: unknown) => mockArchive);
}

function createMockBlobStore(streamBody: unknown = { pipe: mock.fn() }) {
	return {
		downloadBlob: mock.fn(async (_blobName: string) => ({
			readableStreamBody: streamBody
		}))
	};
}

describe('streamCaseZip', () => {
	let mockLogger: ReturnType<typeof createMockLogger>;
	let mockRes: ReturnType<typeof createMockResponse>;
	let mockArchive: ReturnType<typeof createMockArchive>;
	let mockArchiverFactory: ReturnType<typeof createMockArchiverFactory>;

	beforeEach(() => {
		mockLogger = createMockLogger();
		mockRes = createMockResponse();
		mockArchive = createMockArchive();
		mockArchiverFactory = createMockArchiverFactory(mockArchive);
	});

	it('should set correct Content-Type and Content-Disposition headers', async () => {
		await streamCaseZip(mockRes as any, 'DRT/2025/0001', [], [], null, mockLogger as any, mockArchiverFactory as any);

		const headers = mockRes.setHeader.mock.calls.map((call) => call.arguments as unknown as [string, string]);

		const contentType = headers.find(([name]) => name === 'Content-Type');
		assert.strictEqual(contentType?.[1], 'application/zip');

		const disposition = headers.find(([name]) => name === 'Content-Disposition');
		assert.strictEqual(disposition?.[1], 'attachment; filename="DRT_2025_0001_Download.zip"');
	});

	it('should sanitise special characters in case reference for filename', async () => {
		await streamCaseZip(mockRes as any, 'TEST/REF:2025', [], [], null, mockLogger as any, mockArchiverFactory as any);

		const disposition = mockRes.setHeader.mock.calls.find(
			(call) => (call.arguments as unknown as [string])[0] === 'Content-Disposition'
		);
		const value = (disposition?.arguments as unknown as [string, string])?.[1];

		assert.ok(!value.includes('/'));
		assert.ok(!value.includes(':'));
		assert.ok(value.includes('TEST_REF_2025_Download.zip'));
	});

	it('should create archive with zip format and compression level 5', async () => {
		await streamCaseZip(mockRes as any, 'REF/001', [], [], null, mockLogger as any, mockArchiverFactory as any);

		const factoryArgs = mockArchiverFactory.mock.calls[0].arguments as unknown as [string, { zlib: { level: number } }];
		assert.strictEqual(factoryArgs[0], 'zip');
		assert.strictEqual(factoryArgs[1].zlib.level, 5);
	});

	it('should pipe the archive to the response', async () => {
		await streamCaseZip(mockRes as any, 'REF/001', [], [], null, mockLogger as any, mockArchiverFactory as any);

		assert.strictEqual(mockArchive.pipe.mock.callCount(), 1);
		assert.strictEqual(mockArchive.pipe.mock.calls[0].arguments[0], mockRes);
	});

	it('should append PDFs to the root folder of the archive', async () => {
		const pdfs = [
			{ fileName: 'Case details.pdf', buffer: Buffer.from('pdf-1') },
			{ fileName: 'Objector list.pdf', buffer: Buffer.from('pdf-2') },
			{ fileName: 'Contact list.pdf', buffer: Buffer.from('pdf-3') }
		];

		await streamCaseZip(mockRes as any, 'DRT/2025/0001', pdfs, [], null, mockLogger as any, mockArchiverFactory as any);

		assert.strictEqual(mockArchive.append.mock.callCount(), 3);

		const appendCalls = mockArchive.append.mock.calls.map(
			(call) => call.arguments as unknown as [Buffer, { name: string }]
		);

		assert.strictEqual(appendCalls[0][1].name, 'DRT_2025_0001_Download/Case details.pdf');
		assert.strictEqual(appendCalls[1][1].name, 'DRT_2025_0001_Download/Objector list.pdf');
		assert.strictEqual(appendCalls[2][1].name, 'DRT_2025_0001_Download/Contact list.pdf');
		assert.deepStrictEqual(appendCalls[0][0], Buffer.from('pdf-1'));
	});

	it('should download blob documents and append them under Documents subfolder', async () => {
		const mockStream = { pipe: mock.fn() };
		const mockBlobStore = createMockBlobStore(mockStream);

		const documents: DownloadableDocument[] = [
			{ fileName: 'report.pdf', blobName: 'case-1/blob-1', folderName: 'Evidence' },
			{ fileName: 'letter.docx', blobName: 'case-1/blob-2', folderName: 'Correspondence' }
		];

		await streamCaseZip(
			mockRes as any,
			'REF/001',
			[],
			documents,
			mockBlobStore as any,
			mockLogger as any,
			mockArchiverFactory as any
		);

		assert.strictEqual(mockBlobStore.downloadBlob.mock.callCount(), 2);

		const appendCalls = mockArchive.append.mock.calls.map(
			(call) => call.arguments as unknown as [unknown, { name: string }]
		);

		assert.strictEqual(appendCalls[0][1].name, 'REF_001_Download/Documents/Evidence/report.pdf');
		assert.strictEqual(appendCalls[1][1].name, 'REF_001_Download/Documents/Correspondence/letter.docx');
	});

	it('should sanitise folder names in document paths', async () => {
		const mockBlobStore = createMockBlobStore({ pipe: mock.fn() });

		const documents: DownloadableDocument[] = [
			{ fileName: 'doc.pdf', blobName: 'case-1/blob-1', folderName: 'Folder/With:Special*Chars' }
		];

		await streamCaseZip(
			mockRes as any,
			'REF/001',
			[],
			documents,
			mockBlobStore as any,
			mockLogger as any,
			mockArchiverFactory as any
		);

		const appendCall = mockArchive.append.mock.calls[0].arguments as unknown as [unknown, { name: string }];
		assert.ok(!appendCall[1].name.includes(':'));
		assert.ok(appendCall[1].name.includes('Folder_With_Special_Chars'));
	});

	it('should skip documents when blob store is null', async () => {
		const documents: DownloadableDocument[] = [
			{ fileName: 'report.pdf', blobName: 'case-1/blob-1', folderName: 'Evidence' }
		];

		await streamCaseZip(mockRes as any, 'REF/001', [], documents, null, mockLogger as any, mockArchiverFactory as any);

		// No appends for documents (only PDFs would be appended, and we passed none)
		assert.strictEqual(mockArchive.append.mock.callCount(), 0);
	});

	it('should skip documents when document list is empty', async () => {
		const mockBlobStore = createMockBlobStore();

		await streamCaseZip(
			mockRes as any,
			'REF/001',
			[],
			[],
			mockBlobStore as any,
			mockLogger as any,
			mockArchiverFactory as any
		);

		assert.strictEqual(mockBlobStore.downloadBlob.mock.callCount(), 0);
	});

	it('should skip a document if blob download returns no readable stream', async () => {
		const mockBlobStore = {
			downloadBlob: mock.fn(async (_blobName: string) => ({
				readableStreamBody: null
			}))
		};

		const documents: DownloadableDocument[] = [
			{ fileName: 'missing.pdf', blobName: 'case-1/blob-1', folderName: 'Evidence' }
		];

		await streamCaseZip(
			mockRes as any,
			'REF/001',
			[],
			documents,
			mockBlobStore as any,
			mockLogger as any,
			mockArchiverFactory as any
		);

		assert.strictEqual(mockArchive.append.mock.callCount(), 0);
		assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
	});

	it('should skip a document if blob download throws and continue with others', async () => {
		let callCount = 0;
		const mockBlobStore = {
			downloadBlob: mock.fn(async (_blobName: string) => {
				callCount++;
				if (callCount === 1) throw new Error('Blob not found');
				return { readableStreamBody: { pipe: mock.fn() } };
			})
		};

		const documents: DownloadableDocument[] = [
			{ fileName: 'broken.pdf', blobName: 'case-1/blob-bad', folderName: 'Evidence' },
			{ fileName: 'good.pdf', blobName: 'case-1/blob-good', folderName: 'Evidence' }
		];

		await streamCaseZip(
			mockRes as any,
			'REF/001',
			[],
			documents,
			mockBlobStore as any,
			mockLogger as any,
			mockArchiverFactory as any
		);

		// First failed, second succeeded
		assert.strictEqual(mockBlobStore.downloadBlob.mock.callCount(), 2);
		assert.strictEqual(mockArchive.append.mock.callCount(), 1);
		assert.strictEqual(mockLogger.error.mock.callCount(), 1);
	});

	it('should call archive.finalize', async () => {
		await streamCaseZip(mockRes as any, 'REF/001', [], [], null, mockLogger as any, mockArchiverFactory as any);

		assert.strictEqual(mockArchive.finalize.mock.callCount(), 1);
	});

	it('should log total bytes and document count after finalize', async () => {
		const documents: DownloadableDocument[] = [
			{ fileName: 'doc.pdf', blobName: 'case-1/blob-1', folderName: 'Folder' }
		];
		const mockBlobStore = createMockBlobStore({ pipe: mock.fn() });

		await streamCaseZip(
			mockRes as any,
			'REF/001',
			[],
			documents,
			mockBlobStore as any,
			mockLogger as any,
			mockArchiverFactory as any
		);

		const finalLog = mockLogger.info.mock.calls.find((call) => {
			const arg = call.arguments[0] as { totalBytes?: number; documentCount?: number };
			return arg?.totalBytes !== undefined;
		});

		assert.ok(finalLog);
		const logData = finalLog.arguments[0] as { totalBytes: number; documentCount: number };
		assert.strictEqual(logData.totalBytes, 12345);
		assert.strictEqual(logData.documentCount, 1);
	});

	it('should register error and warning handlers on the archive', async () => {
		await streamCaseZip(mockRes as any, 'REF/001', [], [], null, mockLogger as any, mockArchiverFactory as any);

		const registeredEvents = mockArchive.on.mock.calls.map((call) => call.arguments[0] as string);

		assert.ok(registeredEvents.includes('error'));
		assert.ok(registeredEvents.includes('warning'));
	});

	it('should destroy response when archive emits an error', async () => {
		await streamCaseZip(mockRes as any, 'REF/001', [], [], null, mockLogger as any, mockArchiverFactory as any);

		const archiveError = new Error('Archive corrupt');
		mockArchive._triggerError(archiveError);

		assert.strictEqual(mockRes.destroy.mock.callCount(), 1);
		assert.strictEqual(mockLogger.error.mock.callCount(), 1);
	});

	it('should log when archive emits a warning', async () => {
		await streamCaseZip(mockRes as any, 'REF/001', [], [], null, mockLogger as any, mockArchiverFactory as any);

		mockArchive._triggerWarning(new Error('Minor issue'));

		assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
	});

	it('should include both PDFs and documents in the same archive', async () => {
		const mockBlobStore = createMockBlobStore({ pipe: mock.fn() });
		const pdfs = [{ fileName: 'Case details.pdf', buffer: Buffer.from('pdf') }];
		const documents: DownloadableDocument[] = [
			{ fileName: 'doc.pdf', blobName: 'case-1/blob-1', folderName: 'Evidence' }
		];

		await streamCaseZip(
			mockRes as any,
			'REF/001',
			pdfs,
			documents,
			mockBlobStore as any,
			mockLogger as any,
			mockArchiverFactory as any
		);

		// 1 PDF + 1 document
		assert.strictEqual(mockArchive.append.mock.callCount(), 2);

		const paths = mockArchive.append.mock.calls.map(
			(call) => (call.arguments as unknown as [unknown, { name: string }])[1].name
		);

		assert.ok(paths[0].endsWith('Case details.pdf'));
		assert.ok(paths[1].includes('Documents/Evidence/doc.pdf'));
	});
});
