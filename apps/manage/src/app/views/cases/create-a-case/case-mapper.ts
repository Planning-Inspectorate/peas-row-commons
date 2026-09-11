import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/contact-type.ts';
import { CASE_STATUS_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/status.ts';
import { mapAddressViewModelToDb } from '@pins/peas-row-commons-lib/util/address.ts';
import { yesNoToBoolean } from '@planning-inspectorate/dynamic-forms';
import { kebabToCamel } from './questions-utils.ts';

/**
 * Takes an answers object and formats the data correctly ready for insertion into DB.
 */
export function mapAnswersToCaseInput(answers: Record<string, any>, reference: string) {
	const caseType = resolveCaseType(answers);
	const caseSubType = resolveCaseSubType(caseType, answers);

	const input: Prisma.XOR<Prisma.CaseCreateInput, Prisma.CaseUncheckedCreateInput> = {
		reference,
		name: answers.name,
		receivedDate: answers.receivedDate,
		externalReference: answers.externalReference,
		CaseOfficer: {
			connectOrCreate: {
				where: { idpUserId: answers.caseOfficerId },
				create: { idpUserId: answers.caseOfficerId }
			}
		},
		location: answers.location,
		Type: { connect: { id: caseType } },
		Status: { connect: { id: CASE_STATUS_ID.NEW_CASE } } // All created cases start at "new-case"
	};

	// otherSosCasework takes priority, indicating a "user entered" subtype
	// that needs creation. We do a connectOrCreate here in case another user
	// has already entered the same value. Trim just to make sure.
	const customSosText = answers.otherSosCasework_text?.trim();
	if (customSosText) {
		input.SubType = {
			connectOrCreate: {
				where: {
					id: generateSubTypeId(answers.otherSosCasework_text)
				},
				create: mapOtherSubTypeInput(answers.otherSosCasework_text, caseType)
			}
		};
	} else if (caseSubType) {
		input.SubType = {
			connect: { id: caseSubType }
		};
	}

	if (hasSiteAddress(answers)) {
		input.SiteAddress = {
			create: mapAddressInput(answers.siteAddress)
		};
	}

	const mappedApplicants = answers.applicantDetails
		.map((item: Record<string, any>) => {
			const contact: Prisma.ContactCreateWithoutCaseInput = {
				ContactType: { connect: { id: CONTACT_TYPE_ID.APPLICANT_APPELLANT } },
				firstName: item.applicantFirstName,
				lastName: item.applicantLastName,
				orgName: item.applicantOrgName,
				telephoneNumber: item.applicantTelephoneNumber,
				email: item.applicantEmail
			};

			const address = item.applicantAddress;
			if (address) {
				contact.Address = {
					create: mapAddressViewModelToDb(address)
				};
			}

			return contact;
		})
		.filter(Boolean);

	if (mappedApplicants.length) {
		input.Contacts = {
			create: mappedApplicants
		};
	}

	// Authority is optional in create a case, so could be an empty string
	if (answers.authorityId) {
		input.Authority = { connect: { id: answers.authorityId } };
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
function resolveCaseType(answers: Record<string, any>) {
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
		id: generateSubTypeId(newSubType),
		displayName: newSubType,
		ParentType: { connect: { id: caseType } }
	};
}

/**
 * Given a subtype string e.g. "Brand new_Type",
 * will convert into a sensible kebab id, replacing
 * spaces, transforming to lowercase "brand-new-type"
 */
function generateSubTypeId(newSubType: string) {
	return newSubType
		.trim()
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/[^a-zA-Z0-9\s_-]/g, '')
		.replace(/[\s_]+/g, '-')
		.toLowerCase();
}

interface LinkedCaseAnswer {
	hasLinkedCases?: string; // 'yes' | 'no'
	isLeadCase?: string; // 'yes' | 'no'
	leadCaseReference?: string; // reference of the lead case (when isLeadCase is 'no')
}

export async function handleLinkedCaseCreate(
	$tx: Prisma.TransactionClient,
	answers: LinkedCaseAnswer | undefined,
	newCaseId: string
): Promise<void> {
	if (!yesNoToBoolean(answers?.hasLinkedCases)) return;

	const isLead = yesNoToBoolean(answers?.isLeadCase);

	if (isLead) {
		await $tx.linkedCase.create({
			data: {
				leadCaseId: newCaseId,
				Cases: { connect: { id: newCaseId } }
			}
		});
		return;
	}

	if (!answers?.leadCaseReference) {
		throw new Error('leadCaseReference required when isLeadCase is "no" but the case has linked cases');
	}

	const leadCase = await $tx.case.findUnique({
		where: { reference: answers.leadCaseReference },
		select: { id: true, linkedCasesId: true }
	});

	if (!leadCase) {
		throw new Error(`Lead case not found: ${answers.leadCaseReference}`);
	}

	if (leadCase.linkedCasesId) {
		// Lead already has a group -> just connect the new case
		await $tx.linkedCase.update({
			where: { id: leadCase.linkedCasesId },
			data: {
				Cases: { connect: { id: newCaseId } }
			}
		});
	} else {
		// Lead doesn't have a group yet -> create one containing both
		await $tx.linkedCase.create({
			data: {
				leadCaseId: leadCase.id,
				Cases: {
					connect: [{ id: leadCase.id }, { id: newCaseId }]
				}
			}
		});
	}
}
