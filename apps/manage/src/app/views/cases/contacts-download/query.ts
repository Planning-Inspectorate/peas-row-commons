import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';

/** The shape returned by {@link fetchCaseContactsForDownload} */
export type CaseContactsQueryResult = NonNullable<Awaited<ReturnType<typeof fetchCaseContactsForDownload>>>;

/**
 * Fetches just the case reference and contacts with their type, status,
 * and address — everything needed for the contacts CSV, nothing more.
 */
export async function fetchCaseContactsForDownload(db: PrismaClient, caseId: string) {
	return db.case.findUnique({
		where: { id: caseId },
		select: {
			reference: true,
			Contacts: {
				include: {
					Address: true,
					ObjectorStatus: true,
					ContactType: true
				}
			}
		}
	});
}
