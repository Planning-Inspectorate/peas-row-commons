import type { ManageService } from '#service';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

type ValidationMode = 'create' | 'edit';

/**
 * Validates that a folder that is being:
 * (a) created
 * (b) renamed
 * is valid based on a set of critera.
 * e.g. name is not already taken, doesn't
 * contain special characters.
 *
 * Functionality is almost the same but varies
 * slightly for creating vs renaming (mode)
 */
export function buildValidateFolder(
	service: ManageService,
	mode: ValidationMode = 'create',
	setSessionData = addSessionData
): RequestHandler {
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
				const duplicateError =
					mode === 'create'
						? await getDuplicateErrorsCreate(db, id, folderId, folderName)
						: await getDuplicateErrorsRename(db, id, folderId, folderName);

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
export async function getDuplicateErrorsCreate(
	db: PrismaClient,
	caseId: string,
	parentId: string | undefined,
	folderName: string
) {
	const existingFolder = await db.folder.findFirst({
		where: {
			caseId: caseId,
			parentFolderId: parentId,
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
