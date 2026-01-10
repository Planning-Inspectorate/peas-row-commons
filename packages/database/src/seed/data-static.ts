import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import {
	CASEWORK_AREAS,
	CASE_TYPES,
	CASE_SUBTYPES,
	PROCEDURES,
	INVOICE_STATUSES,
	PRIORITIES,
	ADVERTISED_MODIFICATIONS,
	INSPECTOR_BANDS,
	DECISION_TYPES,
	OUTCOMES,
	PROCEDURE_STATUSES,
	PROCEDURE_EVENT_FORMATS,
	INQUIRY_OR_CONFERENCES
} from './static_data/index.ts';
import { CASE_STATUSES } from './static_data/status.ts';

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
	for (const input of PRIORITIES) {
		await upsertReferenceData({ delegate: dbClient.casePriority, input });
	}

	for (const input of ADVERTISED_MODIFICATIONS) {
		await upsertReferenceData({ delegate: dbClient.advertisedModificationStatus, input });
	}

	for (const input of CASE_STATUSES) {
		await upsertReferenceData({ delegate: dbClient.caseStatus, input });
	}

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
		await upsertReferenceData({ delegate: dbClient.procedureType, input });
	}

	for (const input of INVOICE_STATUSES) {
		await upsertReferenceData({ delegate: dbClient.caseInvoiceSent, input });
	}

	for (const input of INSPECTOR_BANDS) {
		await upsertReferenceData({ delegate: dbClient.inspectorBand, input });
	}

	for (const input of DECISION_TYPES) {
		await upsertReferenceData({ delegate: dbClient.decisionType, input });
	}

	for (const input of OUTCOMES) {
		await upsertReferenceData({ delegate: dbClient.outcome, input });
	}

	for (const input of PROCEDURE_STATUSES) {
		await upsertReferenceData({ delegate: dbClient.procedureStatus, input });
	}

	for (const input of PROCEDURE_EVENT_FORMATS) {
		await upsertReferenceData({ delegate: dbClient.procedureEventFormat, input });
	}

	for (const input of INQUIRY_OR_CONFERENCES) {
		await upsertReferenceData({ delegate: dbClient.inquiryOrConference, input });
	}

	console.log('static data seed complete');
}
