import type { ManageService } from '#service';
import { getStringParams } from '@pins/peas-row-commons-lib/util/params.ts';
import { sanitisePath } from '@pins/peas-row-commons-lib/util/strings.ts';
import { addSessionData } from '@planning-inspectorate/core/util';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { FILE_NAME_MAX_LENGTH, FILE_NAMES_REGEX } from '../../upload/constants.ts';

/**
 * Validates that a file being renamed has a valid name.
 */
export function buildValidateFileRename(
	service: ManageService,
	setSessionData: typeof addSessionData = addSessionData
): RequestHandler {
	const { db } = service;

	return async (req: Request, res: Response, next: NextFunction) => {
		const {
			id: caseId,
			folderId,
			folderName,
			fileId
		} = getStringParams(req.params, ['id', 'folderId', 'folderName', 'fileId']);
		const fileName = sanitisePath(req.body.fileName);

		const existingFile = await db.document.findUnique({
			where: { id: fileId, caseId, folderId, deletedAt: null },
			select: { fileName: true }
		});
		const fileExtension = existingFile?.fileName.split('.').pop();

		const syntaxError = getFileSyntaxError(fileName, fileExtension);
		if (syntaxError) {
			// Rebuild return URL for security
			const returnUrl = `/cases/${caseId}/case-folders/${folderId}/${encodeURIComponent(folderName)}/${fileId}/rename-file`;
			return handleFileValidationError(req, res, setSessionData, caseId, fileName, syntaxError, returnUrl);
		}
		// TODO HRP-648 validate duplicates in the same folder

		next();
	};
}

/**
 * Handles file validation errors by storing them in session (under the
 * 'files' section, read back by the rename-file view) and redirecting.
 */
export function handleFileValidationError(
	req: Request,
	res: Response,
	setSessionData: typeof addSessionData,
	caseId: string,
	fileName: string,
	error: { text: string; href: string },
	returnUrl: string
): void {
	setSessionData(
		req,
		caseId,
		{
			renameFileErrors: [error],
			erroredFileName: fileName
		},
		'files'
	);

	// returnUrl is rebuilt from the route's own params (e.g.
	// /cases/{caseId}/case-folders/{folderId}/{folderName}/{fileId}/rename-file),
	// so it's always a known, local path and never based on request-controlled URL data.
	res.redirect(returnUrl);
}

/**
 * Checks for basic syntax errors in a file name.
 */
export function getFileSyntaxError(fileName: string, fileExtension?: string) {
	if (!fileName) {
		return {
			text: 'File name is required',
			href: '#fileName'
		};
	}

	if (!FILE_NAMES_REGEX.test(fileName)) {
		return {
			text: `File name can only include letters, numbers, spaces, dots, hyphens, underscores, brackets, ampersands and single apostrophes.`,
			href: '#fileName'
		};
	}

	// The extension isn't user-editable but still counts towards the overall file name length limit
	const fullFileNameLength = fileExtension ? fileName.length + 1 + fileExtension.length : fileName.length;
	if (fullFileNameLength > FILE_NAME_MAX_LENGTH) {
		return {
			text: `File name must be ${FILE_NAME_MAX_LENGTH} characters or less`,
			href: '#fileName'
		};
	}

	return null;
}
