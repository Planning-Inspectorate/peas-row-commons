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
	'mpg',
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
	'gis',
	'bmp',
	'dotx',
	'gif',
	'm4v',
	'ods',
	'odt',
	'pub',
	'rtf',
	'txt'
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
	'video/MP1S',
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
	'application/x-gis',
	'image/bmp',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
	'image/gif',
	'video/x-m4v',
	'application/vnd.oasis.opendocument.spreadsheet',
	'application/vnd.oasis.opendocument.text',
	'application/x-mspublisher',
	'application/rtf',
	'application/x-rtf',
	'text/richtext',
	'text/rtf',
	'text/plain'
];

/**
 * These are mime types that can be "previewed",
 * i.e. viewed in browser
 */
export const PREVIEW_MIME_TYPES = ['image/png', 'image/jpeg', 'application/pdf', 'image/gif', 'image/bmp'];

export const MAX_FILE_SIZE_IN_MB = 250;
export const MAX_FILE_SIZE = MAX_FILE_SIZE_IN_MB * 1024 * 1024; // 250MB
export const TOTAL_UPLOAD_LIMIT = 1073741824; // 1GB
export const FILE_NAME_MAX_LENGTH = 255;
// Allows: a-z, A-Z, 0-9, dot, hyphen, underscore, space, (), &, ' and prevents consecutive apostrophes which can cause issues with some file systems
export const FILE_NAMES_REGEX = /^(?!.*'')[a-zA-Z0-9.\-_ ()&']+$/;
