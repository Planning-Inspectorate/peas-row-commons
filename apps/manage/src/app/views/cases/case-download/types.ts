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
	type?: string;
	status?: string;
	inspector?: string;
	siteVisitType?: string;
	adminType?: string;
	siteVisitDate?: Date | string;
	hearingFormat?: string;
	inquiryFormat?: string;
	conferenceFormat?: string;
	preInquiryMeetingFormat?: string;
	inquiryOrConference?: string;
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
