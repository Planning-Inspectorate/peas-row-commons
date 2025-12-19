import { formatBytes } from '@pins/peas-row-commons-lib/util/upload.ts';
import { Readable } from 'stream';
import type { Request, Response } from 'express';
import type { ManageService } from '#service';
import type { Logger } from 'pino';
import type { BlobStorageClient } from '@pins/peas-row-commons-lib/blob-store/blob-store-client.ts';
import { randomUUID } from 'crypto';
import type { PrismaClient, Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';

/**
 * Controller for uploading a new document to Azure Blob,
 * stored in Azure under a UUID at the case id endpoint
 * then creates a draft document row ready for final committing.
 */
export function uploadDocumentsController(service: ManageService) {
	return async (req: Request, res: Response) => {
		const { blobStore, logger, db } = service;
		const { id, folderId } = req.params;
		const files = req.files as Express.Multer.File[];

		const filesWithIds = files.map((file) => ({
			file,
			originalName: getSanitizedFileName(file),
			blobName: `${id}/${randomUUID()}` // We use a UUID here because it's more consistent and to avoid orphaned files blocking
		}));

		await uploadFilesToStorage(blobStore, filesWithIds, logger);
		const insertedDocuments = await createDraftDocumentsScratchPad(req, db, filesWithIds, id, folderId);

		// Although code is built to handle many files,
		// the component only ever triggers one at a time.
		// So take first file in array.
		const uploadedFile = insertedDocuments[0];
		const fileName = uploadedFile.fileName;

		// Original file accessed for size (rather than having to parse BigInt from DB row)
		const originalFile = files[0];

		return res.json({
			file: {
				id: uploadedFile.id,
				originalname: fileName,
				filename: uploadedFile.id,
				path: uploadedFile.blobName,
				size: originalFile.size
			},
			success: {
				messageHtml: `<span class="moj-multi-file-upload__filename">${fileName} (${formatBytes(originalFile.size)})</span>`
			}
		});
	};
}

function getSanitizedFileName(file: Express.Multer.File): string {
	return Buffer.from(file.originalname, 'latin1').toString('utf8');
}

async function uploadFilesToStorage(
	blobStore: BlobStorageClient | null,
	filesWithIds: { file: Express.Multer.File; blobName: string }[],
	logger: Logger
): Promise<void> {
	for (const item of filesWithIds) {
		try {
			await blobStore?.uploadStream(Readable.from(item.file.buffer), item.file.mimetype, item.blobName);
		} catch (error) {
			logger.error({ error }, `Error uploading file: ${item.blobName}`);
			throw new Error(`Failed to upload file`);
		}
	}
}

/**
 * Inserts uploaded files into draft documents table,
 * in case they decide to abandon before finishing.
 */
async function createDraftDocumentsScratchPad(
	req: Request,
	db: PrismaClient,
	filesWithIds: { file: Express.Multer.File; blobName: string; originalName: string }[],
	id: string,
	folderId: string
): Promise<Prisma.DraftDocumentModel[]> {
	const operations = filesWithIds.map((file) =>
		db.draftDocument.create({
			data: {
				sessionKey: req.sessionID,
				caseId: id,
				folderId: folderId,
				fileName: file.originalName,
				blobName: file.blobName,
				size: BigInt(file.file.size)
			}
		})
	);
	// We use a transaction with many singular creates because
	// we want the generated ids to be returned.
	return await db.$transaction(operations);
}
