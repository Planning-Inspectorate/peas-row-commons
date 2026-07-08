import type { ManageService } from '#service';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { getOptionalStringParam, getStringParam, getStringParams } from '@pins/peas-row-commons-lib/util/params.ts';

type SetSessionDataFn = typeof addSessionData;

/**
 * Validates that a folder being created has a valid name.
 * The parentFolderId is optional (null means creating at root level).
 */
export function buildValidateFolderCreate(
	service: ManageService,
	setSessionData: SetSessionDataFn = addSessionData
): RequestHandler {
	const { db } = service;

	return async (req: Request, res: Response, next: NextFunction) => {
		const caseId = getStringParam(req.params, 'id');
		const parentFolderId = getOptionalStringParam(req.params, 'folderId');
		const folderName = sanitiseFolderName(req.body.folderName);

		const syntaxError = getSyntaxError(folderName);
		if (syntaxError) {
			return handleValidationError(req, res, setSessionData, caseId, folderName, syntaxError);
		}

		const duplicateError = await getDuplicateErrorsCreate(db, caseId, parentFolderId, folderName);
		if (duplicateError) {
			return handleValidationError(req, res, setSessionData, caseId, folderName, duplicateError);
		}

		req.body.folderName = folderName;
		next();
	};
}

/**
 * Validates that a folder being renamed has a valid name.
 * The folderId (folder being renamed) is required.
 */
export function buildValidateFolderRename(
	service: ManageService,
	setSessionData: SetSessionDataFn = addSessionData
): RequestHandler {
	const { db } = service;

	return async (req: Request, res: Response, next: NextFunction) => {
		const { id: caseId, folderId } = getStringParams(req.params, ['id', 'folderId']);
		const folderName = sanitiseFolderName(req.body.folderName);

		const syntaxError = getSyntaxError(folderName);
		if (syntaxError) {
			return handleValidationError(req, res, setSessionData, caseId, folderName, syntaxError);
		}

		try {
			const duplicateError = await getDuplicateErrorsRename(db, caseId, folderId, folderName);
			if (duplicateError) {
				return handleValidationError(req, res, setSessionData, caseId, folderName, duplicateError);
			}
		} catch (err) {
			return next(err);
		}

		req.body.folderName = folderName;
		next();
	};
}

/**
 * Handles validation errors by storing them in session and redirecting.
 */
function handleValidationError(
	req: Request,
	res: Response,
	setSessionData: SetSessionDataFn,
	caseId: string,
	folderName: string,
	error: { text: string; href: string }
): void {
	setSessionData(
		req,
		caseId,
		{
			createFolderErrors: [error],
			erroredFolderName: folderName
		},
		'folders'
	);

	res.redirect(req.originalUrl);
}

/**
 * Trims whitespace from beginning and end and replaces
 * multiple spaces in the middle with only 1.
 */
export function sanitiseFolderName(name: string): string {
	if (typeof name !== 'string') return '';
	return name.trim().replace(/\s\s+/g, ' ');
}

/**
 * Checks for basic syntax errors like too long, too short, obscure
 * characters
 */
export function getSyntaxError(folderName: string) {
	if (!folderName || folderName.length < 3 || folderName.length > 255) {
		return {
			text: 'Folder name must be between 3 and 255 characters',
			href: '#folderName'
		};
	}

	const validCharsRegex = /^(?!.*'')[a-zA-Z0-9 .\-_()&'/]+$/;
	if (!validCharsRegex.test(folderName)) {
		return {
			text: 'Folder name must only include letters a to z, numbers and special characters such as spaces, underscores, hyphens, ampersand, brackets, forward slashes and single apostrophes',
			href: '#folderName'
		};
	}

	return null;
}

/**
 * Checks for duplicate folder names in the same case & folder, is case insensitive, so FoLdEr1 will throw a duplicate
 * match if folder1 already exists.
 */
export async function getDuplicateErrorsCreate(
	db: PrismaClient,
	caseId: string,
	parentFolderId: string | null,
	folderName: string
) {
	const existingFolder = await db.folder.findFirst({
		where: {
			caseId: caseId,
			parentFolderId: parentFolderId,
			displayName: folderName,
			deletedAt: null
		}
	});

	if (existingFolder && existingFolder.displayName.toLowerCase() === folderName.toLowerCase()) {
		return {
			text: 'Folder name already exists',
			href: '#folderName'
		};
	}

	return null;
}

/**
 * Checks that you are not renaming a folder to an existing folder within the same parent
 */
export async function getDuplicateErrorsRename(
	db: PrismaClient,
	caseId: string,
	currentFolderId: string,
	folderName: string
) {
	const currentFolder = await db.folder.findUnique({
		select: {
			parentFolderId: true
		},
		where: {
			id: currentFolderId
		}
	});

	if (!currentFolder) throw new Error('Could not find folder for id');

	const existingFolder = await db.folder.findFirst({
		where: {
			caseId: caseId,
			parentFolderId: currentFolder.parentFolderId,
			displayName: folderName,
			deletedAt: null,
			NOT: { id: currentFolderId }
		}
	});

	if (existingFolder && existingFolder.displayName.toLowerCase() === folderName.toLowerCase()) {
		return {
			text: 'Folder name already exists',
			href: '#folderName'
		};
	}

	return null;
}
