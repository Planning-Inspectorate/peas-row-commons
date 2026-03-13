import { PrismaClient, Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import PROD_AUTHORITIES from './data-authorities-prod-list.json' with { type: 'json' };

export const AUTHORITIES: Prisma.AuthorityUncheckedCreateInput[] = PROD_AUTHORITIES;

export async function seedProdAuthorities(dbClient: PrismaClient) {
	const counts = {
		created: 0,
		updated: 0,
		unchanged: 0
	};
	for (const authority of AUTHORITIES) {
		const created = await seedAuthority(dbClient, authority);
		if (created === true) {
			counts.created++;
		} else if (created === false) {
			counts.updated++;
		} else {
			counts.unchanged++;
		}
	}

	console.log('prod authorities seeding complete', counts);
}

/**
 * Processes each authority in a transaction.
 * If an authority with the same pinsCode already exists, it will be updated if the name or statusId is different.
 * If it doesn't exist, it will be created.
 *
 * The function returns true if a new authority was created, and false if an existing authority was updated or left unchanged.
 */
async function seedAuthority(
	dbClient: PrismaClient,
	authority: Prisma.AuthorityUncheckedCreateInput
): Promise<boolean | undefined> {
	return dbClient.$transaction(async ($tx) => {
		// Check if an authority with the same pinsCode already exists
		const existing = await $tx.authority.findFirst({
			where: { pinsCode: authority.pinsCode }
		});

		// If it doesn't exist, create it
		if (!existing) {
			console.log('Creating authority with pinsCode:', authority.pinsCode);
			await $tx.authority.create({ data: authority });
			return true; // created
		}

		// If it exists but has different data, update it
		if (existing.name !== authority.name || existing.statusId !== authority.statusId) {
			console.log('Updating authority with pinsCode:', authority.pinsCode);
			await $tx.authority.update({
				where: { id: existing.id },
				data: {
					name: authority.name,
					statusId: authority.statusId
				}
			});
			return false; // updated
		}
		return; // unchanged
	});
}
