import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import { getCountHeading } from '@pins/peas-row-commons-lib/util/file-count-headings.ts';
import { getStringParam } from '@pins/peas-row-commons-lib/util/params.ts';
import { addSessionData, clearSessionData, readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ValidationError } from '../upload/upload-documents/validation-middleware.ts';

/**
 * Controller used for the POST request when a user sends files to move,
 * does some validation and saves the files to the request object session.
 *
 * Then redirects to the GET url of the same endpoint (buildViewMoveFiles)
 */
export function buildHandleMoveSelection(): RequestHandler {
	return async (req, res) => {
		const id = getStringParam(req.params, 'id');
		const returnUrl = req.baseUrl.replace(/\/move-files\/?$/, '');

		const rawSelectedFiles = req.body?.selectedFiles;
		const selectedFiles = Array.isArray(rawSelectedFiles)
			? rawSelectedFiles
			: rawSelectedFiles
				? [rawSelectedFiles]
				: [];

		const moveFile = typeof req.body?.moveFile === 'string' ? req.body.moveFile : undefined;
		const updatedFiles = moveFile ? selectedFiles.filter((fileId: string) => fileId !== moveFile) : selectedFiles;

		if (!updatedFiles.length) {
			addSessionData(
				req,
				id,
				{
					filesErrors: [
						{
							text: 'Select file(s) to move',
							href: '#'
						}
					]
				},
				'folder'
			);
			return res.redirect(returnUrl);
		}

		req.session.moveFilesIds = updatedFiles;

		return res.redirect(req.baseUrl);
	};
}

/**
 * Controller for getting the view that shows all the selected files ready to move.
 *
 * Because the files are in the request object's session, they will be accessible at
 * the end of the Journey ready to update.
 */
export function buildViewMoveFiles(service: ManageService): RequestHandler {
	const { db } = service;

	return async (req, res) => {
		const fileIds = Array.isArray(req.session.moveFilesIds) ? req.session.moveFilesIds : [];

		if (!fileIds || fileIds.length === 0) {
			const returnUrl = req.baseUrl.replace(/\/move-files\/?$/, '');
			return res.redirect(returnUrl);
		}

		const documents = await db.document.findMany({
			where: {
				id: { in: fileIds }
			},
			select: {
				id: true,
				fileName: true
			}
		});

		if (!documents) return notFoundHandler(req, res);

		const fileCount = documents.length;
		const pageHeading = getCountHeading(fileCount, {
			zeroFiles: 'No files selected to move',
			oneFile: 'Move 1 file',
			multipleFiles: (n) => `Move ${n} files`
		});
		const returnUrl = req.baseUrl.replace(/\/move-files\/?$/, '');

		return res.render('views/cases/move-file/view.njk', {
			pageHeading,
			documents,
			backLinkUrl: returnUrl,
			currentUrl: req.originalUrl
		});
	};
}

/**
 * Middleware to get moveFile errors from session to pass errors to view model
 */
export function buildHandleDuplicateFileNamesMiddleware() {
	return async (req: Request, res: Response, next: NextFunction) => {
		const id = getStringParam(req.params, 'id');

		const sessionErrors = readSessionData(req, id, 'moveFileErrors', [], 'move-files');
		const errorsToDisplay: ValidationError[] =
			Array.isArray(sessionErrors) && sessionErrors.length > 0 ? sessionErrors : [];
		clearSessionData(req, id, 'moveFileErrors', 'move-files');

		if (errorsToDisplay.length === 0) return next();
		res.locals.errorSummary = errorsToDisplay;
		return next();
	};
}
