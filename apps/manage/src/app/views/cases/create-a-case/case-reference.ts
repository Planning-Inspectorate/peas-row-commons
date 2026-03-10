import type { Prisma, PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Starting number for manually created cases.
 * Cases 00001-09999 are reserved for migrated cases (from Horizon/spreadsheets).
 * Manual cases start from 10001 to avoid reference number collisions during migration.
 */
const MANUAL_CASE_START = 10001;

/**
 * Generates a unique case reference for manually created cases.
 * Finds the next available number in the manual range (10001+) for the given prefix.
 */
export async function generateCaseReference(db: DbClient, prefix: string): Promise<string> {
	const latestCase = await db.case.findFirst({
		where: {
			reference: {
				startsWith: prefix,
				gte: `${prefix}${MANUAL_CASE_START}`
			}
		},
		orderBy: {
			reference: 'desc'
		},
		select: {
			reference: true
		}
	});

	let nextId = MANUAL_CASE_START;

	if (latestCase) {
		const currentId = extractIdFromReference(latestCase.reference);
		if (currentId !== null) {
			nextId = currentId + 1;
		}
	}

	return `${prefix}${nextId}`;
}

/**
 * Takes the numerical part from the auto-generated reference
 * should always be the last part of the reference.
 *
 * E.g. DRO/ORD/000001 or PUR/000001
 */
function extractIdFromReference(reference: string): number | null {
	const parts = reference.split('/');

	if (parts.length < 2) return null;

	const idPart = parts[parts.length - 1];
	const id = parseInt(idPart);

	return isNaN(id) ? null : id;
}
