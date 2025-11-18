import { format } from 'date-fns';
import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { CaseListFields, CaseListViewModel } from './types.ts';
import { getPageData, getPaginationParams } from '../../pagination/pagination-utils.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';

export function buildListCases(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		logger.info('list cases');

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);

		let cases, totalCases;

		try {
			[cases, totalCases] = await Promise.all([
				db.case.findMany({
					orderBy: { receivedDate: 'desc' },
					include: {
						Type: {
							select: {
								displayName: true
							}
						}
					},
					skip: skipSize,
					take: pageSize
				}),
				db.case.count()
			]);
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching cases',
				logParams: {}
			});
		}

		if (Number.isNaN(totalCases) || !cases) {
			return notFoundHandler(req, res);
		}

		const caseViewModels = cases.map(caseToViewModel);

		const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
			totalCases || 0,
			selectedItemsPerPage,
			pageSize,
			pageNumber
		);

		const paginationParams = {
			selectedItemsPerPage,
			pageNumber,
			totalPages,
			resultsStartNumber,
			resultsEndNumber,
			totalCases
		};

		return res.render('views/cases/list/view.njk', {
			pageHeading: 'Case list',
			cases: caseViewModels,
			currentUrl: req.originalUrl,
			paginationParams
		});
	};
}

export function caseToViewModel(caseRow: CaseListFields): CaseListViewModel {
	const viewModel = {
		...caseRow,
		receivedDate: format(caseRow.receivedDate, 'dd MMM yyyy'),
		receivedDateSortable: new Date(caseRow.receivedDate)?.getTime()
	};
	return viewModel;
}
