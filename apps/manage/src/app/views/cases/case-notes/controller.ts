import { ManageService } from '#service';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { Prisma, PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { Logger } from 'pino';

export function buildCreateCaseNote(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;

	return async (req, res) => {
		const { id } = req.params;
		const { comment } = req.body;
		const userId = req?.session?.account?.localAccountId || 'unknown';

		logger.info({ comment }, 'case note creation');

		await createCaseNote(id, comment, userId, db, logger);

		logger.info({ id }, 'case note created');

		// Return back to case view page
		const viewCaseUrl = req.baseUrl.replace(/\/case-note\/?$/, '');
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
					}
				}
			});
		});
	} catch (error: any) {
		wrapPrismaError({
			error,
			logger,
			message: 'creating a case not',
			logParams: { id }
		});
	}
}
