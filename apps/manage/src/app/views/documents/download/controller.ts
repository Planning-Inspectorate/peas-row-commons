import type { Request, Response } from 'express';
import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import type { Document, PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Logger } from 'pino';
import type { BlobStorageClient } from '@pins/peas-row-commons-lib/blob-store/blob-store-client.ts';
import { AUDIT_ACTIONS } from '../../../audit/actions.ts';
import archiver from 'archiver';
import type { Readable } from 'stream';
import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { stringToKebab } from '@pins/peas-row-commons-lib/util/strings.ts';
import { generateUniqueFilename } from '@pins/peas-row-commons-lib/util/files.ts';

/**
 * Extracts document IDs from the request body.
 * Ensures we always return an array of strings.
 *
 * First check for a parameter (single download)
 * and then fallback to selectedFiles from the body
 *
 * If nothing, array will be empty and then it will be caught in parent.
 */
function extractDocumentIds(req: Request): string[] {
	const rawIds = req.params.documentId || req.body?.selectedFiles;
	return (Array.isArray(rawIds) ? rawIds : [rawIds]).filter(Boolean) as string[];
}

/**
 * Builds the download document controller, fetches documents from SQL.
 * If 1 document: streams raw blob.
 * If multiple: streams blobs into a dynamic ZIP archive.
 */
export function buildDownloadDocument(service: ManageService): AsyncRequestHandler {
	const { db, logger, blobStore, audit, archiverFactory } = service;

	return async (req: Request, res: Response) => {
		const documentIds = extractDocumentIds(req);
		const isPreview = req.query.preview === 'true';

		if (!documentIds?.length) {
			if (!req.body) throw new Error('documentId param required for single downloads');

			// If these are not populated for whatever reason, we are not concerned
			// as they are only used for a message.
			const returnUrl = req.body.returnUrl || '/';
			const caseId = req.body.caseId || '';

			addSessionData(
				req,
				caseId,
				{
					filesErrors: [
						{
							text: 'Select file(s) to download',
							href: '#'
						}
					]
				},
				'folder'
			);

			return res.redirect(returnUrl);
		}

		const documents = await fetchDocumentsMetadata(db, documentIds, logger);

		if (!documents || documents.length === 0) return;

		let zipFileName = '';

		if (documents.length === 1) {
			await streamDocumentToResponse(res, blobStore, documents[0], isPreview, logger);
		} else {
			zipFileName = await streamZipToResponse(res, blobStore, documents, logger, archiverFactory);
		}

		// Since downloadStream.pipe(res) is async, the function returns before the
		// stream completes. We listen for 'finish' so the audit event is only
		// recorded when the response has been fully sent to the client.
		// If the stream errors or the client aborts, 'finish' won't fire,
		// so only successful downloads are audited.
		res.on('finish', async () => {
			const userId = req?.session?.account?.localAccountId;

			if (documents.length === 1) {
				await audit.record({
					caseId: documents[0].caseId,
					action: AUDIT_ACTIONS.FILE_DOWNLOADED,
					userId,
					metadata: { fileName: documents[0].fileName }
				});
			} else {
				await audit.record({
					caseId: documents[0].caseId,
					action: AUDIT_ACTIONS.FILES_DOWNLOADED,
					userId,
					metadata: {
						zipName: zipFileName,
						files: documents.map((doc) => doc.fileName)
					}
				});
			}
		});
	};
}

/**
 * Grabs the documents requested
 */
async function fetchDocumentsMetadata(db: PrismaClient, documentIds: string[], logger: Logger) {
	try {
		const documents = await db.document.findMany({
			where: { id: { in: documentIds } },
			include: {
				Case: {
					select: {
						reference: true
					}
				}
			}
		});

		if (!documents || documents.length === 0) {
			throw new Error(`No documents found for provided ids`);
		}

		return documents;
	} catch (error) {
		if (error instanceof Error) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching documents',
				logParams: { documentIds }
			});
		}
	}
}

/**
 * BULK: Streams multiple documents from azure blob into a ZIP archive,
 * piping the ZIP directly to the res object.
 */
async function streamZipToResponse(
	res: Response,
	blobStore: BlobStorageClient | null,
	documents: (Document & { Case: { reference: string } })[],
	logger: Logger,
	archiverFactory: typeof archiver
): Promise<string> {
	if (!blobStore) throw new Error('Blob store client missing');

	// All documents will have the same case join so just take doc 1 to get the reference
	const kebabedReference = stringToKebab(documents[0].Case.reference);

	// File name follows format `<case-ref>-bulk-download-2026-01-01.zip`
	const zipFileName = `${kebabedReference}-bulk-download-${new Date().toISOString().split('T')[0]}.zip`;

	res.setHeader('Content-Type', 'application/zip');
	res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

	// 5-6 is considered a good middle ground for zip files, from what I undestand.
	// We may want to move towards 'fast' (1-3) at speed is more important than compression.
	const archive = archiverFactory('zip', {
		zlib: { level: 5 }
	});

	archive.on('error', (err) => {
		logger.error({ err }, 'Error zipping files');
		res.destroy(err);
	});

	archive.pipe(res);

	const seenFileNames = new Set<string>();

	for (const doc of documents) {
		try {
			const downloadResponse = await blobStore.downloadBlob(doc.blobName);
			const stream = downloadResponse?.readableStreamBody;

			if (stream) {
				const uniqueName = generateUniqueFilename(doc.fileName, seenFileNames);
				archive.append(stream as Readable, { name: uniqueName });
			} else {
				logger.warn({ documentId: doc.id }, 'No stream found for document to zip');
			}
		} catch (error) {
			// If there's an error with 1 file, we do not break the loop, we log it for
			// visibility but continue the others (we don't want 1 failure to stop 99 files downloading)
			logger.error({ error, documentId: doc.id }, 'Failed to fetch blob for zip archiving');
		}
	}

	await archive.finalize();

	return zipFileName;
}

/**
 * Streams document from azure blob to the res object,
 * setting the appropriate headers
 */
async function streamDocumentToResponse(
	res: Response,
	blobStore: BlobStorageClient | null,
	document: { id: string; blobName: string; fileName: string },
	isPreview: boolean,
	logger: Logger
) {
	const { blobName, id: documentId, fileName } = document;

	try {
		const downloadResponse = await blobStore?.downloadBlob(blobName);
		const downloadStream = downloadResponse?.readableStreamBody;

		if (!downloadStream) {
			throw new Error('No stream received from blob store');
		}

		setDownloadHeaders(res, {
			fileName,
			contentType: downloadResponse.contentType,
			contentLength: downloadResponse.contentLength,
			isPreview
		});

		downloadStream.on('error', (err) => {
			const isAbort = err?.name === 'AbortError';
			const logFn = isAbort ? logger.debug.bind(logger) : logger.error.bind(logger);

			logFn({ documentId, err }, isAbort ? 'File download cancelled' : 'File download stream error');

			res.destroy(err);
		});

		downloadStream.pipe(res);
	} catch (error) {
		logger.error({ error, blobName }, `Error initiating download for: ${blobName}`);
		throw new Error('Failed to download file from blob store');
	}
}

interface HeaderOptions {
	fileName: string;
	contentType?: string;
	contentLength?: number;
	isPreview: boolean;
}

/**
 * Download headers vary from whether we are previewing the doc,
 * i.e. opening in browser or hard downloading it.
 *
 * Uses filename* with encoded name to make sure its safely encoded
 * but some browsers don't support that so we have regular filename=
 * as fallback.
 */
function setDownloadHeaders(res: Response, options: HeaderOptions) {
	const { fileName, contentType, contentLength, isPreview } = options;
	const encodedFilename = encodeURIComponent(fileName);

	res.setHeader('Content-Type', contentType || 'application/octet-stream');

	if (contentLength) {
		res.setHeader('Content-Length', contentLength);
	}

	// 'inline' = Open in Browser (Preview)
	// 'attachment' = Force Download
	const disposition = isPreview ? 'inline' : 'attachment';

	res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"; filename*=UTF-8''${encodedFilename}`);
}
