import type { Prisma, PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Generates a case reference based on existing data, incrementing from the last
 */
export async function generateCaseReference(db: DbClient, prefix: string): Promise<string> {
	const latestCase = await db.case.findFirst({
		where: {
			reference: {
				startsWith: prefix
			}
		},
		orderBy: {
			reference: 'desc'
		},
		select: {
			reference: true
		}
	});

	let nextId = 1;

	if (latestCase) {
		const currentId = extractIdFromReference(latestCase.reference);
		if (currentId !== null) {
			nextId = currentId + 1;
		}
	}

	return `${prefix}${nextId.toString().padStart(5, '0')}`;
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
