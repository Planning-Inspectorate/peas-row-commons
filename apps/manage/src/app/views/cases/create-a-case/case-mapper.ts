import { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { kebabToCamel } from './questions-utils.ts';
import { PROCEDURE_GROUP_IDS } from './view-model.ts';

/**
 * Takes an answers object and formats the data correctly ready for insertion into DB.
 */
export function mapAnswersToCaseInput(answers: Record<string, any>, reference: string) {
	const caseType = resolveCaseType(answers);
	const caseSubType = resolveCaseSubType(caseType, answers);
	const procedure = resolveProcedure(answers);

	const input: Prisma.XOR<Prisma.CaseCreateInput, Prisma.CaseUncheckedCreateInput> = {
		reference,
		name: answers.name,
		receivedDate: answers.receivedDate,
		externalReference: answers.externalReference,
		applicant: answers.applicant,
		authority: answers.authority,
		caseOfficerId: answers.caseOfficerId,
		area: answers.area,
		Type: { connect: { id: caseType } }
	};

	// otherSosCasework takes priority, indicating a "user entered" subtype
	// that needs creation.
	if (answers.otherSosCasework_text) {
		input.SubType = {
			create: mapOtherSubTypeInput(answers.otherSosCasework_text, caseType)
		};
	} else if (caseSubType) {
		input.SubType = {
			connect: { id: caseSubType }
		};
	}

	if (procedure) {
		input.Procedure = { connect: { id: procedure } };
	}

	if (hasSiteAddress(answers)) {
		input.SiteAddress = {
			create: mapAddressInput(answers.siteAddress)
		};
	}

	return input;
}

/**
 * Grabs both type and subtype (if it exists)
 */
export function resolveCaseTypeIds(answers: Record<string, any>) {
	const typeId = resolveCaseType(answers);
	const subtypeId = resolveCaseSubType(typeId, answers);
	return { typeId, subtypeId };
}

/**
 * Finds case type based on casework area
 */
function resolveCaseType(answers: Record<string, any>): string {
	const areaId = answers.caseworkArea;

	const typeField = kebabToCamel(areaId);
	return answers[typeField];
}

/**
 * Finds subtype based on type, unlike type has the potential to be null, as
 * there are some types that do not have a subtype.
 */
function resolveCaseSubType(caseType: string | null, answers: Record<string, any>): string | null {
	if (!caseType) return null;

	const subtypeField = kebabToCamel(caseType);
	return answers[subtypeField] || null;
}

/**
 * Finds procedure, normally is a straight mapping, however there are 2
 * groupings that have a subtype that is needed instead.
 */
function resolveProcedure(answers: Record<string, any>): string | null {
	const { procedureId, adminProcedureId, siteVisitProcedureId } = answers;

	if (!procedureId) return null;

	const groups = Object.values(PROCEDURE_GROUP_IDS);
	if (groups.includes(procedureId)) {
		return adminProcedureId || siteVisitProcedureId || null;
	}

	return procedureId;
}

function hasSiteAddress(answers: Record<string, any>): boolean {
	const address = answers.siteAddress;
	return address && typeof address === 'object' && Object.values(address).some((val) => Boolean(val));
}

/**
 * Address is formatted in its own table with columns for the components.
 */
function mapAddressInput(address: Record<string, string>) {
	return {
		line1: address.addressLine1,
		line2: address.addressLine2,
		townCity: address.townCity,
		county: address.county,
		postcode: address.postcode
	};
}

/**
 * Takes the user submitted subtype inside of Other SoS casework
 * and gets it ready to create the subtype in the DB, turning the
 * user entered string into a kebab-case ID.
 */
function mapOtherSubTypeInput(newSubType: string, caseType: string) {
	return {
		id: newSubType
			.replace(/([a-z])([A-Z])/g, '$1-$2')
			.replace(/[\s_]+/g, '-')
			.toLowerCase(),
		displayName: newSubType,
		ParentType: { connect: { id: caseType } }
	};
}
