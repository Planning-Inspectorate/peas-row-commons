import type { Request } from 'express';

export function getPaginationParams(req: Request) {
	const selectedItemsPerPage = Number(req.query?.itemsPerPage) || 25;
	const pageNumber = Math.max(1, Number(req.query?.page) || 1);
	const pageSize = [25, 50, 100].includes(selectedItemsPerPage) ? selectedItemsPerPage : 100;
	const skipSize = (pageNumber - 1) * pageSize;

	return {
		selectedItemsPerPage,
		pageNumber,
		pageSize,
		skipSize
	};
}

export function getPageData(totalItems: number, selectedItemsPerPage: number, pageSize: number, pageNumber: number) {
	const totalPages = Math.ceil(totalItems / pageSize);
	const resultsStartNumber = Math.min((pageNumber - 1) * selectedItemsPerPage + 1, totalItems);
	const resultsEndNumber = Math.min(pageNumber * selectedItemsPerPage, totalItems);

	return {
		totalPages,
		resultsStartNumber,
		resultsEndNumber
	};
}
