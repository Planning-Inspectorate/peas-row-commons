import type { ManageService } from '#service';
import type { Request, Response } from 'express';
import { generateCaseReference } from './case-reference.ts';
import { mapAnswersToCaseInput, resolveCaseTypeIds } from './case-mapper.ts';
import { buildReferencePrefix } from './case-codes.ts';

export function buildSaveController({ db, logger }: ManageService) {
	return async (req: Request, res: Response) => {
		const journeyResponse = res.locals?.journeyResponse;

		if (!journeyResponse || typeof journeyResponse.answers !== 'object') {
			throw new Error('Valid journey response and answers object required');
		}

		const { answers } = journeyResponse;

		try {
			await db.$transaction(async ($tx) => {
				const { typeId, subtypeId } = resolveCaseTypeIds(answers);
				const prefix = buildReferencePrefix(typeId, subtypeId);
				const reference = await generateCaseReference($tx, prefix);

				logger.info({ reference }, 'creating a new case');

				const caseInput = mapAnswersToCaseInput(answers, reference);
				await $tx.case.create({ data: caseInput });

				logger.info({ reference }, 'created a new case');
			});
		} catch (error) {
			logger.error({ error }, 'error saving case data to database');
			throw new Error('error saving case journey');
		}

		// TODO Save Successful page
		res.redirect('/cases');
	};
}
