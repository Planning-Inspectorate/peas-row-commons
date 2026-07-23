import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Request } from 'express';
import type { ValidationError } from './validation-middleware.ts';

/**
 * Checks if file names already exist in a folder (database)
 * Used for both upload and move operations
 */
export async function getExistingFileNamesInFolder(db: PrismaClient, folderId: string): Promise<string[]> {
	const folder = await db.folder.findUnique({
		where: { id: folderId },
		include: {
			Documents: {
				where: { deletedAt: null }, // Do not worry if a soft deleted file as only live files are relevant
				select: { fileName: true }
			}
		}
	});
	return folder?.Documents.map((doc) => doc.fileName) ?? [];
}

/**
 * Checks if a filename conflicts with existing files in a destination folder
 * Works for both upload and move file operations
 * @param fileName - The file name to check
 * @param existingFileNames - List of existing file names in the target folder
 */
export function checkFileNameConflict(fileName: string, existingFileNames: Set<string>): ValidationError | null {
	if (existingFileNames.has(fileName)) {
		return {
			text: `${fileName}: File with this name already exists in the folder`,
			href: '#upload-form'
		};
	}
	return null;
}

/**
 * Check if any of the file names conflict with existing files in a destination folder
 * Works for both upload and move file operations
 * @param fileNames - Files to check
 * @param existingNamesSet - Set of existing file names in the target folder
 */
export function checkFileNamesConflict(fileNames: string[], existingNamesSet: Set<string>): ValidationError[] | null {
	if (existingNamesSet.size === 0) return null;
	const errors: ValidationError[] = fileNames
		.map((fileName) => checkFileNameConflict(fileName, existingNamesSet))
		.filter((error): error is ValidationError => error !== null);

	return errors.length > 0 ? errors : null;
}

/**
 * We check for duplicate files in session (not blob), as we store the files
 * in blob under a UUID to stop orphan files blocking upload.
 */
export async function checkForDuplicateFilesInDraft(
	db: PrismaClient,
	req: Request,
	files: Express.Multer.File[],
	caseId: string
): Promise<boolean> {
	const existingDrafts = await db.draftDocument.findMany({
		where: {
			sessionKey: req.sessionID,
			caseId: caseId
		},
		select: {
			fileName: true
		}
	});

	const existingNames = new Set(existingDrafts.map((d) => d.fileName));

	return files.some((newFile) => {
		const newName = Buffer.from(newFile.originalname, 'latin1').toString('utf8');
		return existingNames.has(newName);
	});
}
