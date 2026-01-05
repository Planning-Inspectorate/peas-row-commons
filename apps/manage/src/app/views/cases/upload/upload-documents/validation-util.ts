import * as CFB from 'cfb';
import { fileTypeFromBuffer } from 'file-type';
import { PDFDocument } from 'pdf-lib';
import type { Logger } from 'pino';
import { ALLOWED_EXTENSIONS_TEXT } from '../constants.ts';
import path from 'path';

interface ValidationError {
	text: string;
	href: string;
}

/**
 * Checks that uploaded file is valid.
 * Things like size, encryption, password
 * protection, spoofing.
 */
export async function validateUploadedFile(
	file: Express.Multer.File,
	logger: Logger,
	allowedFileExtensions: string[],
	allowedMimeTypes: string[],
	maxFileSize: number
): Promise<ValidationError[]> {
	const { originalname, buffer } = file;

	const basicErrors = validateBasicAttributes(file, maxFileSize);
	if (basicErrors.length > 0) return basicErrors;

	if (!allowedMimeTypes.includes(file.mimetype)) {
		return [
			{
				text: `${originalname}: The attachment must be ${ALLOWED_EXTENSIONS_TEXT}`,
				href: '#upload-form'
			}
		];
	}

	const declaredExt = path.extname(originalname).slice(1).toLowerCase();
	if (['html', 'prj', 'gis', 'dbf', 'shp', 'shx'].includes(declaredExt)) {
		return validateSpecialFormats(file, declaredExt);
	}

	const fileTypeResult = await fileTypeFromBuffer(buffer);
	if (!fileTypeResult) {
		return [
			{
				text: `${originalname}: Could not determine file type from signature`,
				href: '#upload-form'
			}
		];
	}

	const spoofingErrors = validateFileSignature(file, fileTypeResult, allowedMimeTypes, allowedFileExtensions);
	if (spoofingErrors.length > 0) return spoofingErrors;

	const encryptionErrors = await validateEncryption(file, fileTypeResult, logger);

	return encryptionErrors;
}

/**
 * Checks for things like basic sizing, length, misleading characters etc.
 */
function validateBasicAttributes(file: Express.Multer.File, maxFileSize: number): ValidationError[] {
	const errors: ValidationError[] = [];
	const { originalname, size } = file;

	if (typeof size !== 'number' || size <= 0) {
		errors.push({
			text: `${originalname}: The attachment is empty`,
			href: '#upload-form'
		});
		return errors;
	}

	if (size > maxFileSize) {
		errors.push({
			text: `${originalname}: The attachment must be smaller than 250MB`,
			href: '#upload-form'
		});
	}

	if (originalname.length > 255) {
		errors.push({
			text: `${originalname}: The attachment name exceeds the 255 character limit`,
			href: '#upload-form'
		});
	}

	// Only allow standard characters and hyphens, underscores and spaces
	if (/[^a-zA-Z0-9.\-_ ]/.test(originalname)) {
		errors.push({
			text: `${originalname}: Filename contains special characters. Please remove these and try again.`,
			href: '#upload-form'
		});
	}

	return errors;
}

/**
 * Cross references more unique files against expected layouts.
 * If they don't match we can error.
 */
function validateSpecialFormats(file: Express.Multer.File, ext: string): ValidationError[] {
	const { originalname, buffer } = file;
	const text = buffer.toString('utf8', 0, 200).trim();
	const header = buffer.subarray(0, 8).toString('hex').toUpperCase();

	const errors: ValidationError[] = [];

	switch (ext) {
		case 'html':
			if (!text.toLowerCase().includes('<html') && !text.toLowerCase().includes('<!doctype html')) {
				errors.push({ text: `${originalname}: The attachment is not a valid .html file`, href: '#upload-form' });
			}
			break;
		case 'prj':
			if (!(text.startsWith('PROJCS[') || text.startsWith('GEOGCS['))) {
				errors.push({ text: `${originalname}: The attachment is not a valid .prj file`, href: '#upload-form' });
			}
			break;
		case 'gis':
			if (!/coordinate|longitude|latitude/i.test(text)) {
				errors.push({ text: `${originalname}: The attachment is not a valid .gis file`, href: '#upload-form' });
			}
			break;
		case 'dbf':
			if (!['03', '83', '8B', '8E'].includes(header.slice(0, 2))) {
				errors.push({ text: `${originalname}: The attachment is not a valid .dbf file`, href: '#upload-form' });
			}
			break;
		case 'shp':
		case 'shx':
			if (!header.startsWith('0000270A')) {
				errors.push({ text: `${originalname}: The attachment is not a valid .shp or .shx file`, href: '#upload-form' });
			}
			break;
	}

	return errors;
}

/**
 * Checks for spoofs or misleading file types.
 */
function validateFileSignature(
	file: Express.Multer.File,
	fileTypeResult: { ext: string; mime: string },
	allowedMimeTypes: string[],
	allowedFileExtensions: string[]
): ValidationError[] {
	const { originalname, mimetype } = file;
	const { ext, mime } = fileTypeResult;
	const errors: ValidationError[] = [];

	// No zips allowed at all
	if (ext === 'zip' || mime === 'application/zip') {
		return [
			{
				text: `${originalname}: The attachment must not be a zip file`,
				href: '#upload-form'
			}
		];
	}

	const isAllowedMime = new Set([...allowedMimeTypes, 'application/x-cfb']).has(mime);
	const isAllowedExt = new Set([...allowedFileExtensions, 'cfb']).has(ext);

	if (!isAllowedMime || !isAllowedExt) {
		const declaredExt = mimetype.split('/')[1];
		errors.push({
			text: `${originalname}: File signature mismatch: declared as .${declaredExt} (${mimetype}) but detected as .${ext} (${mime})`,
			href: '#upload-form'
		});
	}

	return errors;
}

/**
 * Blocks files encrypted by passwords.
 */
async function validateEncryption(
	file: Express.Multer.File,
	fileTypeResult: { ext: string; mime: string },
	logger: Logger
): Promise<ValidationError[]> {
	const { buffer, originalname } = file;
	const { ext, mime } = fileTypeResult;
	const errors: ValidationError[] = [];

	// Check PDF Password
	if (ext === 'pdf' || mime === 'application/pdf') {
		if (await isPdfPasswordProtected(buffer, logger)) {
			errors.push({ text: `${originalname}: File must not be password protected`, href: '#upload-form' });
		}
	}

	// Check CFB (Office) Password
	// .cfb covers legacy Office formats like .doc and .xls
	if ((ext === 'cfb' || mime === 'application/x-cfb') && isDocOrXlsEncrypted(buffer, logger)) {
		errors.push({ text: `${originalname}: File must not be password protected`, href: '#upload-form' });
	}

	return errors;
}

/**
 * Checks if a PDF is password protected
 */
async function isPdfPasswordProtected(buffer: Buffer, logger: Logger): Promise<boolean> {
	try {
		await PDFDocument.load(buffer);
		return false;
	} catch (err) {
		logger.warn({ err }, `PDF document is password protected`);
		return true;
	}
}

/**
 * Checks if word docs or excels are encrypted and rejecting if they do.
 */
function isDocOrXlsEncrypted(buffer: Buffer, logger: Logger): boolean {
	try {
		const container = CFB.parse(buffer, { type: 'buffer' });

		const hasEncryptedStream = container.FileIndex.some((entry) =>
			['encryptedstream', 'encryptedpackage', 'encryptioninfo'].includes(entry.name?.toLowerCase())
		);

		if (hasEncryptedStream) return true;

		// Word check
		const wordEntry = container.FileIndex.find((entry) => entry.name === 'WordDocument');
		if (wordEntry && wordEntry.content && wordEntry.content.length > 0x0b) {
			const content = wordEntry.content as number[];
			if ((content[0x0b] & 0x01) === 0x01) return true;
		}

		// Excel check
		const workbookEntry = container.FileIndex.find((entry) => entry.name === 'Workbook');
		if (workbookEntry && workbookEntry.content) {
			const contentBuffer = Buffer.from(workbookEntry.content as number[]);
			if (hasFilePassRecord(contentBuffer)) return true;
		}

		return false;
	} catch (err) {
		logger.error({ err }, `error parsing .doc or .xls file`);
		// Fallback, if something goes wrong then perhaps we can assume it's dodgy?
		return true;
	}
}

/**
 * Checks for FilePass which is what is used in Excel to determine a
 * encryption algorithm
 */
function hasFilePassRecord(buffer: Buffer): boolean {
	let offset = 0;
	while (offset + 4 < buffer.length) {
		const recordType = buffer.readUInt16LE(offset);
		const recordLength = buffer.readUInt16LE(offset + 2);

		// This is FILEPASS
		if (recordType === 0x002f) {
			return true;
		}

		offset += 4 + recordLength;
	}
	return false;
}
