import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { CASE_TYPES_ID, ACT_ID } from './static-data/ids/index.ts';
import { LEGACY_SECTION_ID, LEGACY_CONTACT_TYPE_ID } from './static-data/legacy/ids/index.ts';

/**
 * Seeds a single, clearly marked dev case that exercises every field in the app
 * backed by a LEGACY_RADIO / LEGACY_SELECT question component (see question-utils.ts).
 *
 * These fields render an "options" list for values users can currently pick, plus a
 * separate "legacyOptions" list used only to display values migrated from Horizon that
 * are no longer valid choices going forward. This seed proves that old/legacy values
 * still render correctly in the UI, rather than being blank or crashing.
 *
 * Fields covered here (all LEGACY_RADIO / LEGACY_SELECT in question-utils.ts):
 *  - caseSubtype   (subTypeId)     -> a subtype that isn't part of the current CASE_SUBTYPES list
 *  - act           (actId/sectionId) -> LEGACY_ACT_SECTIONS entry (Wildlife & Countryside 1981, Schedule 14)
 *  - caseOfficer   (caseOfficerId) -> a User not present in any dev Entra group
 *  - inspector     (Inspectors[].inspectorId) -> a User not present in any dev Entra group
 *  - contactType   (Contacts[].contactTypeId) -> LEGACY_CONTACT_TYPES entry ("Inspector")
 *  - procedureInspector (Procedures[].inspectorId) -> a User not present in any dev Entra group
 */
export async function seedDevLegacyCase(dbClient: PrismaClient) {
	console.log('starting seed of legacy dev case...');

	const LEGACY_SUBTYPE_ID = 'legacy-example-subtype';

	// A subtype migrated from Horizon that no longer exists in the current static list.
	// This is what makes the `caseSubtype` question render via its legacyOptions.
	await dbClient.caseSubType.upsert({
		where: { id: LEGACY_SUBTYPE_ID },
		update: {},
		create: {
			id: LEGACY_SUBTYPE_ID,
			displayName: 'Legacy example subtype (migrated from Horizon)',
			parentTypeId: CASE_TYPES_ID.RIGHTS_OF_WAY
		}
	});

	// Users that are deliberately NOT part of any dev Entra group, so that when they're
	// assigned to a case they only show up via `legacyOptions`, matching production
	// behaviour for officers/inspectors who have since left / lost group membership.
	const legacyCaseOfficer = await dbClient.user.upsert({
		where: { idpUserId: 'legacy_dev_case_officer' },
		update: {},
		create: {
			idpUserId: 'legacy_dev_case_officer',
			legacyId: 'HORIZON-LEGACY-OFFICER-001'
		}
	});

	const legacyInspector = await dbClient.user.upsert({
		where: { idpUserId: 'legacy_dev_inspector' },
		update: {},
		create: {
			idpUserId: 'legacy_dev_inspector',
			legacyId: 'HORIZON-LEGACY-INSPECTOR-001'
		}
	});

	const legacyProcedureInspector = await dbClient.user.upsert({
		where: { idpUserId: 'legacy_dev_procedure_inspector' },
		update: {},
		create: {
			idpUserId: 'legacy_dev_procedure_inspector',
			legacyId: 'HORIZON-LEGACY-PROCEDURE-INSPECTOR-001'
		}
	});

	const reference = 'LEGACY/2025/0001';

	await dbClient.case.upsert({
		where: { reference },
		update: {},
		create: {
			reference,
			name: 'LEGACY DATA EXAMPLE - do not use as a template, covers all legacy question fields',
			receivedDate: new Date(),
			location: 'South West',
			// Legacy Horizon case reference, kept for migration purposes.
			legacyCaseId: 'HORIZON-LEGACY-CASE-0001',
			typeId: CASE_TYPES_ID.RIGHTS_OF_WAY,
			// `caseSubtype` LEGACY_RADIO
			subTypeId: LEGACY_SUBTYPE_ID,
			// `caseOfficer` LEGACY_SELECT
			caseOfficerId: legacyCaseOfficer.id,
			// `act` LEGACY_SELECT - matches the LEGACY_ACT_SECTIONS entry for
			// Wildlife and Countryside Act 1981, Schedule 14
			actId: ACT_ID.WILDLIFE_AND_COUNTRYSIDE_1981,
			sectionId: LEGACY_SECTION_ID.SCH_14,
			// `inspector` LEGACY_SELECT
			Inspectors: {
				create: [
					{
						inspectorId: legacyInspector.id,
						inspectorAllocatedDate: new Date()
					}
				]
			},
			// `contactType` LEGACY_RADIO
			Contacts: {
				create: [
					{
						firstName: 'Legacy',
						lastName: 'Contact',
						contactTypeId: LEGACY_CONTACT_TYPE_ID.INSPECTOR
					}
				]
			},
			// `procedureInspector` LEGACY_RADIO
			Procedures: {
				create: [
					{
						inspectorId: legacyProcedureInspector.id
					}
				]
			}
		}
	});

	console.log('legacy dev case seed complete');
}
