import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type {
	ProcedureUncheckedUpdateWithoutCaseInput,
	ProcedureUpdateInput,
	ProcedureUpdateManyWithoutCaseNestedInput,
	ProcedureUpdateWithoutCaseInput,
	ProcedureUpdateWithWhereUniqueWithoutCaseInput
} from '@pins/peas-row-commons-database/src/client/models.ts';
import type { AddressUpsertWithoutHearingProcedureInput } from '@pins/peas-row-commons-database/src/client/models/Address.ts';
import { PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/index.ts';
import { PROCEDURE_CONSTANTS } from '@pins/peas-row-commons-lib/constants/procedures.ts';
import { mapAddressViewModelToDb } from '@pins/peas-row-commons-lib/util/address.ts';
import { toDateOrNull } from '@pins/peas-row-commons-lib/util/dates.ts';
import { isCaseOfficerAdminProcedure } from '@pins/peas-row-commons-lib/util/procedures.ts';
import type { AddressItem } from '@pins/peas-row-commons-lib/util/types.ts';
import { optionalWhere } from '@planning-inspectorate/core/util';

export type ExistingProcedures = Awaited<ReturnType<typeof existingProceduresForCase>>;

const manageListRelationFields: { key: ProcedureEditKeys; relation: ProcedureRelations }[] = [
	{ key: 'procedureTypeId', relation: 'ProcedureType' },
	{ key: 'procedureStatusId', relation: 'ProcedureStatus' },
	{ key: 'adminProcedureType', relation: 'AdminProcedureType' },
	{ key: 'siteVisitTypeId', relation: 'SiteVisitType' }
];

function getManageListInspectorId(procedure: Record<string, unknown>): string | null {
	// case-officer admin procedures never have an inspector, so clear any retained answer
	if (isCaseOfficerAdminProcedure(procedure)) {
		return null;
	}

	const inspectorId = procedure.inspectorId;

	if (typeof inspectorId !== 'string' || !inspectorId) {
		throw new TypeError('Manage-list procedure must include an inspectorId or not-allocated');
	}

	return inspectorId;
}

/**
 * Normalise the procedures submitted by the manage list question into the edits to save (and audit).
 * Throws if a procedure is malformed, so invalid edits are rejected before any database writes.
 *
 * Returns new objects, the submitted procedures are not mutated.
 */
export function normaliseManageListProcedureEdits(value: unknown): ManageListProcedureEdit[] {
	if (!Array.isArray(value)) {
		throw new TypeError('Manage-list procedures must be an array');
	}

	return value.map((procedure: unknown) => {
		if (
			typeof procedure !== 'object' ||
			procedure === null ||
			!('id' in procedure) ||
			typeof procedure.id !== 'string' ||
			!procedure.id
		) {
			throw new TypeError('Manage-list procedure must include a procedure id');
		}
		const edit: Record<string, unknown> & { id: string } = { ...procedure, id: procedure.id };
		const inspectorId = getManageListInspectorId(edit);
		if (edit.procedureTypeId !== PROCEDURES_ID.ADMIN_IN_HOUSE) {
			delete edit.adminProcedureType;
		}
		return { ...edit, inspectorId };
	});
}

/**
 * Handle edits to the procedures manage list question. This includes an array of all the procedures, where some may
 * have been removed, added, or edited. Edits can only change the manage list questions (not all procedure fields)
 *
 * Returns the database create, update, delete operations to apply (ProcedureUpdateManyWithoutCaseNestedInput)
 */
export function handleProcedureManageListEdits(
	edits: ManageListProcedureEdit[],
	existingProcedures: ExistingProcedures
) {
	for (const procedureEdit of edits) {
		assertInspectorId(procedureEdit.inspectorId);
	}

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
			if ((existing[key] ?? null) !== (newValue ?? null)) {
				// if a value did exist but is unset, use null
				updates[relation] = newValue === undefined ? disconnect() : connectId(newValue);
			}
		}

		// inspectorId maps to idpUserId (Entra ID)
		const inspectorChange = inspectorUpdate(existing.Inspector, procedureEdit.inspectorId);
		if (inspectorChange) {
			updates.Inspector = inspectorChange;
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
			assertInspectorId(proc.inspectorId);
			procedureData.Inspector = inspectorConnect(proc.inspectorId);
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
	inspectorId?: string | null;
	procedureStatusId?: string;
};

export type ManageListProcedureEdit = ProcedureEdit & { inspectorId: string | null };

type ProcedureEditKeys = keyof Omit<ProcedureEdit, 'inspectorId'>;

function assertInspectorId(value: unknown): asserts value is string | null {
	if (value !== null && typeof value !== 'string') {
		throw new TypeError('inspectorId must be a string or null');
	}
}

function normaliseInspectorSelection(inspectorId: string | null): string | null {
	if (!inspectorId || inspectorId === PROCEDURE_CONSTANTS.NOT_ALLOCATED) {
		return null;
	}
	return inspectorId;
}

/**
 * Work out the Inspector relation update for a manage-list edit, comparing against the existing relation.
 * Returns undefined when no change is needed.
 */
function inspectorUpdate(existingInspector: { idpUserId: string | null } | null, inspectorId: string | null) {
	const selected = normaliseInspectorSelection(inspectorId);
	if (!existingInspector) {
		return selected === null ? undefined : inspectorConnect(selected);
	}
	if (selected === null) {
		return disconnect();
	}
	if (existingInspector.idpUserId === selected) {
		return undefined;
	}
	return inspectorConnect(selected);
}

function inspectorConnect(inspectorId: string | null, shouldDisconnect = true) {
	assertInspectorId(inspectorId);

	const selected = normaliseInspectorSelection(inspectorId);
	if (selected === null) {
		if (shouldDisconnect) {
			return disconnect();
		}
		return undefined;
	}
	return {
		connectOrCreate: {
			where: { idpUserId: selected },
			create: { idpUserId: selected }
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
