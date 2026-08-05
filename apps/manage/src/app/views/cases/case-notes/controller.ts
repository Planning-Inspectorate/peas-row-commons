import type { ManageService } from '#service';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import type { Prisma, PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { Logger } from 'pino';
import { AUDIT_ACTIONS } from '../../../audit/actions.ts';
import { NOTE_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/note-type.ts';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import { mapNotes } from '../view/view-model.ts';
import { buildUserDisplayNameMap, getEntraGroupMembers } from '#util/entra-groups.ts';
import { isDefined } from '@pins/peas-row-commons-lib/util/type-predicate.ts';
import { getStringParam } from '@pins/peas-row-commons-lib/util/params.ts';
import { GENERAL_CONSTANTS } from '@pins/peas-row-commons-lib/constants/general.ts';

/**
 * Preloads case and note data for edit routes, populating res.locals.
 * Used by both GET and POST handlers for /:noteId/edit.
 */
export function buildPreloadCaseNoteData(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;

	return async (req, res, next) => {
		const caseId = getStringParam(req.params, 'id');
		const noteId = getStringParam(req.params, 'noteId');

		let caseNote;
		let caseRow;
		try {
			[caseNote, caseRow] = await Promise.all([
				db.caseNote.findUnique({
					where: { id: noteId },
					include: { Author: true }
				}),
				db.case.findUnique({
					select: { id: true, reference: true },
					where: { id: caseId }
				})
			]);
		} catch (error: unknown) {
			if (error instanceof Error) {
				wrapPrismaError({
					error,
					logger,
					message: 'preloading case note data',
					logParams: { caseId, noteId }
				});
			}
		}

		if (!caseNote || !caseRow || caseNote.caseId !== caseId) {
			return notFoundHandler(req, res);
		}

		res.locals.reference = caseRow.reference;
		res.locals.caseNote = caseNote;

		if (next) next();
	};
}

export function buildCreateCaseNote(service: ManageService): AsyncRequestHandler {
	const { db, logger, audit } = service;

	return async (req, res) => {
		const id = getStringParam(req.params, 'id');
		const { comment } = req.body;
		const userId = req?.session?.account?.localAccountId;

		logger.info({ comment }, 'case note creation');

		await createCaseNote(id, comment, userId, db, logger);

		await audit.record({
			caseId: id,
			action: AUDIT_ACTIONS.CASE_NOTE_ADDED,
			userId,
			metadata: {
				caseNote: comment
			}
		});

		logger.info({ id }, 'case note created');

		// Return back to case view page
		const viewCaseUrl = req.baseUrl.replace(/\/case-notes\/?$/, '');
		res.redirect(viewCaseUrl);
	};
}

/**
 * Queries DB and creates a case note.
 */
async function createCaseNote(id: string, comment: string, authorId: string, db: PrismaClient, logger: Logger) {
	try {
		await db.$transaction(async ($tx: Prisma.TransactionClient) => {
			const caseRow = await $tx.case.findUnique({
				where: { id }
			});

			if (!caseRow) {
				throw new Error('Case not found');
			}

			await $tx.caseNote.create({
				data: {
					Case: {
						connect: { id }
					},
					comment,
					Author: {
						connectOrCreate: {
							where: { idpUserId: authorId },
							create: { idpUserId: authorId }
						}
					},
					// All user created notes are "case-note"s
					NoteType: {
						connect: { id: NOTE_TYPE_ID.CASE_NOTE }
					}
				}
			});
		});
	} catch (error: unknown) {
		if (error instanceof Error) {
			wrapPrismaError({
				error,
				logger,
				message: 'creating a case note',
				logParams: { id }
			});
		}
	}
}

export function buildViewCaseNotes(service: ManageService): AsyncRequestHandler {
	const { db, logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

		let caseRow;
		try {
			[caseRow] = await Promise.all([
				db.case.findUnique({
					select: {
						id: true,
						name: true,
						reference: true,
						Notes: {
							orderBy: { createdAt: 'desc' },
							include: {
								Author: true,
								NoteType: true
							}
						}
					},
					where: { id }
				})
			]);
		} catch (error: unknown) {
			if (error instanceof Error) {
				wrapPrismaError({
					error,
					logger,
					message: 'fetching all case notes',
					logParams: { id }
				});
			}
		}

		if (!caseRow) {
			return notFoundHandler(req, res);
		}

		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupIds
		});

		const userIds = caseRow.Notes.map((caseNote) => caseNote.Author.idpUserId).filter(isDefined);

		const userMap = await buildUserDisplayNameMap(groupMembers, userIds, {
			logger,
			initClient: getEntraClient,
			session: req.session
		});

		const notes = mapNotes(caseRow.Notes, userMap, caseRow.id);

		return res.render('views/cases/case-notes/view.njk', {
			pageHeading: 'Case notes',
			reference: caseRow?.reference,
			backLinkUrl: `/cases/${id}`,
			backLinkText: 'Back to case details',
			currentUrl: req.originalUrl,
			...notes
		});
	};
}

/**
 * Renders the edit case note page.
 * Expects res.locals.reference and res.locals.caseNote to be populated by buildPreloadCaseNoteData middleware.
 */
export function buildViewEditCaseNote(): AsyncRequestHandler {
	return async (req, res) => {
		const caseId = getStringParam(req.params, 'id');
		const { reference, caseNote } = res.locals;

		return res.render('views/cases/case-notes/edit.njk', {
			pageHeading: 'Change note',
			reference,
			backLinkUrl: `/cases/${caseId}`,
			backLinkText: 'Back to case details',
			currentUrl: req.originalUrl,
			comment: req.body?.comment ?? caseNote.comment,
			characterLimit: GENERAL_CONSTANTS.CASE_NOTE_MAX_LENGTH
		});
	};
}

export function buildUpdateCaseNote(service: ManageService): AsyncRequestHandler {
	const { db, logger, audit } = service;

	return async (req, res) => {
		const caseId = getStringParam(req.params, 'id');
		const noteId = getStringParam(req.params, 'noteId');
		const { comment } = req.body;
		const userId = req?.session?.account?.localAccountId;

		// Defence in depth: validate case ownership even though middleware already checked
		const { caseNote } = res.locals;
		if (!caseNote || caseNote.caseId !== caseId) {
			return notFoundHandler(req, res);
		}

		logger.info({ noteId, caseId }, 'case note update');

		try {
			// Use updateMany with compound where to enforce case ownership at database level
			const result = await db.caseNote.updateMany({
				where: { id: noteId, caseId },
				data: { comment, updatedAt: new Date() }
			});

			if (result.count !== 1) {
				throw new Error(`Expected 1 row to be updated, but ${result.count} rows were affected`);
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				wrapPrismaError({
					error,
					logger,
					message: 'updating case note',
					logParams: { caseId, noteId }
				});
			}
		}

		await audit.record({
			caseId,
			action: AUDIT_ACTIONS.CASE_NOTE_EDITED,
			userId,
			metadata: {
				caseNote: comment
			}
		});

		logger.info({ caseId, noteId }, 'case note updated');

		// Return back to case view page
		res.redirect(`/cases/${caseId}`);
	};
}
