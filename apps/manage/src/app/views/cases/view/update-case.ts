import { ManageService } from '#service';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import {
	type Case,
	type LinkedCase,
	Prisma,
	PrismaClient,
	type RelatedCase
} from '@pins/peas-row-commons-database/src/client/client.ts';
import { getRelationForField } from '@pins/peas-row-commons-lib/util/schema-map.ts';

import type { Request, Response } from 'express';
import type { Logger } from 'pino';
import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { yesNoToBoolean } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { JOURNEY_ID } from './journey.ts';
import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { CONTACT_MAPPINGS, handleContacts } from '@pins/peas-row-commons-lib/util/contact.ts';
import { DECISION_MAKER_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/decision-maker-type.ts';
import { AUDIT_ACTIONS, type AuditEntry, type AuditService, type AuditAction } from '../../../audit/index.ts';
import { getFieldDisplayNames } from './question-utils.ts';
import { ACT_SECTIONS } from '@pins/peas-row-commons-database/src/seed/static_data/act-sections.ts';
import { CASE_STATUS_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/status.ts';
import { remapFlattenedFieldsToArray } from '@pins/peas-row-commons-lib/util/remap-flattened-fields.ts';
import { toDateOrNull } from '@pins/peas-row-commons-lib/util/dates.ts';
import { mapProceduresToArray, sortProceduresChronologically } from './view-model.ts';
import { mapAddressViewModelToDb } from '@pins/peas-row-commons-lib/util/address.ts';
import type { AddressItem } from '@pins/peas-row-commons-lib/util/types.ts';
import { PROCEDURE_CONSTANTS } from '@pins/peas-row-commons-lib/constants/procedures.ts';
import {
	type ContactWithAddress,
	type InspectorWithUser,
	type ProcedureWithRelations,
	type DecisionWithRelations,
	resolveFieldValues,
	resolveLinkedCaseAudits,
	resolveRelatedCaseAudits,
	resolveContactAudits,
	resolveInspectorAudits,
	resolveProcedureAudits,
	resolveOutcomeAudits
} from '../../../audit/resolvers/index.ts';
import { LIST_FIELDS } from '@pins/peas-row-commons-lib/constants/audit.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/index.ts';
import { getEntraGroupMembers } from '#util/entra-groups.ts';
import { toFloat } from '@pins/peas-row-commons-lib/util/numbers.ts';

interface HandlerParams {
	req: Request;
	res: Response;
	data: Record<string, any>;
}

export function buildUpdateCase(service: ManageService, clearAnswer = false) {
	return async ({ req, data }: HandlerParams) => {
		const { db, logger, audit, getEntraClient } = service;
		const { id, section } = req.params;
		const groupIds = service.entraGroupIds;

		if (!id) {
			throw new Error(`invalid update case request, id param required (id:${id})`);
		}

		logger.info({ id }, 'case update');

		const rawAnswers = data?.answers || {};
		const updatedFieldNames = Object.keys(rawAnswers);

		if (updatedFieldNames.length === 0) {
			logger.info({ id }, 'no case updates to apply');

			return;
		}

		if (clearAnswer) {
			Object.keys(rawAnswers).forEach((key) => {
				rawAnswers[key] = null;
			});
		}

		// Fetch existing procedures if any flattened procedure fields are present
		const hasFlattenedProcedureFields = Object.keys(rawAnswers).some((key) => /^procedureDetails_\d+_/.test(key));

		if (hasFlattenedProcedureFields) {
			const existingCase = await db.case.findUnique({
				where: { id },
				include: {
					Procedures: {
						orderBy: {
							createdDate: 'asc'
						},
						include: { ProcedureType: true }
					}
				}
			});

			const sortedProcedures = sortProceduresChronologically(existingCase?.Procedures);

			remapFlattenedFieldsToArray(
				rawAnswers,
				mapProceduresToArray(sortedProcedures || []) || [],
				/^procedureDetails_(\d+)_(.+)$/,
				'procedureDetails'
			);
		}

		if (Object.keys(rawAnswers).length === 0) {
			logger.info({ id }, 'no case updates to apply');
			return;
		}

		const answersSnapshot = { ...rawAnswers };

		const formattedAnswersForQuery = mapCasePayload(rawAnswers);

		logger.info({ fields: updatedFieldNames }, 'update case input');

		const result = await updateCaseData(id, db, logger, formattedAnswersForQuery);

		if (result) {
			const userId = req?.session?.account?.localAccountId;
			const previousValues = result.previous as Record<string, unknown>;

			// Load group members once for any resolvers that need name resolution
			const groupMembers = await getEntraGroupMembers({
				logger,
				initClient: getEntraClient,
				session: req.session,
				groupIds
			});

			flattenReferenceTables(previousValues, ['Dates', 'Costs']);

			const userDisplayNameMap = new Map(groupMembers.allUsers.map((member) => [member.id, member.displayName]));

			await recordAuditEntries(
				audit,
				id,
				userId,
				previousValues,
				answersSnapshot,
				updatedFieldNames,
				userDisplayNameMap,
				logger
			);
		}

		// We clear the session after we have updated the case to avoid ghost data
		clearDataFromSession({ req, journeyId: JOURNEY_ID });

		addSessionData(req, id, { updated: { section } });

		logger.info({ id }, 'case updated');
	};
}

/**
 * Reference tables are connected in a 1-1 join to case tables, we need to take the data in those tables
 * and flatten them into the same object for recording in audit history.
 */
function flattenReferenceTables(previousValues: Record<string, unknown>, itemsToFlatten: string[]) {
	for (const itemToFlatten of itemsToFlatten) {
		const item = previousValues[itemToFlatten];

		if (item) {
			Object.assign(previousValues, item);
		}
	}
}

/**
 * Queries DB and upserts (or removes) data for specified data fields.
 * Also returns the current (unchanged) case for auditing purposes.
 */
async function updateCaseData(
	id: string,
	db: PrismaClient,
	logger: Logger,
	formattedAnswersForQuery: Prisma.CaseUpdateInput
): Promise<{ previous: Case; updated: Case } | undefined> {
	try {
		return await db.$transaction(async ($tx: Prisma.TransactionClient) => {
			const caseRow = await $tx.case.findUnique({
				where: { id },
				include: {
					Dates: true,
					SiteAddress: true,
					Abeyance: true,
					RelatedCases: true,
					LinkedCases: true,
					Contacts: { include: { Address: true } },
					CaseOfficer: true,
					Inspectors: { include: { Inspector: true } },
					Costs: true,
					Procedures: {
						include: {
							ProcedureType: true,
							ProcedureStatus: true,
							Inspector: true,
							HearingFormat: true,
							InquiryFormat: true,
							ConferenceFormat: true,
							PreInquiryMeetingFormat: true,
							InquiryOrConference: true,
							HearingVenue: true,
							InquiryVenue: true,
							ConferenceVenue: true,
							AdminProcedureType: true,
							SiteVisitType: true
						}
					},
					Outcome: {
						include: {
							CaseDecisions: {
								include: {
									DecisionType: true,
									DecisionMakerType: true,
									DecisionMaker: true,
									Outcome: true
								}
							}
						}
					}
				}
			});

			if (!caseRow) {
				throw new Error('Case not found');
			}

			const updated = await $tx.case.update({
				where: { id },
				data: formattedAnswersForQuery
			});

			return { previous: caseRow, updated };
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
export function mapCasePayload(flatData: Record<string, unknown>): Prisma.CaseUpdateInput {
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
		let value = flatData[key];

		if (key === 'finalCost') {
			value = toFloat(value);
		}

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
function handleUniqueDataCases(flatData: Record<string, unknown>, prismaPayload: Prisma.CaseUpdateInput) {
	handleAuthority(flatData, prismaPayload);
	handleAddress(flatData, prismaPayload);
	handleAbeyancePeriod(flatData, prismaPayload);
	handleInspectors(flatData, prismaPayload);
	handleContacts(flatData, prismaPayload, CONTACT_MAPPINGS);
	handleRelatedCases(flatData, prismaPayload);
	handleLinkedCases(flatData, prismaPayload);
	handleProcedureDetails(flatData, prismaPayload);
	handleBooleans(flatData);
	handleCaseOfficer(flatData, prismaPayload);
	handleOutcomes(flatData, prismaPayload);
	handleActAndSection(flatData, prismaPayload);
	updateClosedDate(flatData, prismaPayload);
}

/**
 * Handles mapping the abeyancePeriod composite field back to the
 * CaseAbeyance relation's individual date fields.
 */
export function handleAbeyancePeriod(flatData: Record<string, unknown>, prismaPayload: Prisma.CaseUpdateInput) {
	if (!Object.hasOwn(flatData, 'abeyancePeriod')) {
		return;
	}

	const period = flatData.abeyancePeriod as { start?: string | null; end?: string | null } | null;

	const abeyanceData = {
		abeyanceStartDate: toDateOrNull(period?.start),
		abeyanceEndDate: toDateOrNull(period?.end)
	};

	prismaPayload.Abeyance = {
		upsert: {
			create: abeyanceData,
			update: abeyanceData
		}
	};

	delete flatData.abeyancePeriod;
}

/**
 * Handles the creation, deletion, and updating of Outcomes, an important update to this function now means
 * that when creating a new outcome we insert the FE generated GUID as the ID, this allows us to do upserts
 * making this function a lot simpler.
 */
export function handleOutcomes(flatData: Record<string, unknown>, prismaPayload: Prisma.CaseUpdateInput) {
	if (!Object.hasOwn(flatData, 'outcomeDetails') || !Array.isArray(flatData.outcomeDetails)) {
		return;
	}

	const upserts = [];
	// Used for deleting, if an id has not been provided then we can assume it has been removed,
	// as the entire array of items is passed in for updating every save.
	const providedIds = [];

	for (const item of flatData.outcomeDetails) {
		const decisionMakerId =
			item.decisionMakerTypeId === DECISION_MAKER_TYPE_ID.OFFICER
				? item.decisionMakerOfficerId
				: item.decisionMakerTypeId === DECISION_MAKER_TYPE_ID.INSPECTOR
					? item.decisionMakerInspectorId
					: null;

		const decisionData = {
			outcomeDate: item.outcomeDate ? new Date(item.outcomeDate) : null,
			decisionReceivedDate: item.decisionReceivedDate ? new Date(item.decisionReceivedDate) : null,
			grantedWithConditionsComment: item.grantedWithConditionsComment || null,
			otherComment: item.otherComment || null,
			...(item.decisionTypeId && { DecisionType: { connect: { id: item.decisionTypeId } } }),
			...(item.decisionMakerTypeId && { DecisionMakerType: { connect: { id: item.decisionMakerTypeId } } }),
			...(item.outcomeId && { Outcome: { connect: { id: item.outcomeId } } }),
			...(decisionMakerId && {
				DecisionMaker: {
					connectOrCreate: {
						where: { idpUserId: decisionMakerId },
						create: { idpUserId: decisionMakerId }
					}
				}
			})
		};

		providedIds.push(item.id);

		upserts.push({
			where: { id: item.id },
			update: decisionData,
			create: {
				...decisionData,
				id: item.id
			}
		});
	}

	// Just in case nothing is provided and we get an `[undefined]`
	const validIds = providedIds.filter(Boolean);

	prismaPayload.Outcome = {
		upsert: {
			create: {
				CaseDecisions: {
					create: [...upserts.map((u) => u.create)]
				}
			},
			update: {
				CaseDecisions: {
					...(upserts.length > 0 && { upsert: upserts }),

					deleteMany: {
						id: { notIn: validIds }
					}
				}
			}
		}
	};

	delete flatData.outcomeDetails;
}

/**
 * Handles the creation, deletion, and updating of Procedures
 * Uses FE generated GUIDs for the ID to perform smart upserts just like the above handleOutcomes,
 * which means we can do upserts and deletions relatively simply
 */
export function handleProcedureDetails(flatData: Record<string, unknown>, prismaPayload: Prisma.CaseUpdateInput) {
	if (!Object.hasOwn(flatData, 'procedureDetails') || !Array.isArray(flatData.procedureDetails)) {
		delete flatData.procedureDetails;
		return;
	}

	const upserts = [];
	// Used for deleting, if an id has not been provided then we can assume it has been removed,
	// as the entire array of items is passed in for updating every save.
	const providedIds = [];

	for (const proc of flatData.procedureDetails) {
		const procedureData = {
			...(proc.procedureTypeId && {
				ProcedureType: { connect: { id: proc.procedureTypeId } }
			}),
			...(proc.procedureStatusId && {
				ProcedureStatus: { connect: { id: proc.procedureStatusId } }
			}),
			...(proc.adminProcedureType && {
				AdminProcedureType: { connect: { id: proc.adminProcedureType } }
			}),
			...(proc.siteVisitTypeId && {
				SiteVisitType: { connect: { id: proc.siteVisitTypeId } }
			}),

			// Scalar date fields
			siteVisitDate: toDateOrNull(proc.siteVisitDate),
			caseOfficerVerificationDate: toDateOrNull(proc.caseOfficerVerificationDate),

			// Hearing fields
			hearingTargetDate: toDateOrNull(proc.hearingTargetDate),
			earliestHearingDate: toDateOrNull(proc.earliestHearingDate),
			confirmedHearingDate: toDateOrNull(proc.confirmedHearingDate),
			hearingClosedDate: toDateOrNull(proc.hearingClosedDate),
			hearingDateNotificationDate: toDateOrNull(proc.hearingDateNotificationDate),
			hearingVenueNotificationDate: toDateOrNull(proc.hearingVenueNotificationDate),
			partiesNotifiedOfHearingDate: toDateOrNull(proc.partiesNotifiedOfHearingDate),
			// '||' because we get an empty string here, not undefined and the DB is 'Decimal?' so can't take empty string (null fine)
			hearingPreparationTimeDays: proc.hearingPreparationTimeDays || null,
			hearingTravelTimeDays: proc.hearingTravelTimeDays || null,
			hearingSittingTimeDays: proc.hearingSittingTimeDays || null,
			hearingReportingTimeDays: proc.hearingReportingTimeDays || null,

			// Inquiry fields
			inquiryTargetDate: toDateOrNull(proc.inquiryTargetDate),
			earliestInquiryDate: toDateOrNull(proc.earliestInquiryDate),
			confirmedInquiryDate: toDateOrNull(proc.confirmedInquiryDate),
			inquiryClosedDate: toDateOrNull(proc.inquiryClosedDate),
			inquiryDateNotificationDate: toDateOrNull(proc.inquiryDateNotificationDate),
			inquiryVenueNotificationDate: toDateOrNull(proc.inquiryVenueNotificationDate),
			partiesNotifiedOfInquiryDate: toDateOrNull(proc.partiesNotifiedOfInquiryDate),
			// '||' because we get an empty string here, not undefined and the DB is 'Decimal?' so can't take empty string (null fine)
			inquiryPreparationTimeDays: proc.inquiryPreparationTimeDays || null,
			inquiryTravelTimeDays: proc.inquiryTravelTimeDays || null,
			inquirySittingTimeDays: proc.inquirySittingTimeDays || null,
			inquiryReportingTimeDays: proc.inquiryReportingTimeDays || null,

			// Conference / pre-inquiry fields
			conferenceDate: toDateOrNull(proc.conferenceDate),
			conferenceNoteSentDate: toDateOrNull(proc.conferenceNoteSentDate),
			preInquiryMeetingDate: toDateOrNull(proc.preInquiryMeetingDate),
			preInquiryNoteSentDate: toDateOrNull(proc.preInquiryNoteSentDate),

			// Document dates
			proofsOfEvidenceReceivedDate: toDateOrNull(proc.proofsOfEvidenceReceivedDate),
			statementsOfCaseReceivedDate: toDateOrNull(proc.statementsOfCaseReceivedDate),
			inHouseDate: toDateOrNull(proc.inHouseDate),
			offerForWrittenRepresentationsDate: toDateOrNull(proc.offerForWrittenRepresentationsDate),
			deadlineForConsentDate: toDateOrNull(proc.deadlineForConsentDate)
		};

		const RELATION_FIELDS = [
			{ key: 'hearingFormatId', relation: 'HearingFormat' },
			{ key: 'inquiryFormatId', relation: 'InquiryFormat' },
			{ key: 'conferenceFormatId', relation: 'ConferenceFormat' },
			{ key: 'preInquiryMeetingFormatId', relation: 'PreInquiryMeetingFormat' },
			{ key: 'inquiryOrConferenceId', relation: 'InquiryOrConference' }
		];

		const relationCreate: Record<string, unknown> = {};
		const relationUpdate: Record<string, unknown> = {};

		for (const { key, relation } of RELATION_FIELDS) {
			if (proc[key]) {
				const payload = { [relation]: { connect: { id: proc[key] } } };
				Object.assign(relationCreate, payload);
				Object.assign(relationUpdate, payload);
			} else {
				Object.assign(relationUpdate, { [relation]: { disconnect: true } });
			}
		}

		const hearingPayload = getVenuePayload(proc.hearingVenue);
		const inquiryPayload = getVenuePayload(proc.inquiryVenue);
		const conferencePayload = getVenuePayload(proc.conferenceVenue);

		providedIds.push(proc.id);

		upserts.push({
			where: { id: proc.id },
			update: {
				...procedureData,
				...relationUpdate,
				...(proc.inspectorId && proc.inspectorId !== PROCEDURE_CONSTANTS.NOT_ALLOCATED
					? {
							Inspector: {
								connectOrCreate: {
									where: { idpUserId: proc.inspectorId },
									create: { idpUserId: proc.inspectorId }
								}
							}
						}
					: { Inspector: { disconnect: true } }),
				...(hearingPayload.updateVenue && { HearingVenue: hearingPayload.updateVenue }),
				...(inquiryPayload.updateVenue && { InquiryVenue: inquiryPayload.updateVenue }),
				...(conferencePayload.updateVenue && { ConferenceVenue: conferencePayload.updateVenue })
			},
			create: {
				...procedureData,
				id: proc.id,
				...relationCreate,
				...(proc.inspectorId &&
					proc.inspectorId !== PROCEDURE_CONSTANTS.NOT_ALLOCATED && {
						Inspector: {
							connectOrCreate: {
								where: { idpUserId: proc.inspectorId },
								create: { idpUserId: proc.inspectorId }
							}
						}
					}),
				...(hearingPayload.createVenue && { HearingVenue: hearingPayload.createVenue }),
				...(inquiryPayload.createVenue && { InquiryVenue: inquiryPayload.createVenue }),
				...(conferencePayload.createVenue && { ConferenceVenue: conferencePayload.createVenue })
			}
		});
	}

	// Just in case nothing is provided and we get an `[undefined]`
	const validIds = providedIds.filter(Boolean);

	prismaPayload.Procedures = {
		...(upserts.length > 0 && { upsert: upserts }),

		deleteMany: {
			id: { notIn: validIds }
		}
	};

	delete flatData.procedureDetails;
}

/**
 * Determines whether to return a create / update based on
 * whether we already have an ID for the address
 */
function getVenuePayload(venue: AddressItem) {
	if (!venue) return { createVenue: undefined, updateVenue: undefined };

	const mappedVenue = mapAddressViewModelToDb(venue);

	if (venue.id) {
		return {
			createVenue: { connect: { id: venue.id } },
			updateVenue: { update: mappedVenue }
		};
	}

	return {
		createVenue: { create: mappedVenue },
		updateVenue: { create: mappedVenue }
	};
}

/**
 * Handles connecting or creating a Case Officer based on their Entra ID.
 */
function handleCaseOfficer(flatData: Record<string, any>, prismaPayload: Prisma.CaseUpdateInput) {
	if (flatData.caseOfficerId) {
		prismaPayload.CaseOfficer = {
			connectOrCreate: {
				where: { idpUserId: flatData.caseOfficerId },
				create: { idpUserId: flatData.caseOfficerId }
			}
		};

		delete flatData.caseOfficerId;
	}
}

/**
 * Handles the deletion and creation of linked cases
 */
function handleLinkedCases(flatData: Record<string, any>, prismaPayload: Prisma.CaseUpdateInput) {
	if (!Object.hasOwn(flatData, 'linkedCaseDetails')) return;

	const newLinkedCases = flatData.linkedCaseDetails.map((linkedCase: any) => ({
		reference: linkedCase.linkedCaseReference,
		isLead: yesNoToBoolean(linkedCase.linkedCaseIsLead)
	}));

	// TODO: deleteMany wipes the current LinkedCases and then we replace
	// them with the current cases + any new ones. This will need to change
	// when we do case history.
	prismaPayload.LinkedCases = {
		deleteMany: {},
		create: newLinkedCases
	};

	delete flatData.linkedCaseDetails;
}

/**
 * Handles the deletion and creation of related cases
 */
function handleRelatedCases(flatData: Record<string, any>, prismaPayload: Prisma.CaseUpdateInput) {
	if (!Object.hasOwn(flatData, 'relatedCaseDetails')) return;

	const newRelatedCases = flatData.relatedCaseDetails.map((relatedCase: any) => ({
		reference: relatedCase.relatedCaseReference
	}));

	// TODO: deleteMany wipes the current RelatedCases and then we replace
	// them with the current cases + any new ones. This will need to change
	// when we do case history.
	prismaPayload.RelatedCases = {
		deleteMany: {},
		create: newRelatedCases
	};

	delete flatData.relatedCaseDetails;
}

function handleBooleans(flatData: Record<string, any>) {
	if (Object.hasOwn(flatData, 'isFencingPermanent')) {
		flatData.isFencingPermanent = yesNoToBoolean(flatData.isFencingPermanent);
	}
}

/**
 * Handles the creation and deletion of inspectors.
 */
function handleInspectors(flatData: Record<string, any>, prismaPayload: Prisma.CaseUpdateInput) {
	if (!Object.hasOwn(flatData, 'inspectorDetails')) return;

	const newInspectors = flatData.inspectorDetails.map(
		(inspector: { inspectorId: string; inspectorAllocatedDate: string }) => ({
			Inspector: {
				connectOrCreate: {
					where: { idpUserId: inspector.inspectorId },
					create: { idpUserId: inspector.inspectorId }
				}
			},
			inspectorAllocatedDate: inspector.inspectorAllocatedDate
		})
	);

	// TODO: deleteMany wipes the current Inspectors and then we replace
	// them with the current inspectors + any new ones. This will need to change
	// when we do case history.
	prismaPayload.Inspectors = {
		deleteMany: {},
		create: newInspectors
	};

	delete flatData.inspectorDetails;
}

/**
 * Handles mapping the authority data fields to the db fields.
 */
function handleAuthority(flatData: Record<string, any>, prismaPayload: Prisma.CaseUpdateInput) {
	if (!Object.hasOwn(flatData, 'authorityName')) return;

	prismaPayload.Authority = { connect: { id: flatData.authorityName } };

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

/**
 * Handles mapping the act/section data fields to the db fields.
 */
function handleActAndSection(flatData: Record<string, unknown>, prismaPayload: Prisma.CaseUpdateInput) {
	if (!Object.hasOwn(flatData, 'act')) return;

	const submittedId = flatData.act;
	const actSection = ACT_SECTIONS.find((mapping) => mapping.id === submittedId);

	const actId = actSection?.actId;
	const sectionId = actSection?.sectionId;

	if (actId) {
		prismaPayload.Act = { connect: { id: actId } };
	} else {
		prismaPayload.Act = { disconnect: true };
	}

	if (sectionId) {
		prismaPayload.Section = { connect: { id: sectionId } };
	} else {
		prismaPayload.Section = { disconnect: true };
	}

	delete flatData.act;
}

const CLOSED_STATUS_IDS = new Set([
	CASE_STATUS_ID.INVALID,
	CASE_STATUS_ID.REJECTED,
	CASE_STATUS_ID.CLOSED,
	CASE_STATUS_ID.CANCELLED,
	CASE_STATUS_ID.WITHDRAWN,
	CASE_STATUS_ID.CLOSED_OPENED_IN_ERROR
]);

/**
 * Updates the closedDate based on the status, if the status is one of the closed ones we updated it.
 * If the status has been changed to a different status not closed, we reset it to null. If the status
 * is being set to null (i.e. they are removing the status completely) then we set closed date to null too.
 */
function updateClosedDate(flatData: Record<string, unknown>, prismaPayload: Prisma.CaseUpdateInput) {
	const { statusId } = flatData;

	// undefined means that the user is simply changing a random field unrelated to status
	if (statusId === undefined) {
		return;
	}

	if (typeof statusId === 'string' && CLOSED_STATUS_IDS.has(statusId)) {
		prismaPayload.closedDate = new Date();
	} else {
		prismaPayload.closedDate = null;
	}
}

/**
 * Records all audit entries for a case update.
 *
 * Extracted from buildUpdateCase to keep the main handler focused on
 * the DB update, and to make the audit logic independently testable.
 *
 * Handles two categories of fields:
 *   1. Scalar fields — compared individually via resolveFieldValues
 *   2. List fields — diffed via entity-specific resolvers (contacts, inspectors, etc.)
 *
 * Wrapped in try/catch so audit failures never block the user's operation —
 * the case data has already been saved by the time this runs.
 */
async function recordAuditEntries(
	audit: AuditService,
	caseId: string,
	userId: string | undefined,
	previousValues: Record<string, unknown>,
	answersSnapshot: Record<string, unknown>,
	updatedFieldNames: string[],
	userDisplayNameMap: Map<string, string>,
	logger: Logger
): Promise<void> {
	try {
		const allAuditEntries: AuditEntry[] = [];

		// ── Scalar fields ────────────────────────────────────────────────
		for (const fieldName of updatedFieldNames) {
			if (LIST_FIELDS.has(fieldName)) {
				continue;
			}

			const { oldValue, newValue } = resolveFieldValues(fieldName, previousValues, answersSnapshot[fieldName], {
				userDisplayNameMap
			});

			if (oldValue === newValue) {
				continue;
			}

			let action: AuditAction;

			if (oldValue === '-') {
				action = AUDIT_ACTIONS.FIELD_SET;
			} else if (newValue === '-') {
				action = AUDIT_ACTIONS.FIELD_CLEARED;
			} else {
				action = AUDIT_ACTIONS.FIELD_UPDATED;
			}

			allAuditEntries.push({
				caseId,
				action,
				userId,
				metadata: {
					fieldName: getFieldDisplayNames([fieldName]),
					oldValue,
					newValue
				}
			});
		}

		// ── List fields ──────────────────────────────────────────────────
		// Each list-type field is diffed separately via its own resolver,
		// producing add/update/delete entries as appropriate.

		if (answersSnapshot.relatedCaseDetails) {
			allAuditEntries.push(
				...resolveRelatedCaseAudits(
					caseId,
					userId,
					(previousValues.RelatedCases as RelatedCase[]) ?? [],
					answersSnapshot.relatedCaseDetails as { relatedCaseReference: string }[]
				)
			);
		}

		if (answersSnapshot.linkedCaseDetails) {
			allAuditEntries.push(
				...resolveLinkedCaseAudits(
					caseId,
					userId,
					(previousValues.LinkedCases as LinkedCase[]) ?? [],
					answersSnapshot.linkedCaseDetails as {
						linkedCaseReference: string;
						linkedCaseIsLead: string;
					}[]
				)
			);
		}

		if (answersSnapshot.applicantDetails) {
			allAuditEntries.push(
				...resolveContactAudits(
					caseId,
					userId,
					(previousValues.Contacts as ContactWithAddress[])?.filter(
						(c) => c.contactTypeId === CONTACT_TYPE_ID.APPLICANT_APPELLANT
					) ?? [],
					answersSnapshot.applicantDetails as Record<string, unknown>[],
					'applicant',
					{
						added: AUDIT_ACTIONS.APPLICANT_ADDED,
						updated: AUDIT_ACTIONS.APPLICANT_UPDATED,
						deleted: AUDIT_ACTIONS.APPLICANT_DELETED
					}
				)
			);
		}

		if (answersSnapshot.objectorDetails) {
			allAuditEntries.push(
				...resolveContactAudits(
					caseId,
					userId,
					(previousValues.Contacts as ContactWithAddress[])?.filter(
						(c) => c.contactTypeId === CONTACT_TYPE_ID.OBJECTOR
					) ?? [],
					answersSnapshot.objectorDetails as Record<string, unknown>[],
					'objector',
					{
						added: AUDIT_ACTIONS.OBJECTOR_ADDED,
						updated: AUDIT_ACTIONS.OBJECTOR_UPDATED,
						deleted: AUDIT_ACTIONS.OBJECTOR_DELETED
					}
				)
			);
		}

		if (answersSnapshot.contactDetails) {
			allAuditEntries.push(
				...resolveContactAudits(
					caseId,
					userId,
					(previousValues.Contacts as ContactWithAddress[])?.filter(
						(c) =>
							c.contactTypeId !== CONTACT_TYPE_ID.OBJECTOR && c.contactTypeId !== CONTACT_TYPE_ID.APPLICANT_APPELLANT
					) ?? [],
					answersSnapshot.contactDetails as Record<string, unknown>[],
					'contact',
					{
						added: AUDIT_ACTIONS.CONTACT_ADDED,
						updated: AUDIT_ACTIONS.CONTACT_UPDATED,
						deleted: AUDIT_ACTIONS.CONTACT_DELETED
					}
				)
			);
		}

		if (answersSnapshot.inspectorDetails) {
			allAuditEntries.push(
				...resolveInspectorAudits(
					caseId,
					userId,
					(previousValues.Inspectors as InspectorWithUser[]) ?? [],
					answersSnapshot.inspectorDetails as {
						inspectorId: string;
						inspectorAllocatedDate: string;
					}[],
					userDisplayNameMap
				)
			);
		}

		if (answersSnapshot.procedureDetails) {
			allAuditEntries.push(
				...resolveProcedureAudits(
					caseId,
					userId,
					(previousValues.Procedures as ProcedureWithRelations[]) ?? [],
					answersSnapshot.procedureDetails as Record<string, unknown>[],
					userDisplayNameMap
				)
			);
		}

		if (answersSnapshot.outcomeDetails) {
			allAuditEntries.push(
				...resolveOutcomeAudits(
					caseId,
					userId,
					(previousValues.Outcome as { CaseDecisions?: DecisionWithRelations[] })?.CaseDecisions ?? [],
					answersSnapshot.outcomeDetails as Record<string, unknown>[],
					userDisplayNameMap
				)
			);
		}

		await audit.recordMany(allAuditEntries);
	} catch (error: unknown) {
		// Audit failures should never block the user's operation.
		// The case data has already been saved successfully above.
		logger.error({ error, caseId }, 'Failed to record audit events');
	}
}
