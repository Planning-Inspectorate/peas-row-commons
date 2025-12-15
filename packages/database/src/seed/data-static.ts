import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { CASEWORK_AREAS, CASE_TYPES, CASE_SUBTYPES, PROCEDURES, INVOICE_STATUSES } from './static_data/index.ts';

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

/**
 * Seeds important static data (like enums) into the database.
 * Uses a for-loop as oppose to Promise.all due to some queries
 * (specifically subtypes) overloading the connection pool.
 */
export async function seedStaticData(dbClient: PrismaClient) {
	for (const input of CASEWORK_AREAS) {
		await upsertReferenceData({ delegate: dbClient.caseworkArea, input });
	}

	for (const input of CASE_TYPES) {
		await upsertReferenceData({ delegate: dbClient.caseType, input });
	}

	for (const input of CASE_SUBTYPES) {
		await upsertReferenceData({ delegate: dbClient.caseSubType, input });
	}

	for (const input of PROCEDURES) {
		await upsertReferenceData({ delegate: dbClient.caseProcedure, input });
	}

	for (const input of INVOICE_STATUSES) {
		await upsertReferenceData({ delegate: dbClient.caseInvoiceSent, input });
	}

	console.log('static data seed complete');
}
