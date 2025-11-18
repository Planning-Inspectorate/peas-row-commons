import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { CASEWORK_AREAS, CASE_TYPES, CASE_SUBTYPES } from './static_data/index.ts';

// TODO: under no circumstances should you commit this ghastly typing
async function upsertReferenceData({ delegate, input }: any) {
	return delegate.upsert({
		create: input,
		update: input,
		where: { id: input.id }
	});
}

export async function seedStaticData(dbClient: PrismaClient) {
	await Promise.all(CASEWORK_AREAS.map((input) => upsertReferenceData({ delegate: dbClient.caseworkArea, input })));

	await Promise.all(CASE_TYPES.map((input) => upsertReferenceData({ delegate: dbClient.caseType, input })));

	await Promise.all(CASE_SUBTYPES.map((input) => upsertReferenceData({ delegate: dbClient.caseSubType, input })));

	console.log('static data seed complete');
}
