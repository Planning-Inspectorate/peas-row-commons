import { formatBytes } from '@pins/peas-row-commons-lib/util/upload.ts';
import { validateUploadedFile } from './validation-util.ts';
import type { Request, Response, NextFunction } from 'express';
import type { ManageService } from '#service';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';

interface ValidationError {
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
			checkForDuplicateFiles(db, req, files, id),
			checkTotalSizeLimit(db, req, id, files, totalUploadLimit)
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
export async function checkForDuplicateFiles(
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

	const isDuplicate = files.some((newFile) => {
		const newName = Buffer.from(newFile.originalname, 'latin1').toString('utf8');
		return existingNames.has(newName);
	});

	return isDuplicate;
}

/**
 * Takes all uploaded files in current session
 * and see if it is under the passed in total limit.
 * I.e. fresh docs + previous docs.
 */
export async function checkTotalSizeLimit(
	db: PrismaClient,
	req: Request,
	caseId: string,
	newFiles: Express.Multer.File[],
	totalUploadLimit: number
): Promise<boolean> {
	const aggregate = await db.draftDocument.aggregate({
		_sum: {
			size: true
		},
		where: {
			sessionKey: req.sessionID,
			caseId: caseId
		}
	});

	const currentTotal = Number(aggregate._sum.size || 0);
	const newTotal = newFiles.reduce((sum, file) => sum + (file.size || 0), 0);
	return currentTotal + newTotal > totalUploadLimit;
}
