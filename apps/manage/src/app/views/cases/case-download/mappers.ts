/**
 * Data mappers for transforming Prisma case data into PDF template data.
 *
 * Each mapper takes the raw case query result and extracts/reshapes
 * only the fields needed for its corresponding Nunjucks template.
 */

import type {
	CaseDetailsPdfData,
	ObjectorListPdfData,
	ContactListPdfData,
	PdfAddress,
	PdfContact,
	PdfProcedure,
	PdfOutcome,
	PdfCosts,
	PdfOutcomeDates,
	DownloadableDocument
} from './types.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/contact-type.ts';
import { DECISION_MAKER_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/decision-maker-type.ts';
import type { CaseDownloadQueryResult } from './query.ts';
import { GENERAL_CONSTANTS } from '@pins/peas-row-commons-lib/constants/general.ts';
import { DECISION_MAKER_TYPES } from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';

/**
 * Maps a Prisma Address record to the simplified PDF address format.
 */
function mapAddress(
	address:
		| {
				line1?: string | null;
				line2?: string | null;
				townCity?: string | null;
				county?: string | null;
				postcode?: string | null;
		  }
		| null
		| undefined
): PdfAddress | undefined {
	if (!address) return undefined;

	return {
		addressLine1: address.line1 ?? undefined,
		addressLine2: address.line2 ?? undefined,
		townCity: address.townCity ?? undefined,
		county: address.county ?? undefined,
		postcode: address.postcode ?? undefined
	};
}

/**
 * Maps a Prisma Contact record to the PDF contact format.
 */
function mapContact(contact: CaseDownloadQueryResult['Contacts'][number]): PdfContact {
	return {
		firstName: contact.firstName ?? undefined,
		lastName: contact.lastName ?? undefined,
		orgName: contact.orgName ?? undefined,
		email: contact.email ?? undefined,
		telephoneNumber: contact.telephoneNumber ?? undefined,
		address: mapAddress(contact.Address),
		status: contact.ObjectorStatus?.displayName ?? undefined,
		contactType: contact.ContactType?.displayName ?? undefined
	};
}

/**
 * Maps a Prisma Procedure record to the PDF procedure format.
 */
function mapProcedure(
	procedure: CaseDownloadQueryResult['Procedures'][number],
	inspectorNames: Map<string, string>
): PdfProcedure {
	const inspectorIdpId = procedure.Inspector?.idpUserId;
	const inspectorName = inspectorIdpId ? (inspectorNames.get(inspectorIdpId) ?? inspectorIdpId) : 'Not allocated';

	return {
		type: procedure.ProcedureType?.displayName ?? undefined,
		status: procedure.ProcedureStatus?.displayName ?? undefined,
		inspector: inspectorName,
		siteVisitType: procedure.SiteVisitType?.displayName ?? undefined,
		adminType: procedure.AdminProcedureType?.displayName ?? undefined,
		siteVisitDate: procedure.siteVisitDate ?? undefined,
		hearingFormat: procedure.HearingFormat?.displayName ?? undefined,
		inquiryFormat: procedure.InquiryFormat?.displayName ?? undefined,
		conferenceFormat: procedure.ConferenceFormat?.displayName ?? undefined,
		preInquiryMeetingFormat: procedure.PreInquiryMeetingFormat?.displayName ?? undefined,
		inquiryOrConference: procedure.InquiryOrConference?.displayName ?? undefined
	};
}

/**
 * Maps a Prisma CaseDecision record to the PDF outcome format.
 *
 * Resolves the decision maker to a display name from the Entra group
 * members, falling back to the IDP user ID or role label.
 */
function mapOutcome(
	decision: CaseDownloadQueryResult['Outcome'] extends { CaseDecisions: (infer D)[] } | null ? D : never,
	inspectorNames: Map<string, string>
): PdfOutcome {
	// Resolve the decision maker name based on their type
	let decisionMaker: string | undefined;
	const makerIdpId = decision.DecisionMaker?.idpUserId;

	if (decision.decisionMakerTypeId === DECISION_MAKER_TYPE_ID.SECRETARY_OF_STATE) {
		decisionMaker = DECISION_MAKER_TYPES.find(
			(type) => type.id === DECISION_MAKER_TYPE_ID.SECRETARY_OF_STATE
		)?.displayName;
	} else if (makerIdpId) {
		decisionMaker = inspectorNames.get(makerIdpId) ?? makerIdpId;
	}

	return {
		decisionType: decision.DecisionType?.displayName ?? undefined,
		decisionMakerType: decision.DecisionMakerType?.displayName ?? undefined,
		decisionMaker,
		outcome: decision.Outcome?.displayName ?? undefined,
		outcomeDate: decision.outcomeDate ?? undefined,
		decisionReceivedDate: decision.decisionReceivedDate ?? undefined
	};
}

/**
 * Builds the data object for the "Case details" PDF template.
 *
 * Extracts every section visible on the case details page:
 * overview, case details, dates, team, procedures, outcomes,
 * costs, documents info, and related/linked cases.
 *
 * Excludes case notes and case history as per the ticket requirements.
 */
export function mapCaseDetailsData(
	caseData: CaseDownloadQueryResult,
	caseOfficerName: string | undefined,
	inspectorNames: Map<string, string>
): CaseDetailsPdfData {
	const applicants = (caseData.Contacts ?? [])
		.filter((c) => c.contactTypeId === CONTACT_TYPE_ID.APPLICANT_APPELLANT)
		.map(mapContact);

	const inspectors = (caseData.Inspectors ?? []).map((inspector) => {
		const idpUserId = inspector.Inspector?.idpUserId;
		const resolvedName = idpUserId ? inspectorNames.get(idpUserId) : undefined;

		return {
			name: resolvedName ?? idpUserId ?? 'Unknown',
			allocatedDate: inspector.inspectorAllocatedDate
		};
	});

	const procedures = (caseData.Procedures ?? []).map((proc) => mapProcedure(proc, inspectorNames));

	const outcomes: PdfOutcome[] = caseData.Outcome?.CaseDecisions
		? caseData.Outcome.CaseDecisions.map((d) => mapOutcome(d, inspectorNames))
		: [];

	const outcomeDates: PdfOutcomeDates | undefined = caseData.Outcome
		? {
				partiesNotifiedDate: caseData.Outcome.partiesNotifiedDate ?? undefined,
				orderDecisionDispatchDate: caseData.Outcome.orderDecisionDispatchDate ?? undefined,
				sealedOrderReturnedDate: caseData.Outcome.sealedOrderReturnedDate ?? undefined,
				decisionPublishedDate: caseData.Outcome.decisionPublishedDate ?? undefined
			}
		: undefined;

	const costs: PdfCosts | undefined = caseData.Costs
		? {
				rechargeable: caseData.Costs.rechargeable ?? undefined,
				finalCost: caseData.Costs.finalCost?.toString() ?? undefined,
				feeReceived: caseData.Costs.feeReceived ?? undefined,
				invoiceSent: caseData.Costs.InvoiceSent?.displayName ?? undefined
			}
		: undefined;

	const relatedCases = (caseData.RelatedCases ?? [])
		.map((rc) => rc.reference)
		.filter((ref): ref is string => ref !== null && ref !== undefined);

	const linkedCases = (caseData.LinkedCases ?? []).map((lc) => ({
		reference: lc.reference ?? GENERAL_CONSTANTS.NOT_APPLICABLE,
		isLead: lc.isLead
	}));

	return {
		reference: caseData.reference,
		caseName: caseData.name,
		caseType: caseData.Type?.displayName ?? undefined,
		caseSubType: caseData.SubType?.displayName ?? undefined,
		act: caseData.Act?.displayName ?? undefined,
		consentSought: caseData.consentSought ?? undefined,
		inspectorBand: caseData.InspectorBand?.displayName ?? undefined,
		caseStatus: caseData.Status?.displayName ?? undefined,
		externalReference: caseData.externalReference ?? undefined,
		historicalReference: caseData.historicalReference ?? undefined,
		authority: caseData.Authority?.name ?? undefined,
		priority: caseData.Priority?.displayName ?? undefined,
		advertisedModification: caseData.AdvertisedModification?.displayName ?? undefined,
		abeyance: caseData.Abeyance
			? {
					start: caseData.Abeyance.abeyanceStartDate ?? undefined,
					end: caseData.Abeyance.abeyanceEndDate ?? undefined
				}
			: undefined,
		siteAddress: mapAddress(caseData.SiteAddress),
		location: caseData.location ?? undefined,
		applicants,
		dates: {
			received: caseData.receivedDate,
			start: caseData.Dates?.startDate ?? undefined,
			expectedSubmission: caseData.Dates?.expectedSubmissionDate ?? undefined,
			expiry: caseData.Dates?.expiryDate ?? undefined,
			targetDecision: caseData.Dates?.targetDecisionDate ?? undefined,
			objectionPeriodEnds: caseData.Dates?.objectionPeriodEndsDate ?? undefined,
			proposedModifications: caseData.Dates?.proposedModificationsDate ?? undefined,
			partiesDecisionNotificationDeadline: caseData.Dates?.partiesDecisionNotificationDeadlineDate ?? undefined
		},
		caseOfficer: caseOfficerName,
		inspectors,
		procedures,
		outcomes,
		outcomeDates,
		costs,
		filesLocation: caseData.filesLocation ?? undefined,
		relevantWebsiteLinks: caseData.relevantWebsiteLinks ?? undefined,
		relatedCases,
		linkedCases,
		generatedDate: new Date()
	};
}

/**
 * Builds the data object for the "Objector list" PDF template.
 *
 * Filters contacts to only those with the Objector contact type.
 */
export function mapObjectorListData(caseData: CaseDownloadQueryResult): ObjectorListPdfData {
	const objectors = (caseData.Contacts ?? [])
		.filter((c) => c.contactTypeId === CONTACT_TYPE_ID.OBJECTOR)
		.map(mapContact);

	return {
		reference: caseData.reference,
		caseName: caseData.name,
		objectors,
		generatedDate: new Date()
	};
}

/**
 * Builds the data object for the "Contact list" PDF template.
 *
 * Filters contacts to exclude objectors and applicants/appellants,
 * since those have their own dedicated PDFs or sections.
 */
export function mapContactListData(caseData: CaseDownloadQueryResult): ContactListPdfData {
	const contacts = (caseData.Contacts ?? [])
		.filter(
			(c) => c.contactTypeId !== CONTACT_TYPE_ID.OBJECTOR && c.contactTypeId !== CONTACT_TYPE_ID.APPLICANT_APPELLANT
		)
		.map(mapContact);

	return {
		reference: caseData.reference,
		caseName: caseData.name,
		contacts,
		generatedDate: new Date()
	};
}

/**
 * Builds the list of documents to include in the zip file.
 *
 * Each document is mapped with its folder name so the zip builder
 * can create the correct subfolder structure under Documents/.
 *
 * Only non-deleted documents are included.
 */
export function mapDownloadableDocuments(caseData: CaseDownloadQueryResult): DownloadableDocument[] {
	const documents: DownloadableDocument[] = [];

	for (const folder of caseData.Folders) {
		if (folder.deletedAt) continue;

		for (const doc of folder.Documents) {
			if (doc.deletedAt) continue;

			documents.push({
				fileName: doc.fileName,
				blobName: doc.blobName,
				folderName: folder.displayName
			});
		}
	}

	return documents;
}
