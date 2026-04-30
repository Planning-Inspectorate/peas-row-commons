/** Address as displayed in PDFs */
export interface PdfAddress {
	addressLine1?: string;
	addressLine2?: string;
	townCity?: string;
	county?: string;
	postcode?: string;
}

/** Contact/person details for objector and contact list PDFs */
export interface PdfContact {
	firstName?: string;
	lastName?: string;
	orgName?: string;
	email?: string;
	telephoneNumber?: string;
	address?: PdfAddress;
	/** Only present for objectors */
	status?: string;
	/** Contact type label (e.g. "Agent", "Supporter") */
	contactType?: string;
}

/** A single procedure record for the case details PDF */
export interface PdfProcedure {
	id?: string | null;
	type?: string | null;
	status?: string | null;
	inspector?: string | null;
	adminType?: string | null;
	siteVisitType?: string | null;
	siteVisitDate?: Date | string | null;

	// Formats
	hearingFormat?: string | null;
	inquiryFormat?: string | null;
	conferenceFormat?: string | null;
	preInquiryMeetingFormat?: string | null;
	inquiryOrConference?: string | null;

	// Dates
	caseOfficerVerificationDate?: Date | string | null;
	hearingTargetDate?: Date | string | null;
	earliestHearingDate?: Date | string | null;
	confirmedHearingDate?: Date | string | null;
	hearingClosedDate?: Date | string | null;
	hearingDateNotificationDate?: Date | string | null;
	hearingVenueNotificationDate?: Date | string | null;
	partiesNotifiedOfHearingDate?: Date | string | null;

	// Decimals/Numbers
	hearingPreparationTimeDays?: string | null;
	hearingTravelTimeDays?: string | null;
	hearingSittingTimeDays?: string | null;
	hearingReportingTimeDays?: string | null;

	inquiryTargetDate?: Date | string | null;
	earliestInquiryDate?: Date | string | null;
	confirmedInquiryDate?: Date | string | null;
	inquiryClosedDate?: Date | string | null;
	inquiryDateNotificationDate?: Date | string | null;
	inquiryVenueNotificationDate?: Date | string | null;
	partiesNotifiedOfInquiryDate?: Date | string | null;
	inquiryPreparationTimeDays?: string | null;
	inquiryTravelTimeDays?: string | null;
	inquirySittingTimeDays?: string | null;
	inquiryReportingTimeDays?: string | null;
	inquiryVenue?: string | null;
	hearingVenue?: string | null;
	conferenceVenue?: string | null;

	conferenceDate?: Date | string | null;
	conferenceNoteSentDate?: Date | string | null;
	preInquiryMeetingDate?: Date | string | null;
	preInquiryNoteSentDate?: Date | string | null;

	proofsOfEvidenceReceivedDate?: Date | string | null;
	statementsOfCaseReceivedDate?: Date | string | null;
	inHouseDate?: Date | string | null;
	offerForWrittenRepresentationsDate?: Date | string | null;
	deadlineForConsentDate?: Date | string | null;
}

/** A single outcome/decision record for the case details PDF */
export interface PdfOutcome {
	decisionType?: string;
	decisionMakerType?: string;
	decisionMaker?: string;
	outcome?: string;
	outcomeDate?: Date | string;
	decisionReceivedDate?: Date | string;
}

/** Cost information for the case details PDF */
export interface PdfCosts {
	rechargeable?: boolean;
	finalCost?: string;
	feeReceived?: boolean;
	invoiceSent?: string;
}

/** Outcome-level dates (separate from individual decision dates) */
export interface PdfOutcomeDates {
	decisionType?: string;
	partiesNotifiedDate?: Date | string;
	orderDecisionDispatchDate?: Date | string;
	sealedOrderReturnedDate?: Date | string;
	decisionPublishedDate?: Date | string;
}

/** Data passed to the case-details.njk template */
export interface CaseDetailsPdfData {
	reference: string;
	caseName: string;

	// ── Overview section ──────────────────────────────────────────
	caseType?: string;
	caseSubType?: string;
	act?: string;
	consentSought?: string;
	inspectorBand?: string;

	// ── Case details section ─────────────────────────────────────
	caseStatus?: string;
	externalReference?: string;
	historicalReference?: string;
	authority?: string;
	priority?: string;
	advertisedModification?: string;
	abeyance?: {
		start?: Date | string;
		end?: Date | string;
	};
	siteAddress?: PdfAddress;
	location?: string;
	applicants: PdfContact[];

	// ── Key dates section ─────────────────────────────────────────
	dates: {
		received?: Date | string;
		start?: Date | string;
		expectedSubmission?: Date | string;
		expiry?: Date | string;
		targetDecision?: Date | string;
		objectionPeriodEnds?: Date | string;
		proposedModifications?: Date | string;
		partiesDecisionNotificationDeadline?: Date | string;
	};

	// ── Team section ─────────────────────────────────────────────
	caseOfficer?: string;
	inspectors: Array<{
		name: string;
		allocatedDate?: Date | string;
	}>;

	// ── Procedures section ───────────────────────────────────────
	procedures: PdfProcedure[];

	// ── Outcomes section ─────────────────────────────────────────
	outcomes: PdfOutcome[];
	outcomeDates?: PdfOutcomeDates;

	// ── Costs section ────────────────────────────────────────────
	costs?: PdfCosts;

	// ── Documents info section ───────────────────────────────────
	filesLocation?: string;
	relevantWebsiteLinks?: string;

	// ── Related/linked cases section ─────────────────────────────
	relatedCases: string[];
	linkedCases: Array<{
		reference: string;
		isLead: boolean;
	}>;

	generatedDate: Date;
}

/** Data passed to the objector-list.njk template */
export interface ObjectorListPdfData {
	reference: string;
	caseName: string;
	objectors: PdfContact[];
	generatedDate: Date;
}

/** Data passed to the contact-list.njk template */
export interface ContactListPdfData {
	reference: string;
	caseName: string;
	contacts: PdfContact[];
	generatedDate: Date;
}

/** A document to be included in the zip's Documents/ folder */
export interface DownloadableDocument {
	fileName: string;
	blobName: string;
	folderName: string;
}
