import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { clearSessionData, readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { ALLOWED_MIME_TYPES } from './constants.ts';
import { createUploadedFilesViewModel } from './view-model.ts';

export function buildUploadToFolderView(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const id = req.params.id;
		const folderId = req.params.folderId;

		if (!id || !folderId) {
			throw new Error('id param required');
		}

		const uploadErrors = readSessionData(req, id, 'uploadErrors', [], 'files');

		// Clear updated flag if present so that we only see it once.
		clearSessionData(req, id, 'uploadErrors', 'files');

		let caseRow, folder, drafts;
		try {
			[caseRow, folder, drafts] = await Promise.all([
				db.case.findUnique({
					select: {
						name: true,
						reference: true
					},
					where: { id }
				}),
				db.folder.findUnique({
					select: {
						displayName: true
					},
					where: { id: folderId }
				}),
				db.draftDocument.findMany({
					where: {
						sessionKey: req.sessionID,
						caseId: id,
						folderId: folderId
					}
				})
			]);
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching folder',
				logParams: {}
			});
		}

		if (!caseRow || !folder) {
			return notFoundHandler(req, res);
		}

		const errorSummary = typeof uploadErrors !== 'boolean' && uploadErrors.length ? uploadErrors : null;

		return res.render('views/cases/upload/view.njk', {
			pageHeading: caseRow?.name,
			reference: caseRow?.reference,
			backLinkUrl: `/cases/${id}`,
			currentUrl: req.originalUrl,
			folder,
			errorSummary,
			allowedMimeTypes: ALLOWED_MIME_TYPES,
			uploadedFiles: createUploadedFilesViewModel(drafts || [])
		});
	};
}
