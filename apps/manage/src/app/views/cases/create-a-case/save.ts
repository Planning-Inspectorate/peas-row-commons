import type { ManageService } from '#service';
import type { Request, Response } from 'express';
import { AUDIT_ACTIONS } from '../../../audit/index.ts';
import { resolveLinkedCaseAudits } from '../../../audit/resolvers/index.ts';
import type { AuditEntry } from '../../../audit/types.ts';
import { createFolders, findFolders, FOLDER_TEMPLATES_MAP } from '../case-folders/folder-utils.ts';
import { linkNewCaseToLead } from '../view/linked-cases.ts';
import { buildReferencePrefix } from './case-codes.ts';
import { mapAnswersToCaseInput, resolveCaseTypeIds } from './case-mapper.ts';
import { generateCaseReference } from './case-reference.ts';
import { JOURNEY_ID } from './journey.ts';

import { wrapPrismaError } from '@planning-inspectorate/core/util';

import { BOOLEAN_OPTIONS, clearDataFromSession } from '@planning-inspectorate/dynamic-forms';

export function buildSaveController({ db, logger, audit }: ManageService) {
	return async (req: Request, res: Response) => {
		const journeyResponse = res.locals?.journeyResponse;

		if (!journeyResponse || typeof journeyResponse.answers !== 'object') {
			throw new Error('Valid journey response and answers object required');
		}

		const { answers } = journeyResponse;
		const userId = req?.session?.account?.localAccountId;

		let reference, id;
		let linkedCaseAuditEntries: AuditEntry[] = [];
		try {
			const createdCase = await db.$transaction(async ($tx) => {
				const { typeId, subtypeId } = resolveCaseTypeIds(answers);
				const prefix = buildReferencePrefix(typeId, subtypeId);

				reference = await generateCaseReference($tx, prefix);

				logger.info({ reference }, 'creating a new case');

				const caseInput = mapAnswersToCaseInput(answers, reference);
				const created = await $tx.case.create({ data: caseInput });

				id = created.id;

				/**
				 * Write the CaseRelationship linking this new case to its lead case.
				 * If this case is the lead case, it's assumed the others don't yet exist,
				 * and will be linked when they are created.
				 */
				if (
					answers.hasLinkedCases === BOOLEAN_OPTIONS.YES &&
					answers.isLeadCase === BOOLEAN_OPTIONS.NO &&
					answers.leadCaseId
				) {
					const leadCaseId = answers.leadCaseId as string;

					// Fetch the lead's group before writing the new relationship, so the
					// audit entries below reflect an accurate "before" snapshot.
					const leadCase = await $tx.case.findUnique({
						where: { id: leadCaseId },
						select: {
							reference: true,
							ChildRelationships: { select: { ChildCase: { select: { id: true, reference: true } } } }
						}
					});

					await linkNewCaseToLead($tx, id, leadCaseId);

					if (leadCase) {
						const siblings = leadCase.ChildRelationships.map((rel) => ({
							id: rel.ChildCase.id,
							reference: rel.ChildCase.reference ?? ''
						}));

						// The new case has no prior linked cases, and its final group is the
						// lead plus any siblings the lead already had - not just what was
						// submitted - so those existing siblings are correctly diffed as
						// updates (via mergedLeadOldGroup) rather than brand new additions.
						linkedCaseAuditEntries = resolveLinkedCaseAudits(
							id,
							userId,
							[{ id, reference }, { id: leadCaseId, reference: leadCase.reference ?? '' }, ...siblings],
							[],
							[
								{ linkedCaseId: leadCaseId, linkedCaseIsLead: BOOLEAN_OPTIONS.YES },
								...siblings.map((sibling) => ({ linkedCaseId: sibling.id, linkedCaseIsLead: BOOLEAN_OPTIONS.NO }))
							],
							siblings.length
								? { leadCaseId, members: siblings.map((sibling) => ({ caseId: sibling.id, isLead: false })) }
								: undefined
						);
					}
				}

				logger.info({ reference }, 'created a new case');

				const foldersToCreate = findFolders(typeId, FOLDER_TEMPLATES_MAP);

				await createFolders(foldersToCreate, id, $tx);

				logger.info({ reference }, 'created folders for case');

				return created;
			});

			await audit.record({
				caseId: createdCase.id,
				action: AUDIT_ACTIONS.CASE_CREATED,
				userId,
				metadata: { reference: createdCase.reference }
			});

			// Recorded separately, after CASE_CREATED, so it's guaranteed to sort later:
			// CaseHistory.createdAt is a plain `@default(now())` timestamp with no
			// secondary tiebreaker, so entries written in the same recordMany() batch
			// (one createMany statement) can share an identical createdAt, leaving their
			// relative order in the case history undefined.
			if (linkedCaseAuditEntries.length) {
				await audit.recordMany(linkedCaseAuditEntries);
			}
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'creating case',
				logParams: {}
			});
		}

		clearDataFromSession({
			req,
			journeyId: JOURNEY_ID,
			replaceWith: {
				id,
				reference
			}
		});

		res.redirect(`${req.baseUrl}/success`);
	};
}

export function buildSuccessController() {
	return async (req: Request, res: Response) => {
		const data = req.session?.forms && req.session?.forms[JOURNEY_ID];

		if (!data || !data.id || !data.reference) {
			throw new Error('invalid create case session');
		}

		clearDataFromSession({ req, journeyId: JOURNEY_ID });

		res.render('views/cases/create-a-case/success.njk', {
			title: 'New case has been created',
			bodyText: `The case reference number<br><strong>${data.reference}</strong>`,
			successBackLinkUrl: `/cases/${data.id}?firstVisit=true`,
			successBackLinkText: 'Continue to case details page'
		});
	};
}
