export type CaseDetailsSection =
	| 'overview'
	| 'case-details'
	| 'team'
	| 'timetable'
	| 'key-contacts'
	| 'outcome-overview'
	| 'additional-resource-locations'
	| 'invoicing'
	| 'case-audit-log';

export type SummaryRowState = 'noDetails' | 'withDetails';

/* -------------------------------------------------------------------------- */
/*                                   Overview                                 */
/* -------------------------------------------------------------------------- */

export type OverviewRowKey =
	| 'Case type'
	| 'Subtype'
	| 'Act'
	| 'Consent sought'
	| 'Priority'
	| 'Inspector band'
	| 'Procedure(s)'
	| 'Related case(s)'
	| 'Linked case(s)';

export type OverviewAnswers = {
	relatedCases?: string[];
	linkedCases?: string[];
};

/* -------------------------------------------------------------------------- */
/*                                Case Details                                */
/* -------------------------------------------------------------------------- */

export type CaseInformationRowKey =
	| 'Case reference'
	| 'External reference'
	| 'Historical reference'
	| 'Case name'
	| 'Case status'
	| 'Abeyance period'
	| 'Advertised modification status'
	| 'Applicant or appellant'
	| 'Site address'
	| 'Site location'
	| 'Authority (LPA, OMA, CRA)';

export type CaseInformationAnswers = {
	caseReference?: string;
	externalReference?: string;
	caseName?: string;
	siteLocation?: string;
};

/* -------------------------------------------------------------------------- */
/*                                    Team                                    */
/* -------------------------------------------------------------------------- */

export type TeamRowKey = 'Case officer' | 'Inspector(s)';

export type TeamAnswers = {
	caseOfficer?: string;
	inspectors?: string[];
};

/* -------------------------------------------------------------------------- */
/*                                  Timetable                                 */
/* -------------------------------------------------------------------------- */

export type TimetableRowKey =
	| 'Expected submission date'
	| 'Case received / submitted'
	| 'Target decision date'
	| 'Start date'
	| 'Date proposed modifications advertised'
	| 'Objection period ends'
	| 'Date to notify parties of decision date'
	| 'Date decision must be issued by / expiry date';

export type TimetableAnswers = {
	receivedDate?: {
		day: string;
		month: string;
		year: string;
	};
};

/* -------------------------------------------------------------------------- */
/*                                Key Contacts                                */
/* -------------------------------------------------------------------------- */

export type KeyContactsRowKey = 'Objector(s)' | 'Contact(s)';

export type KeyContactsAnswers = {
	objectors?: string[];
	contacts?: string[];
};

/* -------------------------------------------------------------------------- */
/*                              Outcome Overview                              */
/* -------------------------------------------------------------------------- */

export type OutcomeOverviewRowKey = 'Type of decision or report';

export type OutcomeOverviewAnswers = {
	typeOfDecision?: string;
};

/* -------------------------------------------------------------------------- */
/*                       Additional Resource Locations                        */
/* -------------------------------------------------------------------------- */

export type AdditionalResourceLocationsRowKey = 'Offline document location' | 'Relevant website links';

export type AdditionalResourceLocationsAnswers = {
	offlineDocumentLocation?: string;
	relevantWebsiteLinks?: string[];
};

/* -------------------------------------------------------------------------- */
/*                                  Invoicing                                 */
/* -------------------------------------------------------------------------- */

export type InvoicingRowKey = 'Rechargeable' | 'Final cost' | 'Invoice sent' | 'Fee received';

export type InvoicingAnswers = {
	rechargeable?: string;
	finalCost?: string;
	invoiceSent?: string;
	feeReceived?: string;
};

/* -------------------------------------------------------------------------- */
/*                               Case Audit Log                               */
/* -------------------------------------------------------------------------- */

export type CaseAuditLogRowKey = 'Last modified date' | 'Last modified by' | 'Case closed date' | 'Case history';

export type CaseAuditLogAnswers = {
	lastModifiedDate?: string;
	lastModifiedBy?: string;
	caseClosedDate?: string;
	caseHistory?: string[];
};

/* -------------------------------------------------------------------------- */
/*                             Combined Row Types                             */
/* -------------------------------------------------------------------------- */

export type CaseDetailsRowKey =
	| OverviewRowKey
	| CaseInformationRowKey
	| TeamRowKey
	| TimetableRowKey
	| KeyContactsRowKey
	| OutcomeOverviewRowKey
	| AdditionalResourceLocationsRowKey
	| InvoicingRowKey
	| CaseAuditLogRowKey;

/* -------------------------------------------------------------------------- */
/*                           Section → Row Mapping                            */
/* -------------------------------------------------------------------------- */

export type CaseDetailsSectionRowMap = {
	overview: OverviewRowKey;
	'case-details': CaseInformationRowKey;
	team: TeamRowKey;
	timetable: TimetableRowKey;
	'key-contacts': KeyContactsRowKey;
	'outcome-overview': OutcomeOverviewRowKey;
	'additional-resource-locations': AdditionalResourceLocationsRowKey;
	invoicing: InvoicingRowKey;
	'case-audit-log': CaseAuditLogRowKey;
};
