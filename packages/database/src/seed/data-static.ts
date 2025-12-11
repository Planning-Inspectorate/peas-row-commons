import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { CASEWORK_AREAS, CASE_TYPES, CASE_SUBTYPES, PROCEDURES } from './static_data/index.ts';

type ReferenceDataInput = {
	id: string;
	[key: string]: any;
};

interface PrismaDelegate<T> {
	upsert: (args: { where: { id: string }; create: T; update: T }) => Promise<unknown>;
}

async function upsertReferenceData<T extends ReferenceDataInput>({
	delegate,
	input
}: {
	delegate: PrismaDelegate<T>;
	input: T;
}) {
	return delegate.upsert({
		create: input,
		update: input,
		where: { id: input.id }
	});
}

export async function seedStaticData(dbClient: PrismaClient) {
	await Promise.all(CASEWORK_AREAS.map((input) => upsertReferenceData({ delegate: dbClient.caseworkArea, input })));

	await Promise.all(CASE_TYPES.map((input) => upsertReferenceData({ delegate: dbClient.caseType, input })));

	for (const input of CASE_SUBTYPES) {
		await upsertReferenceData({ delegate: dbClient.caseSubType, input });
	}

	await Promise.all(PROCEDURES.map((input) => upsertReferenceData({ delegate: dbClient.caseProcedure, input })));

	console.log('static data seed complete');
}
