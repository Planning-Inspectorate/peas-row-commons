import { AUTHORITY_STATUS_ID } from './static_data/ids/authority-status.ts';
import { PrismaClient, Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';

export const AUTHORITIES: Prisma.AuthorityUncheckedCreateInput[] = [
	{
		id: '4515ebac-65e2-4bcd-bc0b-a6fee69ae25a',
		name: 'System Test Borough Council',
		pinsCode: 'Q9999',
		authorityStatusId: AUTHORITY_STATUS_ID.LIVE
	},
	{
		id: '1a76f67e-5828-4532-bd6f-aa7ef40a13ca',
		name: 'Terminated System Test Borough Council',
		pinsCode: 'Q9998',
		authorityStatusId: AUTHORITY_STATUS_ID.TERMINATED
	}
];

export async function seedDevAuthorities(dbClient: PrismaClient) {
	await Promise.all(
		AUTHORITIES.map((authority) =>
			dbClient.authority.upsert({
				create: authority,
				update: authority,
				where: { id: authority.id }
			})
		)
	);

	console.log('seeding dev authorities complete');
}
