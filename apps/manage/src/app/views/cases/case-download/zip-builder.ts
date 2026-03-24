/**
 * Zip builder for case downloads.
 *
 * Assembles a zip archive containing:
 * - Three generated PDFs (case details, objector list, contact list)
 * - All case documents from Azure Blob Storage, organised into subfolders
 */

import type archiver from 'archiver';
import type { Response } from 'express';
import type { Logger } from 'pino';
import type { Readable } from 'node:stream';
import type { BlobStorageClient } from '@pins/peas-row-commons-lib/blob-store/blob-store-client.ts';
import type { DownloadableDocument } from './types.ts';

/** Named PDF files included in every case download */
interface GeneratedPdf {
	/** File name in the zip (e.g. "Case details.pdf") */
	fileName: string;
	/** PDF content as a buffer */
	buffer: Buffer;
}

/**
 * Streams a zip archive to the HTTP response containing PDFs and case documents.
 *
 * The zip structure is:
 * ```
 * {CaseReference}_Download/
 * ├── Case details.pdf
 * ├── Objector list.pdf
 * ├── Contact list.pdf
 * └── Documents/
 *     ├── {FolderName}/
 *     │   ├── document1.pdf
 *     │   └── document2.jpg
 *     └── {AnotherFolder}/
 *         └── document3.docx
 * ```
 */
export async function streamCaseZip(
	res: Response,
	caseReference: string,
	pdfs: GeneratedPdf[],
	documents: DownloadableDocument[],
	blobStore: BlobStorageClient | null,
	logger: Logger,
	archiverFactory: typeof archiver
): Promise<void> {
	// Sanitise the reference for use as a filename (remove characters invalid in file paths)
	const safeReference = caseReference.replace(/[/\\:*?"<>|]/g, '_');
	const rootFolder = `${safeReference}_Download`;
	const zipFileName = `${safeReference}_Download.zip`;

	// Set HTTP headers for a zip file download
	res.setHeader('Content-Type', 'application/zip');
	res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

	// Compression level 5-6 is a good middle ground between speed and size,
	// consistent with the existing document download controller
	const archive = archiverFactory('zip', { zlib: { level: 5 } });

	// Handle archive-level errors by destroying the response
	archive.on('error', (err: Error) => {
		logger.error({ err }, 'Archive error during case download');
		res.destroy(err);
	});

	archive.on('warning', (warn: Error) => {
		logger.warn({ warning: warn }, 'Archive warning during case download');
	});

	// Pipe archive output directly to the HTTP response
	archive.pipe(res);

	// 1. Add the generated PDFs to the root of the zip
	for (const pdf of pdfs) {
		archive.append(pdf.buffer, { name: `${rootFolder}/${pdf.fileName}` });
		logger.debug({ fileName: pdf.fileName }, 'Added PDF to archive');
	}

	// 2. Download and add each case document from blob storage
	if (blobStore && documents.length > 0) {
		await appendBlobDocuments(archive, rootFolder, documents, blobStore, logger);
	}

	// Finalise the archive — this triggers the end of the stream
	await archive.finalize();

	logger.info({ totalBytes: archive.pointer(), documentCount: documents.length }, 'Case download zip finalised');
}

/**
 * Downloads documents from Azure Blob Storage and appends them to the archive.
 *
 * Each document is placed under `Documents/{FolderName}/{FileName}` within the zip.
 * If a document fails to download, it is skipped with a warning rather than
 * failing the entire download — consistent with the existing bulk download
 * behaviour where one failure doesn't stop the other files.
 */
async function appendBlobDocuments(
	archive: ReturnType<typeof archiver>,
	rootFolder: string,
	documents: DownloadableDocument[],
	blobStore: BlobStorageClient,
	logger: Logger
): Promise<void> {
	for (const doc of documents) {
		try {
			const blobResponse = await blobStore.downloadBlob(doc.blobName);
			const readableBody = blobResponse.readableStreamBody;

			if (!readableBody) {
				logger.warn({ blobName: doc.blobName }, 'Blob download returned no readable stream — skipping');
				continue;
			}

			// Sanitise folder name for use in zip path
			const safeFolder = doc.folderName.replace(/[/\\:*?"<>|]/g, '_');
			const zipPath = `${rootFolder}/Documents/${safeFolder}/${doc.fileName}`;

			archive.append(readableBody as Readable, { name: zipPath });

			logger.debug({ zipPath, blobName: doc.blobName }, 'Appended blob document to archive');
		} catch (error) {
			// Log and skip — a missing document shouldn't block the entire download
			logger.error(
				{ error, blobName: doc.blobName, fileName: doc.fileName },
				'Failed to download blob document — skipping'
			);
		}
	}
}
