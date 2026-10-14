import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type {
	ProcedureUncheckedUpdateWithoutCaseInput,
	ProcedureUpdateInput,
	ProcedureUpdateManyWithoutCaseNestedInput,
	ProcedureUpdateWithoutCaseInput,
	ProcedureUpdateWithWhereUniqueWithoutCaseInput
} from '@pins/peas-row-commons-database/src/client/models.ts';
import type { AddressUpsertWithoutHearingProcedureInput } from '@pins/peas-row-commons-database/src/client/models/Address.ts';
import { PROCEDURE_CONSTANTS } from '@pins/peas-row-commons-lib/constants/procedures.ts';
import { mapAddressViewModelToDb } from '@pins/peas-row-commons-lib/util/address.ts';
import { toDateOrNull } from '@pins/peas-row-commons-lib/util/dates.ts';
import type { AddressItem } from '@pins/peas-row-commons-lib/util/types.ts';
import { optionalWhere } from '@planning-inspectorate/core/util';

export type ExistingProcedures = Awaited<ReturnType<typeof existingProceduresForCase>>;

const manageListRelationFields: { key: ProcedureEditKeys; relation: ProcedureRelations }[] = [
	{ key: 'procedureTypeId', relation: 'ProcedureType' },
	{ key: 'procedureStatusId', relation: 'ProcedureStatus' },
	{ key: 'adminProcedureType', relation: 'AdminProcedureType' },
	{ key: 'siteVisitTypeId', relation: 'SiteVisitType' }
];

/**
 * Handle edits to the procedures manage list question. This includes an array of all the procedures, where some may
 * have been removed, added, or edited. Edits can only change the manage list questions (not all procedure fields)
 *
 * Returns the database create, update, delete operations to apply (ProcedureUpdateManyWithoutCaseNestedInput)
 */
export function handleProcedureManageListEdits(edits: ProcedureEdit[], existingProcedures: ExistingProcedures) {
	const existingIds = existingProcedures.map((e) => e.id);
	const newIds = edits.map((e) => e.id);

	// existing procedures which may have been edited - all fields are provided so we have to check for changes
	const procedureEdits = edits.filter((e) => existingIds.includes(e.id));
	const procedureUpdates: ProcedureUpdateWithWhereUniqueWithoutCaseInput[] = [];
	for (const procedureEdit of procedureEdits) {
		const existing = existingProcedures.find((proc) => proc.id === procedureEdit.id);
		if (!existing) continue; // this should not happen, we've already filtered above
		const updates: ProcedureUpdateWithoutCaseInput = {};
		for (const { key, relation } of manageListRelationFields) {
			const newValue = procedureEdit[key];
			if (existing[key] !== newValue) {
				// if a value did exist but is unset, use null
				updates[relation] = newValue === undefined ? disconnect() : connectId(newValue);
			}
		}

		// inspectorId maps to idpUserId (Entra ID)
		const existingValue = existing.Inspector?.idpUserId;
		if (existingValue !== procedureEdit.inspectorId) {
			updates.Inspector = inspectorConnect(procedureEdit.inspectorId);
		}

		if (Object.keys(updates).length > 0) {
			procedureUpdates.push({
				where: { id: procedureEdit.id },
				data: updates
			});
		}
	}
	// add new procedures which aren't in the existing set
	const toCreate = edits
		.filter((procedure) => !existingIds.includes(procedure.id))
		.map((procedure) => {
			return {
				id: procedure.id,
				ProcedureType: connectId(procedure.procedureTypeId),
				AdminProcedureType: connectId(procedure.adminProcedureType),
				SiteVisitType: connectId(procedure.siteVisitTypeId),
				ProcedureStatus: connectId(procedure.procedureStatusId),
				Inspector: inspectorConnect(procedure.inspectorId, false)
			};
		});
	// remove existing IDs which aren't in the new set
	const toDelete = existingIds.filter((id) => !newIds.includes(id)).map((id) => ({ id }));

	const query: ProcedureUpdateManyWithoutCaseNestedInput = {};
	if (toCreate.length > 0) {
		query.create = toCreate;
	}
	if (procedureUpdates.length > 0) {
		query.update = procedureUpdates;
	}
	if (toDelete.length > 0) {
		query.delete = toDelete;
	}
	return query;
}

type ProcedureUpdateKeys = keyof ProcedureUpdateInput;
type ProcedureRelations =
	| 'ProcedureType'
	| 'ProcedureStatus'
	| 'Inspector'
	| 'SiteVisitType'
	| 'AdminProcedureType'
	| 'HearingFormat'
	| 'HearingVenue'
	| 'InquiryFormat'
	| 'InquiryVenue'
	| 'ConferenceFormat'
	| 'ConferenceVenue'
	| 'PreInquiryMeetingFormat'
	| 'InquiryOrConference';
type ProcedureUncheckedKeys = keyof ProcedureUncheckedUpdateWithoutCaseInput;

const procedureDateFields = [
	'siteVisitDate',
	'caseOfficerVerificationDate',
	'hearingTargetDate',
	'earliestHearingDate',
	'confirmedHearingDate',
	'hearingClosedDate',
	'hearingDateNotificationDate',
	'hearingVenueNotificationDate',
	'partiesNotifiedOfHearingDate',
	'inquiryTargetDate',
	'earliestInquiryDate',
	'confirmedInquiryDate',
	'inquiryClosedDate',
	'inquiryDateNotificationDate',
	'inquiryVenueNotificationDate',
	'partiesNotifiedOfInquiryDate',
	'conferenceDate',
	'conferenceNoteSentDate',
	'preInquiryMeetingDate',
	'preInquiryNoteSentDate',
	'proofsOfEvidenceReceivedDate',
	'statementsOfCaseReceivedDate',
	'inHouseDate',
	'offerForWrittenRepresentationsDate',
	'deadlineForConsentDate'
] satisfies ProcedureUpdateKeys[];

const procedureDecimalFields = [
	'hearingPreparationTimeDays',
	'hearingTravelTimeDays',
	'hearingSittingTimeDays',
	'hearingReportingTimeDays',
	'inquiryPreparationTimeDays',
	'inquiryTravelTimeDays',
	'inquirySittingTimeDays',
	'inquiryReportingTimeDays'
] satisfies ProcedureUpdateKeys[];

const procedureRelationFields: { key: ProcedureUncheckedKeys; relation: ProcedureRelations }[] = [
	{ key: 'procedureTypeId', relation: 'ProcedureType' },
	{ key: 'procedureStatusId', relation: 'ProcedureStatus' },
	{ key: 'adminProcedureType', relation: 'AdminProcedureType' },
	{ key: 'siteVisitTypeId', relation: 'SiteVisitType' },
	{ key: 'hearingFormatId', relation: 'HearingFormat' },
	{ key: 'inquiryFormatId', relation: 'InquiryFormat' },
	{ key: 'conferenceFormatId', relation: 'ConferenceFormat' },
	{ key: 'preInquiryMeetingFormatId', relation: 'PreInquiryMeetingFormat' },
	{ key: 'inquiryOrConferenceId', relation: 'InquiryOrConference' }
];

/**
 * Handle edits to the procedures dynamic sections, which can be an edit to any of the fields but cannot be adding
 * or removing a procedure
 *
 * Returns the list of updates to apply (ProcedureUpdateWithWhereUniqueWithoutCaseInput[])
 */
export function handleProcedureDynamicSectionEdits(procedureDetails: Record<string, unknown>[]) {
	const updates: ProcedureUpdateWithWhereUniqueWithoutCaseInput[] = [];

	for (const proc of procedureDetails) {
		const procedureData: ProcedureUpdateInput = {};
		for (const { key, relation } of procedureRelationFields) {
			if (key in proc) {
				if (proc[key] === null) {
					procedureData[relation] = disconnect();
				} else {
					procedureData[relation] = connectId(proc[key] as string);
				}
			}
		}
		for (const dateField of procedureDateFields) {
			if (dateField in proc) {
				procedureData[dateField] = toDateOrNull(proc[dateField]);
			}
		}

		for (const decimalField of procedureDecimalFields) {
			if (decimalField in proc) {
				// '||' because we get an empty string here, not undefined and the DB is 'Decimal?' so can't take empty string (null fine)
				procedureData[decimalField] = proc[decimalField] || null;
			}
		}
		if ('inspectorId' in proc) {
			procedureData.Inspector = inspectorConnect(proc.inspectorId as string);
		}

		const addresses = [
			{ field: 'hearingVenue', relation: 'HearingVenue' },
			{ field: 'inquiryVenue', relation: 'InquiryVenue' },
			{ field: 'conferenceVenue', relation: 'ConferenceVenue' }
		] satisfies { field: string; relation: ProcedureRelations }[];
		for (const { field, relation } of addresses) {
			if (field in proc) {
				const payload = getVenuePayload(proc[field] as AddressItem | undefined);
				if (payload) {
					procedureData[relation] = {
						upsert: payload
					};
				}
			}
		}

		updates.push({
			where: { id: proc.id as string },
			data: procedureData
		});
	}
	return updates;
}

/**
 * Get the existing procedures for a case, selecting only those fields used by the manage list question
 */
export async function existingProceduresForCase(db: PrismaClient, caseId: string) {
	if (!caseId) {
		throw new Error('case id must be provided for existingProceduresForCase');
	}
	return db.procedure.findMany({
		where: { caseId },
		select: {
			id: true,
			// only read the fields set by the manage list
			procedureTypeId: true,
			adminProcedureType: true,
			siteVisitTypeId: true,
			Inspector: {
				select: {
					idpUserId: true
				}
			},
			procedureStatusId: true
		}
	});
}

type ProcedureEdit = {
	id: string;
	procedureTypeId?: string;
	adminProcedureType?: string;
	siteVisitTypeId?: string;
	inspectorId?: string;
	procedureStatusId?: string;
};

type ProcedureEditKeys = keyof Omit<ProcedureEdit, 'inspectorId'>;

function inspectorConnect(inspectorId?: string, shouldDisconnect = true) {
	if (inspectorId === undefined || inspectorId === PROCEDURE_CONSTANTS.NOT_ALLOCATED) {
		if (shouldDisconnect) {
			return disconnect();
		}
		return undefined;
	}
	return {
		connectOrCreate: {
			where: { idpUserId: inspectorId },
			create: { idpUserId: inspectorId }
		}
	};
}

function connectId(id?: string) {
	if (!id) {
		return undefined;
	}
	return { connect: { id } };
}

function disconnect() {
	return { disconnect: true };
}

/**
 * Returns an upsert for the given address
 */
function getVenuePayload(venue?: AddressItem): undefined | AddressUpsertWithoutHearingProcedureInput {
	if (!venue) {
		return undefined;
	}

	const asAddress = mapAddressViewModelToDb(venue);
	if (!asAddress) {
		return undefined;
	}

	return {
		where: optionalWhere(venue.id),
		create: asAddress,
		update: asAddress
	};
}
