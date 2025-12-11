import type { ManageService } from '#service';
import type { Request, Response } from 'express';
import { generateCaseReference } from './case-reference.ts';
import { mapAnswersToCaseInput, resolveCaseTypeIds } from './case-mapper.ts';
import { buildReferencePrefix } from './case-codes.ts';
import { JOURNEY_ID } from './journey.ts';
import { createFolders } from './folder.ts';

import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { PEAS_FOLDERS } from '@pins/peas-row-commons-database/src/seed/static_data/folders.ts';

import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';

export function buildSaveController({ db, logger }: ManageService) {
	return async (req: Request, res: Response) => {
		const journeyResponse = res.locals?.journeyResponse;

		if (!journeyResponse || typeof journeyResponse.answers !== 'object') {
			throw new Error('Valid journey response and answers object required');
		}

		const { answers } = journeyResponse;

		let reference, id;
		try {
			await db.$transaction(async ($tx) => {
				const { typeId, subtypeId } = resolveCaseTypeIds(answers);
				const prefix = buildReferencePrefix(typeId, subtypeId);
				reference = await generateCaseReference($tx, prefix);

				logger.info({ reference }, 'creating a new case');

				const caseInput = mapAnswersToCaseInput(answers, reference);
				const created = await $tx.case.create({ data: caseInput });

				id = created.id;

				logger.info({ reference }, 'created a new case');

				await createFolders(PEAS_FOLDERS, id, $tx);

				logger.info({ reference }, 'created folders for case');
			});
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
			successBackLinkUrl: `/cases/${data.id}`,
			successBackLinkText: 'Continue to case details page'
		});
	};
}
