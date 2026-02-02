import type { ManageService } from '#service';
import { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { addSessionData, clearSessionData, readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { stringToKebab } from '@pins/peas-row-commons-lib/util/strings.ts';
import type { Request, Response } from 'express';

/**
 * Grabs folder and meta data for displaying,
 * used inside of the main view but also when
 * re-rendering after an error with POST-ing
 */
async function getFolderContext(db: PrismaClient, folderId: string) {
	const folder = await db.folder.findUnique({
		select: {
			id: true,
			displayName: true,
			caseId: true,
			ParentFolder: {
				select: {
					id: true,
					displayName: true
				}
			}
		},
		where: { id: folderId }
	});

	if (!folder) {
		throw new Error(`No folder found for id: ${folderId}`);
	}

	const backLinkUrl = `/cases/${folder.caseId}/case-folders/${folder.id}/${stringToKebab(folder.displayName)}`;

	const currentUrl = `${backLinkUrl}/delete-folder`;

	return { folder, backLinkUrl, currentUrl };
}

/**
 * Renders the page that asks for confirmation, used on load and if an
 * error occurs during POST-ing
 */
function renderConfirmationView(res: Response, context: any, errorSummary?: any[] | null) {
	if (errorSummary) {
		res.locals.errorSummary = errorSummary;
	}

	return res.render('views/cases/case-folders/delete-folder/view.njk', {
		pageHeading: 'Delete folder',
		backLinkUrl: context.backLinkUrl,
		folders: context.folder ? [context.folder] : [],
		currentUrl: context.currentUrl
	});
}

export function buildDeleteFolderView(service: ManageService) {
	const { db, logger } = service;

	return async (req: Request, res: Response) => {
		const { folderId, id } = req.params;

		if (!folderId) {
			throw new Error('folderId param required');
		}

		try {
			const context = await getFolderContext(db, folderId);

			const errorSummary = getSessionErrors(req, id);

			return renderConfirmationView(res, context, errorSummary);
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching folder',
				logParams: { folderId }
			});
			throw error;
		}
	};
}

export function buildDeleteFolderController(service: ManageService) {
	const { db, logger } = service;

	return async (req: Request, res: Response) => {
		const { id, folderId } = req.params;

		if (!folderId) throw new Error('folderId param required');

		const context = await getFolderContext(db, folderId);

		try {
			await db.folder.update({
				where: { id: folderId },
				data: {
					deletedAt: new Date()
				}
			});

			// We add it with the id of the 'case' but not the folder, because we
			// need to check this from outside of the folder's page (its parent)
			addSessionData(req, id, { deleted: true }, 'folder');

			const returnUrl = getRedirectUrl(context.folder);

			return res.redirect(returnUrl);
		} catch (error) {
			logger.error({ error, folderId }, 'Failed to delete folder');

			const errorMessage = [{ text: 'Failed to delete folder, please try again.', href: '#folder' }];

			return renderConfirmationView(res, context, errorMessage);
		}
	};
}

/**
 * Generates a redirect url based on whether we are inside of a folder
 * or on the base overview page.
 */
export function getRedirectUrl(folder: any) {
	const baseUrl = `/cases/${folder.caseId}/case-folders`;

	if (folder.ParentFolder && folder.ParentFolder.displayName) {
		return `${baseUrl}/${folder.ParentFolder.id}/${stringToKebab(folder.ParentFolder.displayName)}`;
	}

	return baseUrl;
}

/**
 * Retrieves and clears folder deletion errors from the session
 */
export function getSessionErrors(req: Request, id: string) {
	const deleteErrors = readSessionData(req, id, 'deleteFolderErrors', [], 'folders');
	clearSessionData(req, id, 'deleteFolderErrors', 'folders');
	return typeof deleteErrors !== 'boolean' && deleteErrors.length ? deleteErrors : null;
}
