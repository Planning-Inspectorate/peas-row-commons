import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';

/**
 * This module handles the Utils for upserting Procedures.
 *
 * Procedures are a little unique because they are a reference table that:
 * a) is bigger and has its own complex joins
 * b) In the UI has (3) procedures (with the same columns), and as such
 * passes into the BE keys that don't map to any DB columns and therefore
 * need extra pre-processing.
 */

/**
 * Converts string to camelCase
 */
const toCamelCase = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);

/**
 * Handles the addresses data structure for Procedures.
 */
const mapAddressPayload = (addressData: Record<string, any>) => {
	if (!addressData || typeof addressData !== 'object') return undefined;
	return {
		line1: addressData.addressLine1 || '',
		line2: addressData.addressLine2 || '',
		townCity: addressData.townCity || '',
		county: addressData.county || '',
		postcode: addressData.postcode || ''
	};
};

/**
 * Decides whether a field is a nested Venue relation (address) or a normal
 * field
 */
function processProcedureField(
	key: string,
	value: any,
	prefix: string,
	createData: Record<string, any>,
	updateData: Record<string, any>
) {
	const rawFieldName = key.replace(prefix, '');

	// If it ends with 'Venue' we can assume it is a joined Address field(s)
	if (rawFieldName.endsWith('Venue') && typeof value === 'object' && value !== null) {
		const address = mapAddressPayload(value);

		if (address) {
			createData[rawFieldName] = { create: address };
			updateData[rawFieldName] = { upsert: { create: address, update: address } };
		}

		return;
	}

	let dbKey = toCamelCase(rawFieldName);

	if (dbKey.endsWith('Venue') && typeof value === 'string') {
		dbKey = `${dbKey}Id`;
	}

	createData[dbKey] = value;
	updateData[dbKey] = value;
}

/**
 * Takes the Procedure payloads and connects them to the
 * existing Prisma payload ready for querying.
 */
function attachProcedureToPrismaPayload(
	prismaPayload: Prisma.CaseUpdateInput,
	caseId: string,
	suffix: string,
	createData: any,
	updateData: any
) {
	if (!prismaPayload.Procedures) {
		prismaPayload.Procedures = { upsert: [] };
	}

	if (Array.isArray(prismaPayload.Procedures.upsert)) {
		prismaPayload.Procedures.upsert.push({
			where: {
				Unique_Procedure_Step_Per_Case: {
					caseId: caseId,
					step: `Procedure${suffix}`
				}
			},
			create: createData,
			update: updateData
		});
	}
}

/**
 * Main handler for creating procedures.
 *
 * Takes the UI data in format like e.g. 'procedureOneProcedureTypeId'
 * and converts it into appropriate database columns.
 *
 * Creates relevant joins if necessary.
 *
 * Identifies correct row based on 'step' to update if so.
 */
export function handleProcedureGeneric(
	caseId: string,
	flatData: Record<string, any>,
	prismaPayload: Prisma.CaseUpdateInput,
	suffix: string
) {
	const prefix = `procedure${suffix}`;

	const relevantKeys = Object.keys(flatData).filter((key) => key.startsWith(prefix));

	if (relevantKeys.length === 0) {
		return;
	}

	const stepName = `Procedure${suffix}`;
	const createData: any = { step: stepName };
	const updateData: any = { step: stepName };

	relevantKeys.forEach((key) => {
		processProcedureField(key, flatData[key], prefix, createData, updateData);
		delete flatData[key]; // We have to clean up the keys that are used in the UI to avoid Prisma trying to insert them.
	});

	attachProcedureToPrismaPayload(prismaPayload, caseId, suffix, createData, updateData);
}
