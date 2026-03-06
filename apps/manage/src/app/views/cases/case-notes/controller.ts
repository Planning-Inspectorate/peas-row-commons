import { ManageService } from '#service';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { Prisma, PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { Logger } from 'pino';
import { AUDIT_ACTIONS } from '../../../audit/actions.ts';
import { NOTE_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/note-type.ts';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import { mapNotes } from '../view/view-model.ts';
import { getEntraGroupMembers } from '#util/entra-groups.ts';

export function buildCreateCaseNote(service: ManageService): AsyncRequestHandler {
	const { db, logger, audit } = service;

	return async (req, res) => {
		const { id } = req.params;
		const { comment } = req.body;
		const userId = req?.session?.account?.localAccountId;

		logger.info({ comment }, 'case note creation');

		await createCaseNote(id, comment, userId, db, logger);

		await audit.record({
			caseId: id,
			action: AUDIT_ACTIONS.CASE_NOTE_ADDED,
			userId: req?.session?.account?.localAccountId
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
				message: 'creating a case not',
				logParams: { id }
			});
		}
	}
}

export function buildViewCaseNotes(service: ManageService): AsyncRequestHandler {
	const { db, logger, getEntraClient } = service;
	const groupId = service.authConfig.groups.applicationAccess;

	return async (req, res) => {
		const id = req.params.id;

		if (!id) {
			throw new Error('id param required');
		}

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
			groupId
		});

		const notes = mapNotes(caseRow.Notes, groupMembers, caseRow.id);

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
