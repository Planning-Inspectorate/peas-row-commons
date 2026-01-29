import type { ManageService } from '#service';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function buildValidateFolder(service: ManageService, setSessionData = addSessionData): RequestHandler {
	const { db } = service;

	return async (req: Request, res: Response, next: NextFunction) => {
		const { folderId, id } = req.params;
		const folderName = sanitiseFolderName(req.body.folderName);

		// Update the request body folderName to be the sanitised one for next function in middleware
		req.body.folderName = folderName;

		const errors: Record<string, { text: string; href: string }> = {};

		const syntaxError = getSyntaxError(folderName);

		if (syntaxError) {
			errors.folderName = syntaxError;
		} else {
			try {
				const duplicateError = await getDuplicateError(db, id, folderId, folderName);
				if (duplicateError) {
					errors.folderName = duplicateError;
				}
			} catch (error) {
				return next(error);
			}
		}

		// If we have found some errors add it to the session so it can be displayed
		// on reload.
		if (Object.keys(errors).length > 0) {
			setSessionData(
				req,
				id,
				{
					createFolderErrors: Object.values(errors)
				},
				'folders'
			);

			return res.redirect(req.originalUrl);
		}

		next();
	};
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

	const validCharsRegex = /^[a-zA-Z0-9 \-_']+$/;
	if (!validCharsRegex.test(folderName)) {
		return {
			text: 'Folder name must only include letters a to z, numbers and special characters such as spaces, underscores, hyphens and apostrophes',
			href: '#folderName'
		};
	}

	return null;
}

/**
 * Checks for duplicate folder names in the same case & folder, is case insensitive, so FoLdEr1 will throw a duplicate
 * match if folder1 already exists.
 */
export async function getDuplicateError(
	db: PrismaClient,
	caseId: string,
	parentId: string | undefined,
	folderName: string
) {
	const existingFolder = await db.folder.findFirst({
		where: {
			caseId: caseId,
			parentFolderId: parentId,
			displayName: folderName
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
