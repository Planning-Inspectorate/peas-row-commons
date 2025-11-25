import type { PortalService } from '#service';
import type { Request, Response } from 'express';

// todo: store info to DB apost save function
export function buildSaveController({ db, logger }: PortalService) {
	return async (req: Request, res: Response) => {
		if (!res.locals || !res.locals.journeyResponse) {
			throw new Error('journey response required');
		}
		const journeyResponse = res.locals.journeyResponse;
		const answers = journeyResponse.answers;
		if (typeof answers !== 'object') {
			throw new Error('answers should be an object');
		}

		try {
			await db.$transaction(async () => {
				//  `todo trasanaction to db ${$tx}`
			});
		} catch (error) {
			logger.error({ error }, 'error saving document data to database');
			throw new Error('error saving upload document journey');
		}

		res.redirect(req.baseUrl);
	};
}
