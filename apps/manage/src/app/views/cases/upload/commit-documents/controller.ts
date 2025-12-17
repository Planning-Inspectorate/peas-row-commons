import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { ManageService } from '#service';
import type { Request, Response } from 'express';
import { readSessionData, clearSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Logger } from 'pino';
import type { SessionUploadedFile } from '../types.ts';

export function createDocumentsController(service: ManageService) {
	const { db, logger } = service;
	return async (req: Request, res: Response) => {
		const { id, folderId } = req.params;

		if (!id || !folderId) {
			throw new Error('Missing required parameters: id or folderId');
		}

		try {
			const createdLength = await createDocumentsFromSession(req, db, logger, id, folderId);

			logger.info({ id, folderId }, `Created ${createdLength} documents`);

			const folderUrl = req.baseUrl.replace(/\/upload\/?$/, '');
			return res.redirect(folderUrl);
		} catch {
			addSessionData(
				req,
				id,
				{
					uploadErrors: [
						{
							text: 'There was a problem saving your documents. Please try again.',
							href: '#main-content'
						}
					]
				},
				'files'
			);

			// Redirect back to the upload page
			return res.redirect(req.originalUrl);
		}
	};
}

/**
 * Commits session files to the database as Document rows.
 * Returns the count of created documents.
 */
export async function createDocumentsFromSession(
	req: Request,
	db: PrismaClient,
	logger: Logger,
	caseId: string,
	folderId: string
): Promise<number> {
	const sessionKey = 'files';

	const sessionFiles = readSessionData(req, caseId, 'uploadedFiles', [], sessionKey);

	if (!sessionFiles || !Array.isArray(sessionFiles) || sessionFiles.length === 0) {
		return 0;
	}

	const documentsData = sessionFiles.map((file: SessionUploadedFile) => ({
		fileName: file.fileName,
		blobName: file.blobName,
		size: BigInt(file.size),
		caseId: caseId,
		folderId: folderId
	}));

	try {
		await db.$transaction(documentsData.map((doc) => db.document.create({ data: doc })));

		clearSessionData(req, caseId, 'uploadedFiles', sessionKey);

		logger.info({ caseId, count: documentsData.length }, 'Documents successfully committed to DB');
		return documentsData.length;
	} catch (error: any) {
		wrapPrismaError({
			error,
			logger,
			message: 'Failed to create document rows from session',
			logParams: { caseId, folderId }
		});

		// If something goes wrong we specifically want to get caught in the parent
		// function so that we can ask them to try again.
		// We do not want to hard error or clearSession as they might still be able to try
		// again (e.g. a timeout occurred)
		throw error;
	}
}
