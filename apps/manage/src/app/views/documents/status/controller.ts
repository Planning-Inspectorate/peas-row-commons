import type { Request, Response, NextFunction } from 'express';
import type { ManageService } from '#service';
import type { ToggleDocumentBody, ToggleDocumentPayload, ToggleType } from './types.ts';
import { DOCUMENT_STATUS_ACTIONS } from '@pins/peas-row-commons-lib/constants/documents.ts';
import type { Logger } from 'pino';
import { determineDefaultStatuses } from '@pins/peas-row-commons-lib/util/user-document-status.ts';
import { CASE_STATUS_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/status.ts';

/**
 * Handles the database operations for toggling a user's document state
 */
async function toggleDocumentStatusInDb(
	db: ManageService['db'],
	logger: Logger,
	payload: ToggleDocumentPayload
): Promise<void> {
	const { idpUserId, caseId, documentId, toggleType } = payload;

	const [caseRow, currentState] = await Promise.all([
		db.case.findUnique({
			select: {
				legacyCaseId: true,
				statusId: true
			},
			where: {
				id: caseId
			}
		}),
		db.userDocument.findFirst({
			where: {
				documentId: documentId,
				User: { idpUserId: idpUserId }
			}
		})
	]);

	if (!caseRow) {
		throw new Error(`Unable to find case row for id: ${caseId}`);
	}

	const { defaultIsRead, defaultIsFlagged } = determineDefaultStatuses({
		legacyCaseId: caseRow.legacyCaseId,
		statusId: caseRow.statusId,
		closedStatuses: [
			CASE_STATUS_ID.CLOSED_OPENED_IN_ERROR,
			CASE_STATUS_ID.INVALID,
			CASE_STATUS_ID.WITHDRAWN,
			CASE_STATUS_ID.REJECTED,
			CASE_STATUS_ID.CANCELLED,
			CASE_STATUS_ID.CLOSED
		]
	});

	const currentRead = currentState?.readStatus ?? defaultIsRead;
	const currentFlagged = currentState?.flaggedStatus ?? defaultIsFlagged;

	const newReadStatus = toggleType === DOCUMENT_STATUS_ACTIONS.READ ? !currentRead : currentRead;
	const newFlaggedStatus = toggleType === DOCUMENT_STATUS_ACTIONS.FLAG ? !currentFlagged : currentFlagged;

	// We have to do an if-else here rather than upsert because of our JIT User creation, Prisma
	// needs both a docId and userId to upsert and user could be undefined.
	if (currentState) {
		await db.userDocument.update({
			where: { id: currentState.id },
			data: {
				readStatus: newReadStatus,
				flaggedStatus: newFlaggedStatus
			}
		});
		logger.info(
			{ id: currentState.id, documentId, idpUserId, newReadStatus, newFlaggedStatus },
			'Successfully updated status for document and user'
		);
	} else {
		await db.userDocument.create({
			data: {
				readStatus: newReadStatus,
				flaggedStatus: newFlaggedStatus,
				Case: { connect: { id: caseId } },
				Document: { connect: { id: documentId } },
				User: {
					connectOrCreate: {
						where: { idpUserId: idpUserId },
						create: { idpUserId: idpUserId }
					}
				}
			}
		});

		logger.info(
			{ documentId, idpUserId, newReadStatus, newFlaggedStatus },
			'Successfully created status for document and user'
		);
	}
}

/**
 * Controller for toggling a document status, e.g Read -> Unread or
 * Flagged -> Unflagged.
 */
export function buildToggleDocumentAction(service: ManageService) {
	const { db, logger } = service;
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const body = req.body as ToggleDocumentBody;
			const idpUserId = req.session?.account?.localAccountId;
			const caseId = body.caseId;

			const isReadToggle = body.markReadToggle !== undefined;
			const documentId = body.markReadToggle || body.flagToggle;
			const toggleType: ToggleType = isReadToggle ? DOCUMENT_STATUS_ACTIONS.READ : DOCUMENT_STATUS_ACTIONS.FLAG;

			if (!idpUserId) {
				throw new Error('userId required for updating document status');
			}
			if (!documentId || !caseId) {
				throw new Error('documentId and caseId required for updating document status');
			}

			await toggleDocumentStatusInDb(db, logger, {
				idpUserId,
				caseId,
				documentId,
				toggleType
			});

			const returnUrl = createReturnUrl(body, caseId, documentId);

			return res.redirect(returnUrl);
		} catch (error) {
			logger.error(error, 'Error toggling document state');
			next(error);
		}
	};
}

/**
 * Creates the return URL, checks that what we have been passed is safe,
 * and remembering to anchor the document ID so that we go back to where
 * we were in the list of documents.
 */
function createReturnUrl(body: ToggleDocumentBody, caseId: string, documentId: string) {
	const returnUrl = body.returnUrl;
	const fallbackUrl = `/cases/${caseId}`;

	// To prevent open redirect, check the presented URL is safe
	const isSafeUrl = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//');

	const cleanRedirectUrl = isSafeUrl ? returnUrl.split('#')[0] : fallbackUrl;

	return `${cleanRedirectUrl}#row-${documentId}`;
}
