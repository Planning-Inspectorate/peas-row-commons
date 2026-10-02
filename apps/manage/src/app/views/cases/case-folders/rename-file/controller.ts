import type { ManageService } from '#service';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { getStringParams } from '@pins/peas-row-commons-lib/util/params.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { AsyncRequestHandler, AsyncRequestHandlerWithBody } from '@planning-inspectorate/core/util';
import { addSessionData, clearSessionData, readSessionData, wrapPrismaError } from '@planning-inspectorate/core/util';
import type { Request } from 'express';
import { AUDIT_ACTIONS } from '../../../../audit/index.ts';

/**
 * Controller to render the Rename File view (get)
 */
export function buildRenameFileView(service: ManageService): AsyncRequestHandler {
	const { db } = service;
	return async (req, res, next) => {
		const { id: caseId, folderId, fileId } = getStringParams(req.params, ['id', 'folderId', 'fileId']);

		let file;

		try {
			file = await db.document.findUnique({
				select: {
					fileName: true
				},
				where: {
					id: fileId,
					caseId,
					folderId,
					deletedAt: null
				}
			});
		} catch (error) {
			if (next) next(error);
		}

		if (!file) return notFoundHandler(req, res);

		const errorSummary = getSessionErrors(req, caseId);
		const erroredFileName = getErroredFileName(req, caseId);

		const returnUrl = req.baseUrl.replace(/\/[^/]+\/rename-file\/?$/, '');
		const [fileName, fileExtension] = file.fileName.split(/(?=\.[^.]+$)/);

		return res.render('views/cases/case-folders/rename-file/view.njk', {
			backLinkUrl: returnUrl,
			errorSummary,
			currentFileName: erroredFileName ?? fileName,
			fileExtension
		});
	};
}

/**
 * Controller to handle the file renaming logic (post)
 */
export function buildRenameFile(service: ManageService): AsyncRequestHandlerWithBody<{ fileName: string }> {
	const { db, logger, audit } = service;

	return async (req, res) => {
		const { id: caseId, folderId, fileId } = getStringParams(req.params, ['id', 'folderId', 'fileId']);

		try {
			const fileName = String(req.body.fileName).trim();

			// Fetch old name before renaming
			const existingFile = await db.document.findUnique({
				where: {
					id: fileId,
					caseId,
					folderId,
					deletedAt: null
				},
				select: { fileName: true }
			});

			if (!existingFile) {
				throw new Error('File not found');
			}

			const fileExtension = existingFile.fileName.split('.').pop();
			if (!fileExtension) {
				throw new Error('No file extension');
			}

			const newFileName = fileName.concat(`.${fileExtension}`);

			const returnUrl = req.baseUrl.replace(/\/[^/]+\/rename-file\/?$/, '');

			if (existingFile.fileName === newFileName) {
				// If the new name is the same as the old name, redirect without making changes
				return res.redirect(returnUrl);
			}

			await renameFileRecord(db, {
				name: newFileName,
				fileId
			});

			await audit.record({
				caseId,
				action: AUDIT_ACTIONS.FILE_RENAMED,
				userId: req?.session?.account?.localAccountId,
				metadata: {
					oldFileName: existingFile.fileName,
					fileName: newFileName
				}
			});

			addSessionData(req, folderId, { fileRenamed: true, renamedFileName: newFileName }, 'folder');

			return res.redirect(returnUrl);
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'renaming file',
				logParams: {}
			});
		}
	};
}

/**
 * Retrieves and clears file renaming errors from the session
 */
export function getSessionErrors(req: Request, id: string) {
	const renamingErrors = readSessionData(req, id, 'renameFileErrors', [], 'files');
	clearSessionData(req, id, 'renameFileErrors', 'files');
	return typeof renamingErrors !== 'boolean' && renamingErrors.length ? renamingErrors : null;
}

/**
 * Finds the attempted new file name that errored, for retaining in the input.
 */
export function getErroredFileName(req: Request, id: string) {
	const fileNameAttempt = readSessionData(req, id, 'erroredFileName', null, 'files');
	clearSessionData(req, id, 'erroredFileName', 'files');
	return fileNameAttempt;
}

/**
 * Saves file rename to Db
 */
export async function renameFileRecord(
	db: PrismaClient,
	params: {
		name: string;
		fileId: string;
	}
) {
	await db.document.update({
		where: {
			id: params.fileId
		},
		data: {
			fileName: params.name
		}
	});
}
