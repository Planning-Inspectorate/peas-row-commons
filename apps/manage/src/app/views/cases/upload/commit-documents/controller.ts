import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { ManageService } from '#service';
import type { Request, Response } from 'express';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Logger } from 'pino';
import { NoUploadsError } from './error.ts';
import { AUDIT_ACTIONS } from '../../../../audit/index.ts';

/**
 * Creates the documents controller that is used when
 * "Committing" documents (i.e.) adding it firmly to the DB
 * from "Draft".
 */
export function createDocumentsController(service: ManageService) {
	const { db, logger, audit } = service;
	return async (req: Request, res: Response) => {
		try {
			const { id, folderId } = req.params;

			if (!id || !folderId) {
				throw new Error('Missing required parameters: id or folderId');
			}

			const { createdLength, fileNames } = await createDocumentsFromDrafts(req, db, logger, id, folderId);

			if (createdLength === 0) {
				throw new NoUploadsError('Select a file to upload');
			}

			logger.info({ id, folderId }, `Created ${createdLength} documents`);

			// Audit the upload at commit time rather than during individual
			// file uploads, so we can accurately determine single vs bulk
			// and avoid auditing files that were removed before committing.
			const folder = await db.folder.findUnique({
				where: { id: folderId },
				select: { displayName: true }
			});

			const folderName = folder?.displayName ?? folderId;

			if (createdLength === 1) {
				await audit.record({
					caseId: id,
					action: AUDIT_ACTIONS.FILE_UPLOADED,
					userId: req?.session?.account?.localAccountId,
					metadata: {
						fileName: fileNames[0],
						folderName
					}
				});
			} else {
				await audit.record({
					caseId: id,
					action: AUDIT_ACTIONS.FILES_UPLOADED,
					userId: req?.session?.account?.localAccountId,
					metadata: {
						files: fileNames,
						folderName
					}
				});
			}

			addSessionData(req, folderId, { updated: true }, 'folder');

			const folderUrl = req.baseUrl.replace(/\/upload\/?$/, '');
			return res.redirect(folderUrl);
		} catch (error) {
			logger.error({ error, caseId: req.params.id }, 'Failed to create documents from drafts');

			const errorMessage =
				error instanceof NoUploadsError
					? error.message
					: 'There was a problem saving your documents. Please try again.';

			addSessionData(
				req,
				req.params.id,
				{
					uploadErrors: [
						{
							text: errorMessage,
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
): Promise<{ createdLength: number; fileNames: string[] }> {
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
			return { createdLength: 0, fileNames: [] };
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

		const fileNames = drafts.map((draft) => draft.fileName);

		logger.info({ caseId, count: drafts.length }, 'Documents successfully committed to DB');

		return { createdLength: drafts.length, fileNames };
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
