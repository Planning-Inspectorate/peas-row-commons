import { ManageService } from '#service';
import type { Request, RequestHandler, Response } from 'express';
import { buildFolderTree } from '../../case-folders/folder-utils.ts';
import { JOURNEY_ID } from './journey.ts';
import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import { stringToKebab } from '@pins/peas-row-commons-lib/util/strings.ts';
import type { Logger } from 'pino';
import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';

/**
 * Creates the middleware that fetches the case + folders from the DB
 * and attaches them to res.locals so the Question can see them.
 */
export function buildLoadCaseData(service: ManageService): RequestHandler {
	const { db } = service;
	return async (req, res, next) => {
		const { id } = req.params;

		if (!id) {
			throw new Error('id is required');
		}

		const caseData = await db.case.findUnique({
			where: { id },
			include: {
				Folders: {
					where: { deletedAt: null },
					orderBy: [{ displayOrder: 'asc' }, { displayName: 'asc' }]
				}
			}
		});

		if (!caseData) {
			return next(new Error('Case not found'));
		}

		const folderStructure = buildFolderTree(caseData.Folders);

		(req as any).folderStructure = folderStructure;

		next();
	};
}

/**
 * Grabs the important data, files to move and the folder to move
 * them to. Errors, clears session, redirects if any issues are found.
 */
export function validateRequestState(req: Request, res: Response, caseId: string, journeyId: string, logger: Logger) {
	const journeyResponse = res.locals?.journeyResponse;
	const fileIds = req.session.moveFilesIds;

	if (!journeyResponse) {
		throw new Error('Valid journey response and answers object required');
	}

	if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
		logger.warn({ caseId }, 'No file Ids found in session during save');

		// Wipe current data from journey if it got corrupted
		clearDataFromSession({ req, journeyId });

		return res.redirect(`/cases/${caseId}/case-folders`);
	}

	const { fileLocation } = journeyResponse.answers;

	if (!fileLocation) {
		throw new Error('No destination folder selected');
	}

	return { fileIds, destinationFolderId: fileLocation };
}

/**
 * Moves files to new folder, checks that the folder in questino
 * is in the case of the current folder / documents to avoid cross
 * case contamination.
 */
export async function moveFilesTransaction(
	tx: Prisma.TransactionClient,
	caseId: string,
	destinationFolderId: string,
	fileIds: string[],
	logger: Logger
) {
	const targetFolder = await tx.folder.findUnique({
		where: { id: destinationFolderId, deletedAt: null }
	});

	if (!targetFolder) {
		throw new Error(`Target folder ${destinationFolderId} not found`);
	}

	if (targetFolder.caseId !== caseId) {
		logger.error(
			{
				targetFolderCaseId: targetFolder.caseId,
				requestCaseId: caseId
			},
			'Attempted to move files to a folder in a different case'
		);

		throw new Error('Target folder does not belong to the current case');
	}

	const result = await tx.document.updateMany({
		where: {
			id: { in: fileIds },
			caseId: caseId
		},
		data: {
			folderId: destinationFolderId
		}
	});

	logger.info(
		{
			count: result.count,
			destinationFolderId,
			caseId
		},
		'Moved documents to new folder'
	);
}

/**
 * Controller for saving the new folder to the documents. Redirects to the new folder.
 */
export function buildSaveController({ db, logger }: ManageService): RequestHandler {
	return async (req, res) => {
		const { id } = req.params;

		const state = validateRequestState(req, res, id, JOURNEY_ID, logger);
		if (!state) return;

		const { fileIds, destinationFolderId } = state;

		let destinationFolder;
		try {
			destinationFolder = await db.$transaction(async ($tx) => {
				await moveFilesTransaction($tx, id, destinationFolderId, fileIds, logger);

				return await $tx.folder.findUnique({
					where: { id: destinationFolderId },
					select: { id: true, displayName: true }
				});
			});

			// Will show the success banner once we have redirected to the new folder page.
			addSessionData(req, destinationFolderId, { filesMoved: true }, 'folder');

			delete req.session.moveFilesIds;
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'moving documents',
				logParams: { caseId: id, destinationFolderId }
			});
		}

		if (!destinationFolder) {
			return notFoundHandler(req, res);
		}

		clearDataFromSession({
			req,
			journeyId: JOURNEY_ID
		});

		const { displayName } = destinationFolder;

		res.redirect(`/cases/${id}/case-folders/${destinationFolderId}/${stringToKebab(displayName)}`);
	};
}
