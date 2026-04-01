import type { ManageService } from '#service';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import type { Request, Response } from 'express';
import { AUDIT_ACTIONS } from '../../../audit/actions.ts';
import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { Document } from '@pins/peas-row-commons-database/src/client/client.ts';

/**
 * Extracts document IDs from the request body.
 * Ensures we always return an array of strings.
 */
function extractDocumentIds(req: Request): string[] {
	const rawIds = req.body.selectedFiles;
	return (Array.isArray(rawIds) ? rawIds : [rawIds]).filter(Boolean);
}

/**
 * Grabs meta data for all documents to remove
 */
async function getDocumentsContext(db: any, documentIds: string[], req: Request) {
	const documents = await db.document.findMany({
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
		where: { id: { in: documentIds } }
	});

	if (!documents || !documents.length) {
		throw new Error(`No documents found for provided ids`);
	}
	const previousUrl = req.originalUrl.split('/documents/delete-confirmation')[0];

	return { documents, previousUrl };
}

/**
 * Renders the page that asks for confirmation, used on load and if an
 * error occurs during POST-ing
 */
function renderConfirmationView(
	req: Request,
	res: Response,
	context: any,
	safeReturnUrl: string,
	errorSummary?: any[]
) {
	if (errorSummary) {
		res.locals.errorSummary = errorSummary;
	}

	const basePath = req.originalUrl.split('/documents/')[0];

	return res.render('views/cases/case-folders/case-folder/delete-file/confirmation.njk', {
		pageHeading: 'Delete file(s)',
		backLinkUrl: safeReturnUrl,
		returnUrl: safeReturnUrl,
		documents: context.documents || [],
		deleteUrl: `${basePath}/documents/delete`
	});
}

export function buildDeleteFileView(service: ManageService) {
	const { db, logger } = service;

	return async (req: Request, res: Response) => {
		const { id } = req.params;
		const documentIds = extractDocumentIds(req);

		const safeReturnUrl = getSafeReturnUrl(req);

		if (!documentIds?.length) {
			addSessionData(req, id, { filesErrors: [{ text: 'Select file(s) to delete', href: '#' }] }, 'folder');
			return res.redirect(safeReturnUrl);
		}

		try {
			const context = await getDocumentsContext(db, documentIds, req);

			return renderConfirmationView(req, res, context, safeReturnUrl);
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching documents',
				logParams: { documentIds }
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
	const { db, logger, audit } = service;

	return async (req: Request, res: Response) => {
		const { id } = req.params;

		if (!id) {
			throw new Error('id param required');
		}
		const documentIds = extractDocumentIds(req);

		const safeReturnUrl = getSafeReturnUrl(req);

		if (!documentIds.length) throw new Error('documentIds body param required');

		let context;

		try {
			context = await getDocumentsContext(db, documentIds, req);

			await db.document.updateMany({
				where: { id: { in: documentIds } },
				data: {
					deletedAt: new Date()
				}
			});

			const userId = req?.session?.account?.localAccountId;

			if (context.documents.length === 1) {
				await audit.record({
					caseId: id,
					action: AUDIT_ACTIONS.FILE_DELETED,
					userId,
					metadata: { fileName: context.documents[0].fileName }
				});
			} else {
				await audit.record({
					caseId: id,
					action: AUDIT_ACTIONS.FILES_DELETED,
					userId,
					metadata: {
						files: context.documents.map((doc: Document) => doc.fileName)
					}
				});
			}

			addSessionData(req, id, { filesDeleted: true }, 'folder');

			return res.redirect(safeReturnUrl);
		} catch (error) {
			logger.error({ error, documentIds }, 'Failed to delete documents');

			const errorMessage = [{ text: 'Failed to delete documents, please try again.' }];
			return renderConfirmationView(
				req,
				res,
				context || { documents: [], previousUrl: '/' },
				safeReturnUrl,
				errorMessage
			);
		}
	};
}

/**
 * Checks that the URL is redirecting to somewhere relative and not a new URL
 */
function getSafeReturnUrl(req: Request): string {
	const returnUrl = req.body.returnUrl as string;
	if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
		return returnUrl;
	}

	return req.originalUrl.split('/documents/')[0];
}
