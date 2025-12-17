import { formatBytes } from '@pins/peas-row-commons-lib/util/upload.ts';
import { readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { validateUploadedFile } from './validation-util.ts';
import type { Request, Response, NextFunction } from 'express';
import type { ManageService } from '#service';

interface ValidationError {
	text: string;
	href: string;
}

export function validateUploads(
	service: ManageService,
	allowedFileExtensions: string[],
	allowedMimeTypes: string[],
	maxFileSize: number,
	totalUploadLimit: number
) {
	return async (req: Request, res: Response, next: NextFunction) => {
		const { logger } = service;
		const { id } = req.params;
		const files = req.files as Express.Multer.File[];

		if (!id) throw new Error('id param required');

		if (!files || files.length === 0) return res.redirect(req.baseUrl);

		const allErrors: ValidationError[] = [];

		const validationErrors = (
			await Promise.all(
				files.map((file) => validateUploadedFile(file, logger, allowedFileExtensions, allowedMimeTypes, maxFileSize))
			)
		).flat();
		allErrors.push(...validationErrors);

		const [hasDuplicates, isOverLimit] = await Promise.all([
			checkForDuplicateFiles(req, files, id),
			checkTotalSizeLimit(req, id, files, totalUploadLimit)
		]);

		if (hasDuplicates) {
			allErrors.push({
				text: 'File with this name has already been uploaded',
				href: '#upload-form'
			});
		}

		if (isOverLimit) {
			allErrors.push({
				text: `Total file size of all attachments must not exceed ${formatBytes(totalUploadLimit)}`,
				href: '#upload-form'
			});
		}

		if (allErrors.length > 0) {
			return res.json({
				error: {
					message: allErrors.map((e) => e.text).join(', ')
				}
			});
		}

		next();
	};
}

/**
 * We check for duplicate files in session (not blob), as we store the files
 * in blob under a UUID to stop orphan files blocking upload.
 */
async function checkForDuplicateFiles(
	req: Request,
	files: Express.Multer.File[],
	containerPath: string
): Promise<boolean> {
	const existingSessionFiles = readSessionData(req, containerPath, 'uploadedFiles', [], 'files') || [];

	if (!Array.isArray(existingSessionFiles) || existingSessionFiles.length === 0) {
		return false;
	}

	const isDuplicate = files.some((newFile) => {
		const newName = Buffer.from(newFile.originalname, 'latin1').toString('utf8');

		return existingSessionFiles.some((existing: any) => existing.fileName === newName);
	});

	return isDuplicate;
}

async function checkTotalSizeLimit(
	req: Request,
	id: string,
	newFiles: Express.Multer.File[],
	totalUploadLimit: number
): Promise<boolean> {
	const existingFiles = readSessionData(req, id, 'uploadedFiles', [], 'files') || [];
	if (typeof existingFiles === 'boolean') return false;

	const existingTotal = existingFiles.reduce((sum: number, file: any) => sum + (file.size || 0), 0);
	const newTotal = newFiles.reduce((sum, file) => sum + (file.size || 0), 0);

	return existingTotal + newTotal > totalUploadLimit;
}
