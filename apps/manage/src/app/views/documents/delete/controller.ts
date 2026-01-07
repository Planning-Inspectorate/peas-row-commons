import type { ManageService } from '#service';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import type { Request, Response } from 'express';

/**
 * Builds the controller that confirms that the user wants to
 * "delete" the file (soft).
 *
 * If the document has already been deleted then we present
 * the view that says "success".
 */
export function buildDeleteFileView(service: ManageService) {
	const { db, logger } = service;

	return async (req: Request, res: Response) => {
		const { documentId } = req.params;

		if (!documentId) {
			throw new Error('documentId param required');
		}

		let document;
		try {
			document = await db.document.findUnique({
				select: {
					id: true,
					fileName: true,
					caseId: true,
					deletedAt: true,
					Folder: {
						select: {
							id: true,
							displayName: true
						}
					}
				},
				where: { id: documentId }
			});
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching document',
				logParams: { documentId }
			});
		}

		if (!document) {
			throw new Error(`No document found for id: ${documentId}`);
		}

		const backLinkUrl = `/cases/${document.caseId}/case-folders/${document.Folder.id}/${document.Folder.displayName}`;

		// If we have already deleted this document then simply show success
		if (document.deletedAt) {
			return res.render('views/cases/case-folders/case-folder/delete-file/success.njk', {
				pageHeading: 'You have deleted the file',
				folderUrl: backLinkUrl
			});
		}

		const currentUrl = `${backLinkUrl}/${documentId}/delete`;

		// Otherwise show the confirmation screen
		return res.render('views/cases/case-folders/case-folder/delete-file/confirmation.njk', {
			pageHeading: 'Delete file',
			backLinkUrl,
			documents: [document],
			currentUrl
		});
	};
}

/**
 * "Soft" deletes the document by setting the deletedAt date to now.
 *
 * If it errors then we present an error to the user and ask them to
 * try again.
 */
export function buildDeleteFileController(service: ManageService) {
	const { db, logger } = service;

	return async (req: Request, res: Response) => {
		const { documentId } = req.params;

		if (!documentId) throw new Error('documentId param required');

		try {
			await db.document.update({
				where: { id: documentId },
				data: {
					deletedAt: new Date()
				}
			});

			return res.redirect(req.originalUrl);
		} catch (error) {
			logger.error({ error, documentId }, 'Failed to delete document');

			let document;
			try {
				document = await db.document.findUnique({
					select: {
						id: true,
						fileName: true,
						caseId: true,
						Folder: {
							select: {
								id: true,
								displayName: true
							}
						}
					},
					where: { id: documentId }
				});
			} catch (fetchError) {
				logger.error({ fetchError }, 'Failed to refetch document for error view');
			}

			res.locals.errorSummary = [{ text: 'Failed to delete document, please try again.' }];

			const backLinkUrl = document
				? `/cases/${document.caseId}/case-folders/${document.Folder.id}/${document.Folder.displayName}`
				: '/';

			const currentUrl = document ? `${backLinkUrl}/${documentId}/delete` : '/';

			return res.render('views/cases/case-folders/case-folder/delete-file/confirmation.njk', {
				pageHeading: 'Delete file',
				documents: document ? [document] : [],
				currentUrl,
				backLinkUrl
			});
		}
	};
}
