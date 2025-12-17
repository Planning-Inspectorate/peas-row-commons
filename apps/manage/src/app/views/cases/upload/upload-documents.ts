import { encodeBlobNameToBase64, formatBytes } from '@pins/peas-row-commons-lib/util/upload.ts';
import { Readable } from 'stream';
import type { Request, Response } from 'express';
import type { ManageService } from '#service';
import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { Logger } from 'pino';
import type { BlobStorageClient } from '@pins/peas-row-commons-lib/blob-store/blob-store-client.ts';
import type { SessionUploadedFile } from './types.ts';
import { randomUUID } from 'crypto';

export function uploadDocumentsController(service: ManageService) {
	return async (req: Request, res: Response) => {
		const { blobStore, logger } = service;
		const { id } = req.params;
		const files = req.files as Express.Multer.File[];

		const filesWithIds = files.map((file) => ({
			file,
			originalName: getSanitizedFileName(file),
			blobName: `${id}/${randomUUID()}` // We use a UUID here because it's more consistent and to avoid orphaned files blocking
		}));

		await uploadFilesToStorage(blobStore, filesWithIds, logger);
		updateSessionWithUploads(req, filesWithIds, id);

		// Although code is built to handle many files,
		// the component only ever triggers one at a time.
		// So take first file in array.
		const uploadedFile = files[0];
		const fileName = uploadedFile.originalname;
		return res.json({
			file: {
				id: fileName,
				originalname: fileName,
				filename: fileName,
				path: uploadedFile.path,
				size: uploadedFile.size
			},
			success: {
				messageHtml: `<span class="moj-multi-file-upload__filename">${fileName} (${formatBytes(uploadedFile.size)})</span>`
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

function updateSessionWithUploads(
	req: Request,
	filesWithIds: { file: Express.Multer.File; blobName: string; originalName: string }[],
	containerPath: string
): void {
	const latestUploads: SessionUploadedFile[] = filesWithIds.map((item) => {
		return {
			fileName: item.originalName,
			size: item.file.size,
			formattedSize: formatBytes(item.file.size),
			blobName: item.blobName,
			blobNameBase64Encoded: encodeBlobNameToBase64(item.blobName)
		};
	});

	const existingUploads = req.session?.files?.[containerPath]?.uploadedFiles || [];

	const uploadedFiles = [...latestUploads, ...existingUploads];

	addSessionData(req, containerPath, { uploadedFiles }, 'files');
}
