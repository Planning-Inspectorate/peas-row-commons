import { formatBytes } from '@pins/peas-row-commons-lib/util/upload.ts';
import { checkTotalSizeLimit, validateUploadedFile } from './validation-util.ts';
import type { Request, Response, NextFunction } from 'express';
import type { ManageService } from '#service';
import { checkForDuplicateFilesInDraft, getExistingFileNamesInFolder } from './file-duplicate-validation.ts';

export interface ValidationError {
	text: string;
	href: string;
}

/**
 * Validates uploads against basic errors from Util (not allowed file types etc.)
 * And then duplicate names in session and total sizing limits.
 */
export function validateUploads(
	service: ManageService,
	allowedFileExtensions: string[],
	allowedMimeTypes: string[],
	maxFileSize: number,
	totalUploadLimit: number
) {
	return async (req: Request, res: Response, next: NextFunction) => {
		const { logger, db } = service;
		const { id, folderId } = req.params;
		const files = req.files as Express.Multer.File[];

		if (!id) throw new Error('id param required');

		if (!files || files.length === 0) return res.redirect(req.baseUrl);

		const allErrors: ValidationError[] = [];
		const existingNameSet = new Set(await getExistingFileNamesInFolder(db, folderId));
		const validationErrors = (
			await Promise.all(
				files.map((file) =>
					validateUploadedFile(file, logger, allowedFileExtensions, allowedMimeTypes, maxFileSize, existingNameSet)
				)
			)
		).flat();
		allErrors.push(...validationErrors);

		const [hasDuplicatesInDraft, isOverLimit] = await Promise.all([
			checkForDuplicateFilesInDraft(db, req, files, id),
			checkTotalSizeLimit(db, req, id, files, totalUploadLimit)
		]);

		if (hasDuplicatesInDraft) {
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
