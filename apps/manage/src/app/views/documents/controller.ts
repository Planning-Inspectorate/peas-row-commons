import type { Request, Response } from 'express';
import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Logger } from 'pino';
import type { BlobStorageClient } from '@pins/peas-row-commons-lib/blob-store/blob-store-client.ts';

/**
 * Builds the download document controller, fetches document from SQL, grabs blob from azure,
 * streams back to user.
 */
export function buildDownloadDocument(service: ManageService): AsyncRequestHandler {
	const { db, logger, blobStore } = service;

	return async (req: Request, res: Response) => {
		const { documentId } = req.params;
		const isPreview = req.query.preview === 'true';

		if (!documentId) {
			throw new Error('documentId param required');
		}

		const document = await fetchDocumentMetadata(db, documentId, logger);

		if (!document) return;

		await streamDocumentToResponse(res, blobStore, document, isPreview, logger);
	};
}

/**
 * Grabs the document requested
 */
async function fetchDocumentMetadata(db: PrismaClient, documentId: string, logger: Logger) {
	try {
		const document = await db.document.findUnique({
			where: { id: documentId }
		});

		if (!document) {
			throw new Error(`No document found for id: ${documentId}`);
		}

		return document;
	} catch (error: any) {
		wrapPrismaError({
			error,
			logger,
			message: 'fetching document',
			logParams: { documentId }
		});
	}
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

		downloadStream.on('error', (err: any) => {
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
