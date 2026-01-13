import { UrlBuilder } from './url-builder.ts';
import type { Request } from 'express';

/**
 * Builds the URLs for the pagination macro
 */
function buildPageUrl(page: number, req: Request) {
	const builder = new UrlBuilder(req.baseUrl + req.path);

	for (const [key, value] of Object.entries(req.query)) {
		if (key === 'page') continue;

		if (Array.isArray(value)) {
			value.forEach((v) => builder.addQueryParam(key, String(v)));
		} else {
			builder.addQueryParam(key, String(value as string));
		}
	}

	builder.addQueryParam('page', String(page));

	return builder.toString();
}

/**
 * Generates the specific object structure required by the govukPagination macro.
 *
 * This exact functionality used to be handled inside of a nunjucks file like in Crown.
 */
export function getPaginationModel(req: Request, totalPages: number, currentPage: number) {
	const items = [];

	if (totalPages > 1) {
		items.push({
			number: 1,
			href: buildPageUrl(1, req),
			current: currentPage === 1
		});
	}

	if (currentPage > 3) {
		items.push({ ellipsis: true });
	}

	for (let i = currentPage - 1; i <= currentPage + 1; i++) {
		if (i > 1 && i < totalPages) {
			items.push({
				number: i,
				href: buildPageUrl(i, req),
				current: i === currentPage
			});
		}
	}

	if (currentPage < totalPages - 2) {
		items.push({ ellipsis: true });
	}

	if (totalPages > 1) {
		items.push({
			number: totalPages,
			href: buildPageUrl(totalPages, req),
			current: currentPage === totalPages
		});
	}

	return {
		previous: currentPage > 1 ? { href: buildPageUrl(currentPage - 1, req) } : null,
		next: currentPage < totalPages ? { href: buildPageUrl(currentPage + 1, req) } : null,
		items
	};
}
