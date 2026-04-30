/**
 * Prisma query for fetching all case data needed for the download zip.
 *
 * This is a dedicated query rather than reusing the journey middleware's
 * query, because the download needs a different shape of data:
 * - It needs Folders → Documents (for the zip's document tree)
 * - It does NOT need Notes or case history
 * - It needs fewer includes overall, keeping the query lighter
 *
 * It DOES include all the data needed to match every section visible
 * on the case details page: overview, case details, dates, team,
 * procedures, outcomes, costs, and documents info.
 */

import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';

/**
 * The shape returned by {@link fetchCaseForDownload}.
 *
 * This type is inferred from the Prisma query's `include` clause,
 * giving us full type safety without manual interface duplication.
 */
export type CaseDownloadQueryResult = NonNullable<Awaited<ReturnType<typeof fetchCaseForDownload>>>;

/**
 * Fetches all case data required for generating the download zip.
 */
export async function fetchCaseForDownload(db: PrismaClient, caseId: string) {
	return db.case.findUnique({
		where: { id: caseId },
		include: {
			Type: true,
			SubType: true,
			Status: true,
			Priority: true,
			Authority: true,
			SiteAddress: true,
			Dates: true,
			CaseOfficer: true,
			InspectorBand: true,
			Act: true,
			Section: true,
			Abeyance: true,
			AdvertisedModification: true,
			Costs: {
				include: {
					InvoiceSent: true
				}
			},
			Inspectors: {
				include: {
					Inspector: true
				}
			},
			Contacts: {
				include: {
					Address: true,
					ObjectorStatus: true,
					ContactType: true
				}
			},
			Procedures: {
				orderBy: { createdDate: 'asc' },
				include: {
					ProcedureType: true,
					ProcedureStatus: true,
					Inspector: true,
					SiteVisitType: true,
					AdminProcedureType: true,
					HearingFormat: true,
					InquiryFormat: true,
					ConferenceFormat: true,
					PreInquiryMeetingFormat: true,
					InquiryOrConference: true,
					HearingVenue: true,
					InquiryVenue: true,
					ConferenceVenue: true
				}
			},
			Outcome: {
				include: {
					CaseDecisions: {
						orderBy: { createdDate: 'asc' },
						include: {
							DecisionType: true,
							DecisionMakerType: true,
							Outcome: true,
							DecisionMaker: true
						}
					}
				}
			},
			Folders: {
				where: { deletedAt: null },
				include: {
					Documents: {
						where: { deletedAt: null },
						orderBy: { uploadedDate: 'asc' }
					}
				},
				orderBy: { displayOrder: 'asc' }
			},
			RelatedCases: true,
			LinkedCases: true
		}
	});
}
