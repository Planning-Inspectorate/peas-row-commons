import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { ManageService } from '#service';
import type { Request, Response } from 'express';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Logger } from 'pino';

/**
 * Creates the documents controller that is used when
 * "Committing" documents (i.e.) adding it firmly to the DB
 * from "Draft".
 */
export function createDocumentsController(service: ManageService) {
	const { db, logger } = service;
	return async (req: Request, res: Response) => {
		const { id, folderId } = req.params;

		if (!id || !folderId) {
			throw new Error('Missing required parameters: id or folderId');
		}

		try {
			const createdLength = await createDocumentsFromDrafts(req, db, logger, id, folderId);

			logger.info({ id, folderId }, `Created ${createdLength} documents`);

			addSessionData(req, folderId, { updated: true }, 'folder');

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
 * Commits DraftDocument rows to the database as Document rows.
 * Returns the count of created documents.
 */
export async function createDocumentsFromDrafts(
	req: Request,
	db: PrismaClient,
	logger: Logger,
	caseId: string,
	folderId: string
): Promise<number> {
	try {
		const drafts = await db.draftDocument.findMany({
			where: {
				sessionKey: req.sessionID,
				caseId: caseId,
				folderId: folderId
			}
		});

		if (!drafts || !drafts.length) {
			logger.info({ caseId }, 'No drafts to commit to DB');
			return 0;
		}

		const realDocumentsData = drafts.map((draft) => ({
			fileName: draft.fileName,
			blobName: draft.blobName,
			size: draft.size,
			caseId: caseId,
			folderId: folderId,
			mimeType: draft.mimeType
		}));

		// We need to create documents from drafts and delete the drafts in the same
		// transaction in case anything goes wrong.
		await db.$transaction([
			db.document.createMany({
				data: realDocumentsData
			}),
			db.draftDocument.deleteMany({
				where: {
					sessionKey: req.sessionID,
					caseId,
					folderId
				}
			})
		]);

		logger.info({ caseId, count: drafts.length }, 'Documents successfully committed to DB');

		return drafts.length;
	} catch (error: any) {
		wrapPrismaError({
			error,
			logger,
			message: 'Failed to create document rows from session',
			logParams: { caseId, folderId }
		});

		// If something goes wrong we specifically want to get caught in the parent
		// function so that we can ask them to try again.
		// We do not want to hard error as they might still be able to try
		// again (e.g. a timeout occurred)
		throw error;
	}
}
