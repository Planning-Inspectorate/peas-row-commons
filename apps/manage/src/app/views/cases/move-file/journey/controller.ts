import { ManageService } from '#service';
import type { Request, RequestHandler, Response } from 'express';
import { buildFolderTree } from '../../case-folders/folder-utils.ts';
import { JOURNEY_ID } from './journey.ts';
import { clearDataFromSession, list } from '@planning-inspectorate/dynamic-forms';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import { stringToKebab } from '@pins/peas-row-commons-lib/util/strings.ts';
import type { Logger } from 'pino';
import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { AUDIT_ACTIONS } from '../../../../audit/index.ts';
import { checkFileNamesConflict } from '../../upload/upload-documents/file-duplicate-validation.ts';
import type { ValidationError } from '../../upload/upload-documents/validation-middleware.ts';
import { getStringParam, getStringParams } from '@pins/peas-row-commons-lib/util/params.ts';

const documentFindManySelectArg = {
	id: true,
	fileName: true,
	Folder: { select: { displayName: true } }
} as const satisfies Prisma.DocumentSelect;

/**
 * Creates the middleware that fetches the case + folders from the DB
 * and attaches them to res.locals so the Question can see them.
 */
export function buildLoadCaseData(service: ManageService): RequestHandler {
	const { db } = service;
	return async (req, res, next) => {
		const id = getStringParam(req.params, 'id');

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

		(req as any).folderStructure = buildFolderTree(caseData.Folders);

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

export function buildListController(listFn = list): RequestHandler {
	return async (req: Request, res: Response) => {
		await listFn(req, res, '', {
			backLinkUrl: `${req.baseUrl}/folder/file-location`,
			pageHeading: 'Check details and update file location',
			cancelUrl: req.baseUrl.split('/move-files')[0] // we want to go all the way back to the folder page
		});
	};
}

/**
 * Controller for saving the new folder to the documents. Redirects to the new folder.
 */
export function buildSaveController({ db, logger, audit }: ManageService): RequestHandler {
	return async (req, res) => {
		const { id, folderId, folderName } = getStringParams(req.params, ['id', 'folderId', 'folderName']);

		const state = validateRequestState(req, res, id, JOURNEY_ID, logger);
		if (!state) return;

		const { fileIds, destinationFolderId } = state;

		// 1. Fetch documents and destination folder
		const [documentsBeforeMove, destinationFolder] = await Promise.all([
			db.document.findMany({
				where: { id: { in: fileIds } },
				select: documentFindManySelectArg
			}),
			db.folder.findUnique({
				where: { id: destinationFolderId },
				include: {
					Documents: {
						where: { deletedAt: null },
						select: { fileName: true }
					}
				}
			})
		]);

		// 2. Validate destination folder exists and belongs to case
		if (!destinationFolder) {
			throw new Error(`Target folder ${destinationFolderId} not found`);
		}

		if (destinationFolder.caseId !== id) {
			logger.error(
				{ targetFolderCaseId: destinationFolder.caseId, requestCaseId: id },
				'Attempted to move files to a folder in a different case'
			);
			throw new Error('Target folder does not belong to the current case');
		}
		// 3. Check for file name conflicts in the destination folder
		const existingFileNames = new Set(destinationFolder.Documents.map((doc) => doc.fileName));
		const fileNames = documentsBeforeMove.map((doc) => doc.fileName);
		const nameConflicts: ValidationError[] | null =
			checkFileNamesConflict(fileNames, existingFileNames)?.map((error) => ({ ...error, href: '#' })) ?? null; // TODO: HRP-295 Once we update the file list page we could link to the document?
		if (nameConflicts && nameConflicts.length > 0) {
			addSessionData(req, id, { moveFileErrors: nameConflicts }, 'move-files');

			return res.redirect(`/cases/${id}/case-folders/${folderId}/${folderName}/move-files`);
		}

		try {
			await db.$transaction(async ($tx) => {
				await moveFilesTransaction($tx, id, destinationFolderId, fileIds, logger);
			});

			const auditEntries = documentsBeforeMove.map((doc) => ({
				caseId: id,
				action: AUDIT_ACTIONS.FILE_MOVED,
				userId: req?.session?.account?.localAccountId,
				metadata: {
					fileName: doc.fileName,
					oldFolderName: doc.Folder?.displayName ?? '-',
					folderName: destinationFolder?.displayName ?? '-'
				}
			}));

			await audit.recordMany(auditEntries);

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

		const { displayName } = destinationFolder;
		if (!displayName) {
			return notFoundHandler(req, res);
		}

		clearDataFromSession({
			req,
			journeyId: JOURNEY_ID
		});

		res.redirect(`/cases/${id}/case-folders/${destinationFolderId}/${stringToKebab(displayName)}`);
	};
}
