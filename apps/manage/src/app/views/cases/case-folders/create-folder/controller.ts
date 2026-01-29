import type { ManageService } from '#service';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { clearSessionData, readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { stringToKebab } from '@pins/peas-row-commons-lib/util/strings.ts';
import type { Request } from 'express';

/**
 * Controller to render the Create Folder view (get)
 */
export function buildViewCreateFolders(): AsyncRequestHandler {
	return async (req, res, next) => {
		try {
			const id = req.params.id;

			if (!id) {
				throw new Error('id param required');
			}

			const errorSummary = getSessionErrors(req, id);
			const returnUrl = req.baseUrl.replace(/\/create-folder\/?$/, '');

			return res.render('views/cases/case-folders/create-folder/view.njk', {
				backLinkUrl: returnUrl,
				errorSummary
			});
		} catch (error) {
			if (next) next(error);
		}
	};
}

/**
 * Controller to handle the folder creation logic (post)
 */
export function buildCreateFolders(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;

	return async (req, res) => {
		try {
			const { id } = req.params;

			if (!id) {
				throw new Error('id param required');
			}

			const folderId = req.params?.folderId ?? null;
			const { folderName } = req.body;

			const parentFolder = await getParentFolder(db, folderId, id);

			if (folderId && !parentFolder) {
				return notFoundHandler(req, res);
			}

			const nextDisplayOrder = await getNextDisplayOrder(db, folderId);

			await createFolderRecord(db, {
				name: folderName,
				parentId: folderId,
				caseId: id,
				order: nextDisplayOrder
			});

			const returnUrl = getRedirectUrl(id, parentFolder, folderId);

			return res.redirect(returnUrl);
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'creating folders',
				logParams: {}
			});
		}
	};
}

/**
 * Retrieves and clears folder creation errors from the session
 */
export function getSessionErrors(req: Request, id: string) {
	const uploadErrors = readSessionData(req, id, 'createFolderErrors', [], 'folders');
	clearSessionData(req, id, 'createFolderErrors', 'folders');
	return typeof uploadErrors !== 'boolean' && uploadErrors.length ? uploadErrors : null;
}

/**
 * Verifies if a parent folder exists and belongs to the specified case
 */
export async function getParentFolder(db: any, folderId: string | null, caseId: string) {
	if (!folderId) return null;

	return db.folder.findUnique({
		where: { id: folderId, caseId },
		select: { displayName: true }
	});
}

/**
 * Calculates the next available display order for the new folder,
 * should be highested number in folder + 100.
 */
export async function getNextDisplayOrder(db: any, parentFolderId: string | null) {
	const aggregation = await db.folder.aggregate({
		where: {
			parentFolderId,
			deletedAt: null
		},
		_max: {
			displayOrder: true
		}
	});

	const currentMax = aggregation._max.displayOrder ?? 0;
	return currentMax + 100;
}

/**
 * Saves folder to Db
 */
export async function createFolderRecord(
	db: PrismaClient,
	params: {
		name: string;
		parentId: string | null;
		caseId: string;
		order: number;
	}
) {
	await db.folder.create({
		data: {
			displayName: params.name,
			parentFolderId: params.parentId,
			caseId: params.caseId,
			displayOrder: params.order,
			isCustom: true
		}
	});
}

/**
 * Generates the appropriate redirect URL based on folder hierarchy, i.e.
 * are we going back to the main page or going back to a folder.
 */
export function getRedirectUrl(caseId: string, parentFolder: { displayName: string } | null, folderId: string | null) {
	const baseUrl = `/cases/${caseId}/case-folders`;

	if (parentFolder && folderId) {
		return `${baseUrl}/${folderId}/${stringToKebab(parentFolder.displayName)}`;
	}

	return baseUrl;
}
