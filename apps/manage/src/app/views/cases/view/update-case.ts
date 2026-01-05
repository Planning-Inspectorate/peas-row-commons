import { ManageService } from '#service';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { Prisma, PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { getRelationForField } from '@pins/peas-row-commons-lib/util/schema-map.ts';

import type { Request, Response } from 'express';
import type { Logger } from 'pino';
import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';

interface HandlerParams {
	req: Request;
	res: Response;
	data: Record<string, any>;
}

export function buildUpdateCase(service: ManageService, clearAnswer = false) {
	return async ({ req, data }: HandlerParams) => {
		const { db, logger } = service;
		const { id } = req.params;

		if (!id) {
			throw new Error(`invalid update case request, id param required (id:${id})`);
		}

		logger.info({ id }, 'case update');

		const rawAnswers = data?.answers || {};

		if (clearAnswer) {
			Object.keys(rawAnswers).forEach((key) => {
				rawAnswers[key] = null;
			});
		}

		if (Object.keys(rawAnswers).length === 0) {
			logger.info({ id }, 'no case updates to apply');
			return;
		}

		const formattedAnswersForQuery = mapCasePayload(rawAnswers);

		formattedAnswersForQuery.updatedDate = new Date();

		logger.info({ fields: Object.keys(rawAnswers) }, 'update case input');

		await updateCaseData(id, db, logger, formattedAnswersForQuery);

		addSessionData(req, id, { updated: true });

		logger.info({ id }, 'case updated');
	};
}

/**
 * Queries DB and upserts (or removes) data for specified data fields.
 */
async function updateCaseData(
	id: string,
	db: PrismaClient,
	logger: Logger,
	formattedAnswersForQuery: Prisma.CaseUpdateInput
) {
	try {
		await db.$transaction(async ($tx: Prisma.TransactionClient) => {
			const caseRow = await $tx.case.findUnique({
				where: { id }
			});

			if (!caseRow) {
				throw new Error('Case not found');
			}

			await $tx.case.update({
				where: { id },
				data: formattedAnswersForQuery
			});
		});
	} catch (error: any) {
		wrapPrismaError({
			error,
			logger,
			message: 'updating case',
			logParams: { id }
		});
	}
}

/**
 * Takes a flat object of keys, and creates the correct nested structure needed for
 * DB upsert.
 *
 * It explicitly handles complex multi-field objects (Applicant, Authority, SiteAddress)
 * first, then passes any remaining keys to the generic mapping logic.
 */
export function mapCasePayload(flatData: Record<string, any>): Prisma.CaseUpdateInput {
	const prismaPayload: Prisma.CaseUpdateInput = {};

	handleUniqueDataCases(flatData, prismaPayload);

	const [mainTableData, nestedData] = parseDataToCorrectTable(flatData);
	const genericPayload = generateNestedQuery(mainTableData, nestedData);

	return { ...prismaPayload, ...genericPayload };
}

/**
 * Separates out the data into 2 groups: data on main Case table
 * and data on a secondary sub table (e.g. Dates)
 */
function parseDataToCorrectTable(flatData: Record<string, any>) {
	const mainTableData: Record<string, any> = {};
	const nestedData: Record<string, Record<string, any>> = {};

	Object.keys(flatData).forEach((key) => {
		const relation = getRelationForField(key);
		const value = flatData[key];

		if (relation) {
			// Creates a nested key for the sub-table
			if (!nestedData[relation]) nestedData[relation] = {};
			nestedData[relation][key] = value;
		} else {
			// Otherwise we can assume it is on the main table
			mainTableData[key] = value;
		}
	});

	return [mainTableData, nestedData];
}

/**
 * Creates the payload ready to upsert based on the two data sets (main vs nested).
 */
function generateNestedQuery(mainTableData: Record<string, any>, nestedData: Record<string, Record<string, any>>) {
	const prismaPayload: Prisma.CaseUpdateInput = { ...mainTableData };

	Object.entries(nestedData).forEach(([relationName, data]) => {
		(prismaPayload as any)[relationName] = {
			upsert: {
				create: data,
				update: data
			}
		};
	});

	return prismaPayload;
}

/**
 * Handles all the unique data cases that require creating new tables or deleting the tables.
 */
function handleUniqueDataCases(flatData: Record<string, any>, prismaPayload: Prisma.CaseUpdateInput) {
	handleApplicant(flatData, prismaPayload);
	handleAuthority(flatData, prismaPayload);
	handleAddress(flatData, prismaPayload);
}

/**
 * Handles mapping the applicant or server data to the db fields.
 */
function handleApplicant(flatData: Record<string, any>, prismaPayload: Prisma.CaseUpdateInput) {
	if (!Object.hasOwn(flatData, 'applicantName')) return;

	const applicantData = {
		name: flatData.applicantName
	};

	prismaPayload.Applicant = {
		upsert: {
			create: applicantData,
			update: applicantData
		}
	};

	delete flatData.applicantName;
}

/**
 * Handles mapping the authority data fields to the db fields.
 */
function handleAuthority(flatData: Record<string, any>, prismaPayload: Prisma.CaseUpdateInput) {
	if (!Object.hasOwn(flatData, 'authorityName')) return;

	const authorityData = {
		name: flatData.authorityName
	};

	prismaPayload.Authority = {
		upsert: {
			create: authorityData,
			update: authorityData
		}
	};

	delete flatData.authorityName;
}

/**
 * Handles mapping address data fields to db fields.
 */
function handleAddress(flatData: Record<string, any>, prismaPayload: Prisma.CaseUpdateInput) {
	if (!flatData.siteAddress) return;

	const address = flatData.siteAddress;

	const addressData = {
		line1: address.addressLine1,
		line2: address.addressLine2,
		townCity: address.townCity,
		county: address.county,
		postcode: address.postcode
	};

	prismaPayload.SiteAddress = {
		upsert: {
			create: addressData,
			update: addressData
		}
	};

	delete flatData.siteAddress;
}
