import type { ManageService } from '#service';
import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function buildValidateDeleteFolder(service: ManageService, setSessionData = addSessionData): RequestHandler {
	const { db, logger } = service;

	return async (req: Request, res: Response, next: NextFunction) => {
		const { folderId, id } = req.params;

		if (!folderId) return next();

		const errors: Record<string, { html: string; href: string }> = {};

		try {
			const folder = await db.folder.findUnique({
				where: { id: folderId },
				select: {
					_count: {
						select: {
							ChildFolders: {
								where: { deletedAt: null }
							},
							Documents: {
								where: { deletedAt: null }
							}
						}
					}
				}
			});

			if (folder) {
				const hasSubFolders = folder._count.ChildFolders > 0;
				const hasDocuments = folder._count.Documents > 0;

				const errorHtml = createErrorHtml(hasSubFolders, hasDocuments);

				if (hasSubFolders || hasDocuments) {
					errors.folderBlocker = {
						html: errorHtml,
						href: '#'
					};
				}
			}
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'validating folder deletion',
				logParams: { folderId }
			});

			return next(error);
		}

		if (Object.keys(errors).length > 0) {
			setSessionData(
				req,
				id,
				{
					deleteFolderErrors: Object.values(errors)
				},
				'folders'
			);

			return res.redirect(req.originalUrl);
		}

		next();
	};
}

export function createErrorHtml(hasSubFolders: boolean, hasDocuments: boolean) {
	let errorListItems = '';
	if (hasSubFolders) errorListItems += '<li>It contains subfolders</li>';
	if (hasDocuments) errorListItems += '<li>It contains documents</li>';

	const errorHtml = `
        <span class="govuk-!-font-weight-bold govuk-!-display-block">This folder cannot be deleted</span>
        <span class="govuk-!-font-weight-bold govuk-!-display-block govuk-!-margin-top-2">${hasSubFolders && hasDocuments ? '2 issues' : '1 issue'} identified</span>
        <ul class="govuk-list--bullet govuk-!-margin-top-2">
            ${errorListItems}
        </ul>
    `;

	return errorHtml;
}
