import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { CASE_TYPES_ID, CASE_SUBTYPES_ID } from './static_data/ids/index.ts';

export async function seedDev(dbClient: PrismaClient) {
	await dbClient.case.upsert({
		where: { reference: 'ROW/2024/1001' },
		update: {},
		create: {
			reference: 'ROW/2024/1001',
			name: 'Footpath diversion at Green Dale',
			applicant: 'Green Dale Parish Council',
			caseOfficerId: 'dev_officer_001',
			receivedDate: new Date('2023-11-15'),
			authority: 'Somerset Council',
			area: 'South West',
			Type: { connect: { id: CASE_TYPES_ID.RIGHTS_OF_WAY } },
			SubType: { connect: { id: CASE_SUBTYPES_ID.OPPOSED_DMMO } },
			SiteAddress: {
				create: {
					line1: 'Green Dale Path',
					line2: 'Near Old Oak',
					townCity: 'Taunton',
					postcode: 'TA1 4DY',
					county: 'Somerset'
				}
			}
		}
	});

	await dbClient.case.upsert({
		where: { reference: 'DRT/2024/0055' },
		update: {},
		create: {
			reference: 'DRT/2024/0055',
			name: 'River Ouse Drought Order',
			applicant: 'Yorkshire Water',
			caseOfficerId: 'dev_officer_002',
			receivedDate: new Date('2024-01-10'),
			authority: 'Environment Agency',
			Type: { connect: { id: CASE_TYPES_ID.DROUGHT } },
			SubType: { connect: { id: CASE_SUBTYPES_ID.DROUGHT_ORDERS } }
		}
	});

	await dbClient.case.upsert({
		where: { reference: 'HOU/2024/9988' },
		update: {},
		create: {
			reference: 'HOU/2024/9988',
			name: 'Development of 50 residential units',
			applicant: 'BuildCorp Ltd',
			caseOfficerId: 'dev_officer_001',
			receivedDate: new Date('2023-12-01'),
			authority: 'Bristol City Council',
			Type: { connect: { id: CASE_TYPES_ID.HOUSING_PLANNING_CPOS } },
			SubType: { connect: { id: CASE_SUBTYPES_ID.HOUSING } },
			SiteAddress: {
				create: {
					line1: '15 Industrial Way',
					townCity: 'Bristol',
					postcode: 'BS2 0UA',
					county: 'Bristol'
				}
			}
		}
	});

	console.log('dev seed complete');
}
