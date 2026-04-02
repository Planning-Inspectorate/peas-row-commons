import { formatBytes } from '@pins/peas-row-commons-lib/util/upload.ts';
import { formatInTimeZone } from 'date-fns-tz';
import { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { PREVIEW_MIME_TYPES } from '../../upload/constants.ts';
import { stringToKebab } from '@pins/peas-row-commons-lib/util/strings.ts';
import { determineDefaultStatuses } from '@pins/peas-row-commons-lib/util/user-document-status.ts';
import { CLOSED_STATUSES } from '@pins/peas-row-commons-lib/constants/statuses.ts';

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

		return {
			id: doc.id,
			fileName: doc.fileName,
			fileType: getFileExtension(doc.fileName),
			size: formatBytes(sizeNum),
			sizeSort: sizeNum,
			date: formatInTimeZone(doc.uploadedDate, 'Europe/London', 'dd MMM yyyy'),
			dateSort: dateObj.getTime(),
			downloadHref: `/documents/${doc.id}/download`,
			isPreview: previewMimeTypes.includes(doc.mimeType),
			caseId: doc.caseId,
			folder: {
				id: doc.Folder.id,
				displayName: stringToKebab(doc.Folder.displayName)
			},
			isRead: userState ? userState.readStatus : defaultIsRead,
			isFlagged: userState ? userState.flaggedStatus : defaultIsFlagged
		};
	});
}

function getFileExtension(fileName: string): string {
	return fileName.split('.').pop()?.toUpperCase() || '';
}
