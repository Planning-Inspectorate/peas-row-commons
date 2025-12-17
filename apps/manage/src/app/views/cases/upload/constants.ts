import { formatExtensions } from '@pins/peas-row-commons-lib/util/upload.ts';

export const ALLOWED_EXTENSIONS = [
	'pdf',
	'doc',
	'docx',
	'ppt',
	'pptx',
	'xls',
	'xlsx',
	'xlsm',
	'msg',
	'jpg',
	'jpeg',
	'mpeg',
	'mp3',
	'mp4',
	'mov',
	'png',
	'tif',
	'tiff',
	'dbf',
	'html',
	'prj',
	'shp',
	'shx',
	'gis'
];

export const ALLOWED_EXTENSIONS_TEXT = formatExtensions(ALLOWED_EXTENSIONS);

export const ALLOWED_MIME_TYPES = [
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-excel.sheet.macroenabled.12',
	'application/vnd.ms-excel.sheet.macroEnabled.12',
	'application/vnd.ms-outlook',
	'image/jpeg',
	'video/mpeg',
	'audio/mpeg',
	'video/mp4',
	'video/quicktime',
	'image/png',
	'image/tiff',
	'application/vnd.dbf',
	'text/html',
	'application/x-prj',
	'application/x-shapefile',
	'application/x-shx',
	'application/octet-stream',
	'application/x-gis'
];

export const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250MB
export const TOTAL_UPLOAD_LIMIT = 1073741824; // 1GB
