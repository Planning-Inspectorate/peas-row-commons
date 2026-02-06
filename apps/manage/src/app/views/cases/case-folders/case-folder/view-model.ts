import { formatBytes } from '@pins/peas-row-commons-lib/util/upload.ts';
import { formatInTimeZone } from 'date-fns-tz';
import { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { PREVIEW_MIME_TYPES } from '../../upload/constants.ts';
import { stringToKebab } from '@pins/peas-row-commons-lib/util/strings.ts';

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
}

export type DocumentWithFolder = Prisma.DocumentGetPayload<{
	include: {
		Folder: true;
	};
}>;

export function createDocumentsViewModel(
	documents: DocumentWithFolder[],
	previewMimeTypes: typeof PREVIEW_MIME_TYPES
): DocumentViewModel[] {
	return documents.map((doc) => {
		const dateObj = new Date(doc.uploadedDate);
		const sizeNum = Number(doc.size);

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
			}
		};
	});
}

function getFileExtension(fileName: string): string {
	return fileName.split('.').pop()?.toUpperCase() || '';
}
