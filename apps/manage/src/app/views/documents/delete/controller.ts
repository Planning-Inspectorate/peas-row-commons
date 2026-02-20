import type { ManageService } from '#service';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import type { Request, Response } from 'express';

/**
 * Grabs document and meta data for displaying,
 * used inside of the main view but also when
 * re-rendering after an error with POST-ing
 */
async function getDocumentContext(db: any, documentId: string, req: Request) {
	const document = await db.document.findUnique({
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

	if (!document) {
		throw new Error(`No document found for id: ${documentId}`);
	}

	// We no longer generate these from the folder id and case id because this
	// controller is used in a couple routes and the backlink and currenUrl
	// need to be dynamic for where they are called
	const backLinkUrl = req.originalUrl.replace(`/${documentId}/delete`, '');
	const currentUrl = req.originalUrl.split('?')[0];

	return { document, backLinkUrl, currentUrl };
}

/**
 * Renders the page that asks for confirmation, used on load and if an
 * error occurs during POST-ing
 */
function renderConfirmationView(res: Response, context: any, errorSummary?: any[]) {
	if (errorSummary) {
		res.locals.errorSummary = errorSummary;
	}

	return res.render('views/cases/case-folders/case-folder/delete-file/confirmation.njk', {
		pageHeading: 'Delete file',
		backLinkUrl: context.backLinkUrl,
		documents: context.document ? [context.document] : [],
		currentUrl: context.currentUrl
	});
}

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

		try {
			const context = await getDocumentContext(db, documentId, req);

			// If we have already deleted this document then simply show success
			if (context.document.deletedAt) {
				// If we are returning to 'search-results' rather than 'folder'
				// make sure this is reflected in messaging.
				const returnMessage = context.backLinkUrl.includes('search-results') ? 'search results' : 'folder';

				return res.render('views/cases/case-folders/case-folder/delete-file/success.njk', {
					pageHeading: 'You have deleted the file',
					folderUrl: context.backLinkUrl,
					returnMessage
				});
			}

			// Otherwise show the confirmation screen
			return renderConfirmationView(res, context);
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching document',
				logParams: { documentId }
			});
			throw error;
		}
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

			const errorMessage = [{ text: 'Failed to delete document, please try again.' }];

			try {
				const context = await getDocumentContext(db, documentId, req);
				return renderConfirmationView(res, context, errorMessage);
			} catch (fetchError) {
				logger.error({ fetchError }, 'Failed to refetch document for error view');

				return renderConfirmationView(
					res,
					{
						document: null,
						backLinkUrl: '/',
						currentUrl: '/'
					},
					errorMessage
				);
			}
		}
	};
}
