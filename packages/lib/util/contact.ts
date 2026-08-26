import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/contact-type.ts';
import { mapAddressDbToViewModel, mapAddressViewModelToDb } from './address.ts';
import { COMPONENT_TYPES, AddressValidator, MultiFieldInputValidator } from '@planning-inspectorate/dynamic-forms';
import AtLeastOneFieldValidator from '../forms/custom-components/multi-field-input/validator.ts';
import { CUSTOM_COMPONENTS } from '../forms/custom-components/index.ts';
import type { AddressItem, ContactMappingConfig } from './types.ts';
import type { MultiFieldInputQuestionProps } from '@planning-inspectorate/dynamic-forms';
import type { AddressWithIdQuestionProps } from '../forms/custom-components/address-with-id/question.ts';

/**
 * Maps objectors DB data to view model.
 */
export function mapContacts(contacts: Prisma.ContactGetPayload<{ include: { Address: true } }>[], key: string) {
	return contacts.map((contact) => {
		return {
			id: contact.id,
			[`${key}FirstName`]: contact.firstName,
			[`${key}LastName`]: contact.lastName,
			[`${key}OrgName`]: contact.orgName,
			[`${key}TelephoneNumber`]: contact.telephoneNumber,
			[`${key}Email`]: contact.email,
			[`${key}Address`]: mapAddressDbToViewModel(contact.Address),
			// Objector status and Contact type are unique
			objectorStatusId: contact.objectorStatusId,
			contactTypeId: contact.contactTypeId
		};
	});
}

/**
 * Used for creating the contacts in handleContacts
 */
export const CONTACT_MAPPINGS = [
	{
		sourceKey: 'objectorDetails',
		prefix: 'objector',
		fixedTypeId: CONTACT_TYPE_ID.OBJECTOR,
		hasStatus: true,
		deleteFilter: { contactTypeId: CONTACT_TYPE_ID.OBJECTOR }
	},
	{
		sourceKey: 'contactDetails',
		prefix: 'contact',
		dynamicTypeField: 'contactTypeId',
		hasStatus: false,
		deleteFilter: {
			contactTypeId: {
				notIn: [CONTACT_TYPE_ID.OBJECTOR, CONTACT_TYPE_ID.APPLICANT_APPELLANT]
			}
		}
	},
	{
		sourceKey: 'applicantDetails',
		prefix: 'applicant',
		fixedTypeId: CONTACT_TYPE_ID.APPLICANT_APPELLANT,
		hasStatus: false,
		deleteFilter: { contactTypeId: CONTACT_TYPE_ID.APPLICANT_APPELLANT }
	}
];

/**
 * Creates & deletes contacts based on the mappings above.
 */
export function handleContacts(
	flatData: Record<string, unknown>,
	prismaPayload: Prisma.CaseUpdateInput,
	contactMappings: ContactMappingConfig[]
) {
	const deleteFilters: { contactTypeId: string | { notIn: string[] } }[] = [];
	const upserts: Prisma.ContactUpsertWithWhereUniqueWithoutCaseInput[] = [];
	const providedIds: string[] = [];

	for (const config of contactMappings) {
		if (!Object.hasOwn(flatData, config.sourceKey)) continue;

		const items = flatData[config.sourceKey] as Record<string, unknown>[];

		for (const item of items) {
			const upsertPayload = buildContactUpsert(item, config);

			if (upsertPayload) {
				upserts.push(upsertPayload);
				providedIds.push(item.id as string);
			}
		}

		deleteFilters.push(config.deleteFilter);
		delete flatData[config.sourceKey];
	}

	const validIds = providedIds.filter(Boolean);

	if (deleteFilters.length > 0) {
		prismaPayload.Contacts = {
			...(upserts.length > 0 && { upsert: upserts }),
			deleteMany: {
				AND: [{ OR: deleteFilters }, { id: { notIn: validIds } }]
			}
		};
	}
}

/**
 * Generates the strictly typed Address payload for both Create and Update operations.
 */
function getAddressPayload(address: AddressItem | undefined) {
	if (!address) return { createAddress: undefined, updateAddress: undefined };

	const addressData = mapAddressViewModelToDb(address);

	if (address.id) {
		return {
			createAddress: { connect: { id: address.id } },
			updateAddress: { update: addressData }
		};
	}

	return {
		createAddress: { create: addressData },
		updateAddress: { create: addressData }
	};
}

/**
 * Builds a single Contact upsert payload.
 * Safely shares scalar fields between the Create and Update inputs to keep it DRY.
 */
function buildContactUpsert(
	item: Record<string, unknown>,
	config: ContactMappingConfig
): Prisma.ContactUpsertWithWhereUniqueWithoutCaseInput | null {
	const typeId =
		config.fixedTypeId ?? (config.dynamicTypeField ? (item[config.dynamicTypeField] as string) : undefined);
	const itemId = item.id as string | undefined;

	if (!typeId || !itemId) return null;

	const { prefix } = config;

	const sharedFields = {
		ContactType: { connect: { id: typeId } },
		firstName: item[`${prefix}FirstName`] as string,
		lastName: item[`${prefix}LastName`] as string,
		orgName: item[`${prefix}OrgName`] as string,
		telephoneNumber: item[`${prefix}TelephoneNumber`] as string,
		email: item[`${prefix}Email`] as string,
		...(config.hasStatus && item[`${prefix}StatusId`]
			? { ObjectorStatus: { connect: { id: item[`${prefix}StatusId`] as string } } }
			: {})
	};

	const { createAddress, updateAddress } = getAddressPayload(item[`${prefix}Address`] as AddressItem | undefined);

	return {
		where: { id: itemId },
		create: {
			id: itemId,
			...sharedFields,
			...(createAddress && { Address: createAddress })
		},
		update: {
			...sharedFields,
			...(updateAddress && { Address: updateAddress })
		}
	};
}

export interface PersonConfig<S extends string = string> {
	section: S;
	db: string;
	url: string;
	label: string;
	hintPrefix?: string;
	orgNameLabel?: string;
	viewData?: Record<string, unknown>;
}

/**
 * Builds a single-key object while preserving the literal key type,
 * so it can be safely spread into a mapped type like `PersonQuestions<S>`.
 */
function makeKeyed<K extends string, T>(key: K, value: T): { [P in K]: T } {
	return { [key]: value } as { [P in K]: T };
}

/**
 * Boilerplate for creating a "contact" question in questions.ts
 */
export const createPersonQuestions = <S extends string>({
	section,
	db,
	url,
	label,
	orgNameLabel,
	hintPrefix,
	viewData = {}
}: PersonConfig<S>) => {
	const labelLower = label.toLowerCase();

	const nameQuestion = {
		type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
		title: label,
		question: `Who is the ${labelLower}?`,
		fieldName: `${section}Name`,
		url: `${url}-name`,
		html: 'views/layouts/person-hint.njk',
		viewData: {
			...viewData,
			tableHeader: 'Name',
			hintPrefix: hintPrefix || null,
			orgNameLabel: orgNameLabel || `${label} company name`
		},
		inputFields: [
			{ fieldName: `${db}FirstName`, label: 'First name' },
			{ fieldName: `${db}LastName`, label: 'Last name' },
			{ fieldName: `${db}OrgName`, label: orgNameLabel || `${label} company name` }
		],
		validators: [
			new AtLeastOneFieldValidator({
				fields: [`${db}FirstName`, `${db}LastName`, `${db}OrgName`],
				errorMessage: 'Add at least one of First name, Last name or Company or organisation name'
			}),
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: `${db}FirstName`,
						required: false,
						errorMessage: `Enter ${labelLower} first name`,
						maxLength: { maxLength: 250, maxLengthMessage: `${label} first name must be less than 250 characters` }
					},
					{
						fieldName: `${db}LastName`,
						required: false,
						errorMessage: `Enter ${labelLower} last name`,
						maxLength: { maxLength: 250, maxLengthMessage: `${label} last name must be less than 250 characters` }
					},
					{
						fieldName: `${db}OrgName`,
						required: false,
						maxLength: {
							maxLength: 250,
							maxLengthMessage: 'Company or organisation name must be less than 250 characters'
						}
					}
				]
			})
		]
	} satisfies MultiFieldInputQuestionProps;

	const addressQuestion = {
		type: CUSTOM_COMPONENTS.ADDRESS_WITH_ID,
		title: `${label} address details`,
		question: `${label} address details (optional)`,
		fieldName: `${db}Address`,
		url: `${url}-address`,
		validators: [new AddressValidator()],
		viewData: { ...viewData, tableHeader: 'Address' }
	} satisfies AddressWithIdQuestionProps;

	const contactDetailsQuestion = {
		type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
		title: `${label === 'Contact' ? 'Contact details' : label + ' contact details'}`,
		question: `${label === 'Contact' ? 'What are the contact details?' : label + ' contact details'} (optional)`,
		fieldName: `${section}Details`,
		url: `${url}-contact-details`,
		viewData: { ...viewData, tableHeader: 'Contact' },
		inputFields: [
			{ fieldName: `${db}Email`, label: 'Email address' },
			{ fieldName: `${db}TelephoneNumber`, label: 'Phone number' }
		],
		validators: [
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: `${db}Email`,
						required: false,
						maxLength: { maxLength: 250, maxLengthMessage: `${label} email must be less than 250 characters` }
					},
					{
						fieldName: `${db}TelephoneNumber`,
						required: false,
						maxLength: { maxLength: 15, maxLengthMessage: `${label} phone number must be less than 15 characters` }
					}
				]
			})
		]
	} satisfies MultiFieldInputQuestionProps;

	return {
		...makeKeyed(`${section}Name` as const, nameQuestion),
		...makeKeyed(`${section}Address` as const, addressQuestion),
		...makeKeyed(`${section}ContactDetails` as const, contactDetailsQuestion)
	};
};
