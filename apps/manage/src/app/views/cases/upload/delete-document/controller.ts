import type { Request, Response } from 'express';
import type { ManageService } from '#service';

export function deleteDocumentController(service: ManageService) {
	return async (req: Request, res: Response) => {
		const { logger } = service;
		const documentId = req.body.delete;

		if (!documentId || typeof documentId !== 'string') {
			throw new Error('documentId required');
		}

		try {
			await deleteDraftDocument(service, documentId, req.sessionID);
			return res.json({ success: true });
		} catch (error) {
			logger.error({ error, documentId }, 'Fatal error deleting document');
			return res.status(500).json({ error: 'Failed to delete file' });
		}
	};
}

/**
 * Deletes a draft document row based on id, and then
 * deletes the related azure blob. In that order to avoid
 * issues with blobs getting deleted but document rows
 * failing.
 */
async function deleteDraftDocument(service: ManageService, documentId: string, sessionKey: string): Promise<void> {
	const { db, logger } = service;

	const draft = await db.draftDocument.findFirst({
		where: { id: documentId, sessionKey }
	});

	if (!draft) {
		logger.warn({ documentId }, 'No draft row found for given id.');
		return;
	}

	await db.draftDocument.delete({
		where: { id: documentId }
	});

	if (draft.blobName) {
		await safelyDeleteBlob(service, draft.blobName);
	}
}

/**
 * Attempts to delete a blob from azure
 */
async function safelyDeleteBlob(service: ManageService, blobName: string): Promise<void> {
	const { blobStore, logger } = service;

	try {
		const response = await blobStore?.deleteBlobIfExists(blobName);
		if (response?.succeeded) {
			logger.info({ blobName }, 'Successfully deleted blob');
		}
	} catch (error) {
		logger.error({ error, blobName }, 'Failed to delete blob');
	}
}
