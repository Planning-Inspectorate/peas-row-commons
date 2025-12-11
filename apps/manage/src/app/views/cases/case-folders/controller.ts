import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';

export function buildViewCaseFolders(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const id = req.params.id;

		if (!id) {
			throw new Error('id param required');
		}

		let caseRow, folders;
		try {
			[caseRow, folders] = await Promise.all([
				db.case.findUnique({
					where: { id }
				}),
				db.folder.findMany({
					where: { caseId: id }
				})
			]);
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching cases',
				logParams: {}
			});
		}

		return res.render('views/cases/case-folders/view.njk', {
			pageHeading: caseRow?.name,
			reference: caseRow?.reference,
			caseName: caseRow?.name,
			folders
		});
	};
}
