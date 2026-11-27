import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { CLOSED_STATUSES } from '@pins/peas-row-commons-lib/constants/statuses.ts';
import { stringToKebab } from '@pins/peas-row-commons-lib/util/strings.ts';
import { formatBytes } from '@pins/peas-row-commons-lib/util/upload.ts';
import { determineDefaultStatuses } from '@pins/peas-row-commons-lib/util/user-document-status.ts';
import { formatInTimeZone } from 'date-fns-tz';
import type { PREVIEW_MIME_TYPES } from '../../upload/constants.ts';

interface DocumentStatusTag {
	text: string;
	classes: string;
	attributes: { 'data-cy': string };
}

export interface DocumentViewModel {
	id: string;
	fileName: string;
	fileType: string;
	size: string;
	sizeSort: number;
	date: string;
	dateSort: number;
	downloadHref: string;
	caseId: string;
	folder: {
		id: string;
		displayName: string;
	};
	isRead: boolean;
	isFlagged: boolean;
	statusTags: DocumentStatusTag[];
}

export type DocumentWithFolder = Prisma.DocumentGetPayload<{
	include: {
		Folder: true;
		UserDocuments: true;
	};
}>;

export type DocumentWithUserDocuments = Prisma.DocumentGetPayload<{
	select: {
		UserDocuments: {
			select: {
				readStatus: true;
				flaggedStatus: true;
			};
		};
	};
}>;

export function createDocumentsViewModel(
	documents: DocumentWithFolder[],
	caseRow: Prisma.CaseGetPayload<{ select: { reference: true; name: true; legacyCaseId: true; statusId: true } }>,
	previewMimeTypes: typeof PREVIEW_MIME_TYPES
): DocumentViewModel[] {
	return documents.map((doc) => {
		const dateObj = new Date(doc.uploadedDate);
		const sizeNum = Number(doc.size);

		// UserDocuments is an array but we filter by userId & documentId, so there will only ever be max 1 item.
		const [userState] = doc.UserDocuments || [];

		const { defaultIsRead, defaultIsFlagged } = determineDefaultStatuses({
			legacyCaseId: caseRow.legacyCaseId,
			statusId: caseRow.statusId,
			closedStatuses: CLOSED_STATUSES
		});

		const isRead = userState ? userState.readStatus : defaultIsRead;
		const isFlagged = userState ? userState.flaggedStatus : defaultIsFlagged;
		const statusTags = getStatusTags({ docId: doc.id, isRead, isFlagged, scanStatus: doc.scanStatus });
		const isDownloadable = doc.scanStatus === 'pass';

		return {
			id: doc.id,
			fileName: doc.fileName,
			fileType: getFileExtension(doc.fileName),
			size: formatBytes(sizeNum),
			sizeSort: sizeNum,
			date: formatInTimeZone(doc.uploadedDate, 'Europe/London', 'dd MMM yyyy'),
			dateSort: dateObj.getTime(),
			downloadHref: isDownloadable ? `/documents/${doc.id}/download` : undefined,
			isPreview: previewMimeTypes.includes(doc.mimeType),
			caseId: doc.caseId,
			folder: {
				id: doc.Folder.id,
				displayName: stringToKebab(doc.Folder.displayName)
			},
			isRead,
			isFlagged,
			statusTags
		};
	});
}

function getStatusTags({
	docId,
	isRead,
	isFlagged,
	scanStatus
}: {
	docId: string;
	isRead: boolean;
	isFlagged: boolean;
	scanStatus: string;
}): DocumentStatusTag[] {
	const tags = [getPrimaryStatusTag(docId, isRead, scanStatus)];
	// Other tags can be shown even if the virus scan does not pass
	if (isFlagged) {
		tags.push({
			text: 'Flagged',
			classes: 'govuk-tag--orange',
			attributes: { 'data-cy': `status-flagged-${docId}` }
		});
	}
	return tags;
}

/**
 * Return the primary status tag for a document.
 * Virus scan status should always take precedence over any other status here.
 */
function getPrimaryStatusTag(docId: string, isRead: boolean, scanStatus: string): DocumentStatusTag {
	if (scanStatus === 'fail') {
		return {
			text: 'Virus found',
			classes: 'govuk-tag--red',
			attributes: { 'data-cy': `status-virus-found-${docId}` }
		};
	}

	if (scanStatus === 'pass') {
		return getReadStatusTag(docId, isRead);
	}

	return {
		text: 'Virus scanning',
		classes: 'govuk-tag--yellow',
		attributes: { 'data-cy': `status-scanning-${docId}` }
	};
}

function getReadStatusTag(docId: string, isRead: boolean): DocumentStatusTag {
	return {
		text: isRead ? 'Read' : 'Unread',
		classes: `govuk-tag--${isRead ? 'green' : 'blue'}`,
		attributes: { 'data-cy': `status-${isRead ? 'read' : 'unread'}-${docId}` }
	};
}

function getFileExtension(fileName: string): string {
	return fileName.split('.').pop()?.toUpperCase() || '';
}
