import { ManageService } from '#service';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { type Case, Prisma, PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { getRelationForField } from '@pins/peas-row-commons-lib/util/schema-map.ts';

import type { Request, Response } from 'express';
import type { Logger } from 'pino';
import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { yesNoToBoolean } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { JOURNEY_ID } from './journey.ts';
import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { CONTACT_MAPPINGS, handleContacts } from '@pins/peas-row-commons-lib/util/contact.ts';
import { DECISION_MAKER_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/decision-maker-type.ts';
import { AUDIT_ACTIONS } from '../../../audit/index.ts';
import { getFieldDisplayNames } from './question-utils.ts';
import { ACT_SECTIONS } from '@pins/peas-row-commons-database/src/seed/static_data/act-sections.ts';
import { CASE_STATUS_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/status.ts';
import { remapFlattenedFieldsToArray } from '@pins/peas-row-commons-lib/util/remap-flattened-fields.ts';
import { toDateOrNull } from '@pins/peas-row-commons-lib/util/dates.ts';
import { mapProceduresToArray, sortProceduresChronologically } from './view-model.ts';
import { mapAddressViewModelToDb } from '@pins/peas-row-commons-lib/util/address.ts';
import type { AddressItem } from '@pins/peas-row-commons-lib/util/types.ts';

interface HandlerParams {
	req: Request;
	res: Response;
	data: Record<string, any>;
}

export function buildUpdateCase(service: ManageService, clearAnswer = false) {
	return async ({ req, data }: HandlerParams) => {
		const { db, logger, audit } = service;
		const { id, section } = req.params;

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
						include: { ProcedureType: true } // Not needed but satisfies parameter type below
					}
				}
			});

			// Apply the same sortProceduresChronologically function in the save logic,
			// so the indices match between display and save.
			const sortedProcedures = sortProceduresChronologically(existingCase?.Procedures);

			remapFlattenedFieldsToArray(
				rawAnswers,
				mapProceduresToArray(sortedProcedures || []) || [],
				/^procedureDetails_(\d+)_(.+)$/,
				'procedureDetails'
			);
		}

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

		logger.info({ fields: updatedFieldNames }, 'update case input');

		await updateCaseData(id, db, logger, formattedAnswersForQuery);

		await audit.record({
			caseId: id,
			action: AUDIT_ACTIONS.FIELD_UPDATED,
			userId: req?.session?.account?.localAccountId,
			metadata: { fieldName: getFieldDisplayNames(updatedFieldNames) }
		});

		// We clear the session after we have updated the case to avoid ghost data
		clearDataFromSession({ req, journeyId: JOURNEY_ID });

		addSessionData(req, id, { updated: { section } });

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
): Promise<Case | undefined> {
	try {
		return await db.$transaction(async ($tx: Prisma.TransactionClient) => {
			const caseRow = await $tx.case.findUnique({
				where: { id }
			});

			if (!caseRow) {
				throw new Error('Case not found');
			}

			return await $tx.case.update({
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
			...(proc.inspectorId &&
				proc.inspectorId !== 'not-allocated' && {
					Inspector: {
						connectOrCreate: {
							where: { idpUserId: proc.inspectorId },
							create: { idpUserId: proc.inspectorId }
						}
					}
				}),
			...(proc.hearingFormatId && {
				HearingFormat: { connect: { id: proc.hearingFormatId } }
			}),
			...(proc.inquiryFormatId && {
				InquiryFormat: { connect: { id: proc.inquiryFormatId } }
			}),
			...(proc.conferenceFormatId && {
				ConferenceFormat: { connect: { id: proc.conferenceFormatId } }
			}),
			...(proc.preInquiryMeetingFormatId && {
				PreInquiryMeetingFormat: { connect: { id: proc.preInquiryMeetingFormatId } }
			}),
			...(proc.inquiryOrConferenceId && {
				InquiryOrConference: { connect: { id: proc.inquiryOrConferenceId } }
			}),

			// Scalar date fields
			siteVisitDate: proc.siteVisitDate ? new Date(proc.siteVisitDate as string) : null,
			caseOfficerVerificationDate: proc.caseOfficerVerificationDate
				? new Date(proc.caseOfficerVerificationDate as string)
				: null,

			// Hearing fields
			hearingTargetDate: proc.hearingTargetDate ? new Date(proc.hearingTargetDate as string) : null,
			earliestHearingDate: proc.earliestHearingDate ? new Date(proc.earliestHearingDate as string) : null,
			confirmedHearingDate: proc.confirmedHearingDate ? new Date(proc.confirmedHearingDate as string) : null,
			hearingClosedDate: proc.hearingClosedDate ? new Date(proc.hearingClosedDate as string) : null,
			hearingDateNotificationDate: proc.hearingDateNotificationDate
				? new Date(proc.hearingDateNotificationDate as string)
				: null,
			hearingVenueNotificationDate: proc.hearingVenueNotificationDate
				? new Date(proc.hearingVenueNotificationDate as string)
				: null,
			partiesNotifiedOfHearingDate: proc.partiesNotifiedOfHearingDate
				? new Date(proc.partiesNotifiedOfHearingDate as string)
				: null,
			hearingPreparationTimeDays: proc.hearingPreparationTimeDays ?? null,
			hearingTravelTimeDays: proc.hearingTravelTimeDays ?? null,
			hearingSittingTimeDays: proc.hearingSittingTimeDays ?? null,
			hearingReportingTimeDays: proc.hearingReportingTimeDays ?? null,

			// Inquiry fields
			inquiryTargetDate: proc.inquiryTargetDate ? new Date(proc.inquiryTargetDate as string) : null,
			earliestInquiryDate: proc.earliestInquiryDate ? new Date(proc.earliestInquiryDate as string) : null,
			confirmedInquiryDate: proc.confirmedInquiryDate ? new Date(proc.confirmedInquiryDate as string) : null,
			inquiryClosedDate: proc.inquiryClosedDate ? new Date(proc.inquiryClosedDate as string) : null,
			inquiryDateNotificationDate: proc.inquiryDateNotificationDate
				? new Date(proc.inquiryDateNotificationDate as string)
				: null,
			inquiryVenueNotificationDate: proc.inquiryVenueNotificationDate
				? new Date(proc.inquiryVenueNotificationDate as string)
				: null,
			partiesNotifiedOfInquiryDate: proc.partiesNotifiedOfInquiryDate
				? new Date(proc.partiesNotifiedOfInquiryDate as string)
				: null,
			inquiryPreparationTimeDays: proc.inquiryPreparationTimeDays ?? null,
			inquiryTravelTimeDays: proc.inquiryTravelTimeDays ?? null,
			inquirySittingTimeDays: proc.inquirySittingTimeDays ?? null,
			inquiryReportingTimeDays: proc.inquiryReportingTimeDays ?? null,

			// Conference / pre-inquiry fields
			conferenceDate: proc.conferenceDate ? new Date(proc.conferenceDate as string) : null,
			conferenceNoteSentDate: proc.conferenceNoteSentDate ? new Date(proc.conferenceNoteSentDate as string) : null,
			preInquiryMeetingDate: proc.preInquiryMeetingDate ? new Date(proc.preInquiryMeetingDate as string) : null,
			preInquiryNoteSentDate: proc.preInquiryNoteSentDate ? new Date(proc.preInquiryNoteSentDate as string) : null,

			// Document dates
			proofsOfEvidenceReceivedDate: proc.proofsOfEvidenceReceivedDate
				? new Date(proc.proofsOfEvidenceReceivedDate as string)
				: null,
			statementsOfCaseReceivedDate: proc.statementsOfCaseReceivedDate
				? new Date(proc.statementsOfCaseReceivedDate as string)
				: null,
			inHouseDate: proc.inHouseDate ? new Date(proc.inHouseDate as string) : null,
			offerForWrittenRepresentationsDate: proc.offerForWrittenRepresentationsDate
				? new Date(proc.offerForWrittenRepresentationsDate as string)
				: null,
			deadlineForConsentDate: proc.deadlineForConsentDate ? new Date(proc.deadlineForConsentDate as string) : null
		};

		const hearingPayload = getVenuePayload(proc.hearingVenue);
		const inquiryPayload = getVenuePayload(proc.inquiryVenue);
		const conferencePayload = getVenuePayload(proc.conferenceVenue);

		providedIds.push(proc.id);

		upserts.push({
			where: { id: proc.id },
			update: {
				...procedureData,
				...(hearingPayload.updateVenue && { HearingVenue: hearingPayload.updateVenue }),
				...(inquiryPayload.updateVenue && { InquiryVenue: inquiryPayload.updateVenue }),
				...(conferencePayload.updateVenue && { ConferenceVenue: conferencePayload.updateVenue })
			},
			create: {
				...procedureData,
				id: proc.id,
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
