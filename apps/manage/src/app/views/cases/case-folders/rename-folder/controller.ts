import type { ManageService } from '#service';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { addSessionData, clearSessionData, readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { Request } from 'express';

/**
 * Controller to render the Rename Folder view (get)
 */
export function buildRenameFolderView(service: ManageService): AsyncRequestHandler {
	const { db } = service;
	return async (req, res, next) => {
		const { id, folderId } = req.params;

		if (!id) {
			throw new Error('id param required');
		}

		if (!folderId) {
			throw new Error('folderId param required');
		}

		let folder;

		try {
			folder = await db.folder.findUnique({
				select: {
					displayName: true
				},
				where: {
					id: folderId,
					deletedAt: null
				}
			});
		} catch (error) {
			if (next) next(error);
		}

		if (!folder) return notFoundHandler(req, res);

		const errorSummary = getSessionErrors(req, id);
		const returnUrl = req.baseUrl.replace(/\/rename-folder\/?$/, '');

		return res.render('views/cases/case-folders/rename-folder/view.njk', {
			backLinkUrl: returnUrl,
			errorSummary,
			currentFolderName: folder.displayName
		});
	};
}

/**
 * Controller to handle the folder renaming logic (post)
 */
export function buildRenameFolder(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;

	return async (req, res) => {
		try {
			const { folderId } = req.params;

			if (!folderId) {
				throw new Error('folder id param required');
			}

			const { folderName } = req.body;

			await renameFolderRecord(db, {
				name: folderName,
				folderId
			});

			addSessionData(req, folderId, { renamed: true }, 'folder');

			const returnUrl = req.baseUrl.replace(/\/rename-folder\/?$/, '');

			return res.redirect(returnUrl);
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'renaming folder',
				logParams: {}
			});
		}
	};
}

/**
 * Retrieves and clears folder renaming errors from the session
 */
export function getSessionErrors(req: Request, id: string) {
	const renamingErrors = readSessionData(req, id, 'createFolderErrors', [], 'folders');
	clearSessionData(req, id, 'createFolderErrors', 'folders');
	return typeof renamingErrors !== 'boolean' && renamingErrors.length ? renamingErrors : null;
}

/**
 * Saves folder rename to Db
 */
export async function renameFolderRecord(
	db: PrismaClient,
	params: {
		name: string;
		folderId: string;
	}
) {
	await db.folder.update({
		where: {
			id: params.folderId
		},
		data: {
			displayName: params.name
		}
	});
}
