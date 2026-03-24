/**
 * Download contacts controller.
 *
 * Fetches all contacts for a case (applicants/appellants, objectors,
 * and generic contacts), formats them as a CSV, and sends the file
 * back to the user's browser.
 */

import type { Request, Response } from 'express';
import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { PdfContact } from '../case-download/index.ts';
import { fetchCaseContactsForDownload, type CaseContactsQueryResult } from './query.ts';
import { buildContactsCsv } from './csv-builder.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/contact-type.ts';
import { stringToKebab } from '@pins/peas-row-commons-lib/util/strings.ts';
import { mapAddressDbToViewModel } from '@pins/peas-row-commons-lib/util/address.ts';

/** A single contact row as returned by the lightweight contacts query */
type QueryContact = CaseContactsQueryResult['Contacts'][number];

/**
 * Maps a Prisma contact record to a PdfContact with the contact type label.
 *
 * Applicants/appellants and objectors get a fixed label matching the UI,
 * all other contacts use the `displayName` from their ContactType row.
 */
function mapContactWithType(contact: QueryContact): PdfContact {
	let contactTypeLabel: string;

	switch (contact.contactTypeId) {
		case CONTACT_TYPE_ID.APPLICANT_APPELLANT:
			contactTypeLabel = 'Applicant / Appellant';
			break;
		case CONTACT_TYPE_ID.OBJECTOR:
			contactTypeLabel = 'Objector';
			break;
		default:
			contactTypeLabel = contact.ContactType?.displayName ?? '';
	}

	// Convert DB address into the UI-shaped address used by PdfContact
	const viewAddress = contact.Address ? (mapAddressDbToViewModel(contact.Address) ?? undefined) : undefined;

	return {
		contactType: contactTypeLabel,
		firstName: contact.firstName ?? undefined,
		lastName: contact.lastName ?? undefined,
		orgName: contact.orgName ?? undefined,
		email: contact.email ?? undefined,
		telephoneNumber: contact.telephoneNumber ?? undefined,
		address: viewAddress,
		status: contact.ObjectorStatus?.displayName ?? undefined
	};
}

/**
 * Builds the download contacts controller.
 *
 * Returns an Express request handler that fetches the case contacts
 * and sends them back as a CSV file.
 */
export function buildDownloadContacts(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;

	return async (req: Request, res: Response) => {
		const { id } = req.params;

		if (!id) {
			throw new Error('Case ID parameter is required for contact download');
		}

		logger.info({ caseId: id }, 'Starting contact download');

		const caseData = await fetchCaseContactsForDownload(db, id);

		if (!caseData) {
			logger.warn({ caseId: id }, 'Case not found for contact download');
			return;
		}

		const allContacts: PdfContact[] = (caseData.Contacts ?? []).map(mapContactWithType);

		logger.info({ caseId: id, contactCount: allContacts.length }, 'Contacts mapped for CSV download');

		const csv = buildContactsCsv(allContacts);

		const safeReference = stringToKebab(caseData.reference);
		const fileName = `${safeReference}-contacts.csv`;

		res.setHeader('Content-Type', 'text/csv; charset=utf-8');
		res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

		res.send(csv);

		logger.info({ caseId: id, reference: caseData.reference }, 'Contact CSV sent successfully');
	};
}
