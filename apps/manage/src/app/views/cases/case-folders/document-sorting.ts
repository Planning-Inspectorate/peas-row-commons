import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { getSortHeaders, type SortableColumn } from '@pins/peas-row-commons-lib/util/sort-headers.ts';
import { getSortQueries } from '@pins/peas-row-commons-lib/util/sort-queries.ts';
import type { Request } from 'express';

type DocumentSortKey = 'fileName' | 'uploaded';

const DOCUMENT_SORT_COLUMNS = [
	{
		key: 'fileName',
		label: 'File name',
		classes: 'govuk-!-width-one-third'
	},
	{ key: 'uploaded', label: 'Uploaded' }
] satisfies (SortableColumn & { key: DocumentSortKey })[];

export function getDocumentSorting(req: Request, sessionKey: 'case-folder' | 'file-search') {
	const sanitisedOrderByQuery = getSortQueries<Record<DocumentSortKey, Prisma.SortOrder>>(
		req,
		{
			sortBy: 'uploaded',
			sortOrder: 'desc',
			allowedFields: DOCUMENT_SORT_COLUMNS.map((field) => field.key)
		},
		req.session.tableSorts?.[sessionKey]
	);

	req.session.tableSorts = {
		...req.session.tableSorts,
		[sessionKey]: {
			sortBy: sanitisedOrderByQuery.sortField,
			sortOrder: sanitisedOrderByQuery.sortOrder
		}
	};

	let primaryOrder: Prisma.DocumentOrderByWithRelationInput;

	switch (sanitisedOrderByQuery.sortField) {
		case 'fileName':
			primaryOrder = { fileName: sanitisedOrderByQuery.sortOrder };
			break;
		case 'uploaded':
			primaryOrder = { uploadedDate: sanitisedOrderByQuery.sortOrder };
			break;
	}

	const sortHeaders = [
		...getSortHeaders(req, DOCUMENT_SORT_COLUMNS, sanitisedOrderByQuery),
		{ text: 'Status' },
		{ text: 'Actions' }
	];

	const sortParams = new URLSearchParams();
	sortParams.set('sortBy', sanitisedOrderByQuery.sortField);
	sortParams.set('order', sanitisedOrderByQuery.sortOrder);

	return {
		sanitisedOrderByQuery,
		primaryOrder,
		sortHeaders,
		sortParams,
		sortValue: `&${sortParams.toString()}`
	};
}
