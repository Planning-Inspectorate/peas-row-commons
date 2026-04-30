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
import { getUniqueProcedureFields } from '@pins/peas-row-commons-lib/util/dynamic-sections/procedures-section/procedure-section-builder.ts';
import { PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/procedures.ts';
import { formatAddress, formatDate, formatDateTime } from '@pins/peas-row-commons-lib/util/audit-formatters.ts';

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
 *
 * Uses the getUniqueProcedureFields function to determine whether
 * or not to show a procedure field.
 */
function mapProcedure(
	procedure: CaseDownloadQueryResult['Procedures'][number],
	inspectorNames: Map<string, string>
): PdfProcedure {
	const MAX_LINE_LENGTH = 100; // Standard max line logic
	const typeId = procedure.ProcedureType?.id ?? '';
	const uniqueFields = getUniqueProcedureFields(typeId);

	/**
	 * Standard logic to ensure strings don't break PDF layout
	 */
	const formatString = (val: string | null | undefined): string | null => {
		if (!val) return null;
		return val.length > MAX_LINE_LENGTH ? `${val.substring(0, MAX_LINE_LENGTH)}...` : val;
	};

	/**
	 * Helper: If field belongs to type, return value/null.
	 * If not, return undefined (to hide row in Nunjucks).
	 */
	const mapField = <T>(fieldName: string, value: T): T | null | undefined => {
		const isIncluded = uniqueFields.includes(fieldName);

		if (!isIncluded) {
			return undefined;
		}

		return value ?? null;
	};

	// Inspector logic: Hide for Admin In-House
	let resolvedInspector: string | null | undefined = undefined;
	if (typeId !== PROCEDURES_ID.ADMIN_IN_HOUSE) {
		const idpId = procedure.Inspector?.idpUserId;
		resolvedInspector = idpId ? formatString(inspectorNames.get(idpId) ?? idpId) : 'Not allocated yet';
	}

	return {
		// --- Common Fields ---
		id: typeId,
		type: formatString(procedure.ProcedureType?.displayName) ?? '-',
		status: formatString(procedure.ProcedureStatus?.displayName) ?? '-',
		inspector: resolvedInspector,
		adminType: formatString(procedure.AdminProcedureType?.displayName),
		siteVisitType: formatString(procedure.SiteVisitType?.displayName),
		siteVisitDate: formatDate(procedure.siteVisitDate),

		// --- Conditional Formats ---
		hearingFormat: mapField('hearingFormatId', formatString(procedure.HearingFormat?.displayName)),
		inquiryFormat: mapField('inquiryFormatId', formatString(procedure.InquiryFormat?.displayName)),
		conferenceFormat: mapField('conferenceFormatId', formatString(procedure.ConferenceFormat?.displayName)),
		preInquiryMeetingFormat: mapField(
			'preInquiryMeetingFormatId',
			formatString(procedure.PreInquiryMeetingFormat?.displayName)
		),
		inquiryOrConference: mapField('inquiryOrConferenceId', formatString(procedure.InquiryOrConference?.displayName)),

		// --- Venues ---
		inquiryVenue: mapField('inquiryVenue', formatAddress(procedure.InquiryVenue)),
		hearingVenue: mapField('hearingVenue', formatAddress(procedure.HearingVenue)),
		conferenceVenue: mapField('conferenceVenue', formatAddress(procedure.ConferenceVenue)),

		// --- Conditional Dates ---
		caseOfficerVerificationDate: mapField(
			'caseOfficerVerificationDate',
			formatDate(procedure.caseOfficerVerificationDate)
		),

		hearingTargetDate: mapField('hearingTargetDate', formatDate(procedure.hearingTargetDate)),
		earliestHearingDate: mapField('earliestHearingDate', formatDate(procedure.earliestHearingDate)),
		confirmedHearingDate: mapField('confirmedHearingDate', formatDate(procedure.confirmedHearingDate)),
		hearingClosedDate: mapField('hearingClosedDate', formatDate(procedure.hearingClosedDate)),
		hearingDateNotificationDate: mapField(
			'hearingDateNotificationDate',
			formatDate(procedure.hearingDateNotificationDate)
		),
		hearingVenueNotificationDate: mapField(
			'hearingVenueNotificationDate',
			formatDate(procedure.hearingVenueNotificationDate)
		),
		partiesNotifiedOfHearingDate: mapField(
			'partiesNotifiedOfHearingDate',
			formatDate(procedure.partiesNotifiedOfHearingDate)
		),

		hearingPreparationTimeDays: mapField(
			'hearingPreparationTimeDays',
			procedure.hearingPreparationTimeDays != null ? procedure.hearingPreparationTimeDays.toString() : null
		),
		hearingTravelTimeDays: mapField(
			'hearingTravelTimeDays',
			procedure.hearingTravelTimeDays != null ? procedure.hearingTravelTimeDays.toString() : null
		),
		hearingSittingTimeDays: mapField(
			'hearingSittingTimeDays',
			procedure.hearingSittingTimeDays != null ? procedure.hearingSittingTimeDays.toString() : null
		),
		hearingReportingTimeDays: mapField(
			'hearingReportingTimeDays',
			procedure.hearingReportingTimeDays != null ? procedure.hearingReportingTimeDays.toString() : null
		),

		inquiryTargetDate: mapField('inquiryTargetDate', formatDate(procedure.inquiryTargetDate)),
		earliestInquiryDate: mapField('earliestInquiryDate', formatDate(procedure.earliestInquiryDate)),
		confirmedInquiryDate: mapField('confirmedInquiryDate', formatDate(procedure.confirmedInquiryDate)),
		inquiryClosedDate: mapField('inquiryClosedDate', formatDate(procedure.inquiryClosedDate)),
		inquiryDateNotificationDate: mapField(
			'inquiryDateNotificationDate',
			formatDate(procedure.inquiryDateNotificationDate)
		),
		inquiryVenueNotificationDate: mapField(
			'inquiryVenueNotificationDate',
			formatDate(procedure.inquiryVenueNotificationDate)
		),
		partiesNotifiedOfInquiryDate: mapField(
			'partiesNotifiedOfInquiryDate',
			formatDate(procedure.partiesNotifiedOfInquiryDate)
		),

		inquiryPreparationTimeDays: mapField(
			'inquiryPreparationTimeDays',
			procedure.inquiryPreparationTimeDays != null ? procedure.inquiryPreparationTimeDays.toString() : null
		),
		inquiryTravelTimeDays: mapField(
			'inquiryTravelTimeDays',
			procedure.inquiryTravelTimeDays != null ? procedure.inquiryTravelTimeDays.toString() : null
		),
		inquirySittingTimeDays: mapField(
			'inquirySittingTimeDays',
			procedure.inquirySittingTimeDays != null ? procedure.inquirySittingTimeDays.toString() : null
		),
		inquiryReportingTimeDays: mapField(
			'inquiryReportingTimeDays',
			procedure.inquiryReportingTimeDays != null ? procedure.inquiryReportingTimeDays.toString() : null
		),

		conferenceDate: mapField('conferenceDate', formatDateTime(procedure.conferenceDate)),
		conferenceNoteSentDate: mapField('conferenceNoteSentDate', formatDate(procedure.conferenceNoteSentDate)),
		preInquiryMeetingDate: mapField('preInquiryMeetingDate', formatDateTime(procedure.preInquiryMeetingDate)),
		preInquiryNoteSentDate: mapField('preInquiryNoteSentDate', formatDate(procedure.preInquiryNoteSentDate)),

		proofsOfEvidenceReceivedDate: mapField(
			'proofsOfEvidenceReceivedDate',
			formatDate(procedure.proofsOfEvidenceReceivedDate)
		),
		statementsOfCaseReceivedDate: mapField(
			'statementsOfCaseReceivedDate',
			formatDate(procedure.statementsOfCaseReceivedDate)
		),
		inHouseDate: mapField('inHouseDate', formatDate(procedure.inHouseDate)),
		offerForWrittenRepresentationsDate: mapField(
			'offerForWrittenRepresentationsDate',
			formatDate(procedure.offerForWrittenRepresentationsDate)
		),
		deadlineForConsentDate: mapField('deadlineForConsentDate', formatDate(procedure.deadlineForConsentDate))
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
		outcomeDate: formatDate(decision.outcomeDate),
		decisionReceivedDate: formatDate(decision.decisionReceivedDate)
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
			allocatedDate: formatDate(inspector.inspectorAllocatedDate)
		};
	});

	const procedures = (caseData.Procedures ?? []).map((proc) => mapProcedure(proc, inspectorNames));

	const outcomes: PdfOutcome[] = caseData.Outcome?.CaseDecisions
		? caseData.Outcome.CaseDecisions.map((d) => mapOutcome(d, inspectorNames))
		: [];

	const outcomesDecisionType = outcomes
		.map((o) => o.decisionType)
		.filter(Boolean)
		.join(', ');

	const outcomeDates: PdfOutcomeDates | undefined = caseData.Outcome
		? {
				decisionType: outcomesDecisionType,
				partiesNotifiedDate: formatDate(caseData.Outcome.partiesNotifiedDate),
				orderDecisionDispatchDate: formatDate(caseData.Outcome.orderDecisionDispatchDate),
				sealedOrderReturnedDate: formatDate(caseData.Outcome.sealedOrderReturnedDate),
				decisionPublishedDate: formatDate(caseData.Outcome.decisionPublishedDate)
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
					start: formatDate(caseData.Abeyance.abeyanceStartDate),
					end: formatDate(caseData.Abeyance.abeyanceEndDate)
				}
			: undefined,
		siteAddress: mapAddress(caseData.SiteAddress),
		location: caseData.location ?? undefined,
		applicants,
		dates: {
			received: formatDate(caseData.receivedDate),
			start: formatDate(caseData.Dates?.startDate),
			expectedSubmission: formatDate(caseData.Dates?.expectedSubmissionDate),
			expiry: formatDate(caseData.Dates?.expiryDate),
			targetDecision: formatDate(caseData.Dates?.targetDecisionDate),
			objectionPeriodEnds: formatDate(caseData.Dates?.objectionPeriodEndsDate),
			proposedModifications: formatDate(caseData.Dates?.proposedModificationsDate),
			partiesDecisionNotificationDeadline: formatDate(caseData.Dates?.partiesDecisionNotificationDeadlineDate)
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
