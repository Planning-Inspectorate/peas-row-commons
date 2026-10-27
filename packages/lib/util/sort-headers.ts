import { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Request } from 'express';
import { UrlBuilder } from './url-builder.ts';

type SortOrder = Prisma.SortOrder;

export interface SortableColumn {
	/** The column key sent as ?sortBy= (must be an allowed field) */
	key: string;
	/** The visible header label */
	label: string;
	/** Optional govuk table cell classes */
	classes?: string;
}

export interface SortHeaderViewModel {
	html: string;
	classes?: string;
}

export function getSortHeaders(
	req: Request,
	columns: SortableColumn[],
	current: { sortField: string; sortOrder: SortOrder }
): SortHeaderViewModel[] {
	return columns.map((column) => {
		const isActive = column.key === current.sortField;
		const nextOrder: SortOrder =
			isActive && current.sortOrder === Prisma.SortOrder.asc ? Prisma.SortOrder.desc : Prisma.SortOrder.asc;

		const builder = new UrlBuilder(req.baseUrl + req.path);
		for (const [key, value] of Object.entries(req.query)) {
			// Skip sortBy, order, and page query params since we will override them
			if (key === 'sortBy' || key === 'order' || key === 'page') continue;
			if (Array.isArray(value)) {
				value.forEach((v) => builder.addQueryParam(key, String(v)));
			} else {
				builder.addQueryParam(key, String(value));
			}
		}
		builder.addQueryParam('sortBy', column.key);
		builder.addQueryParam('order', nextOrder);

		const href = builder.toString();
		const ariaSort = isActive ? (current.sortOrder === Prisma.SortOrder.asc ? 'ascending' : 'descending') : 'none';
		const arrow = isActive ? (current.sortOrder === Prisma.SortOrder.asc ? '▲' : '▼') : '';

		const html =
			`<a class="govuk-link govuk-link--no-visited-state" ` +
			`href="${href}" aria-sort="${ariaSort}">` +
			`${column.label}` +
			(arrow ? ` <span aria-hidden="true">${arrow}</span>` : '') +
			`</a>`;

		return { html, classes: column.classes };
	});
}
