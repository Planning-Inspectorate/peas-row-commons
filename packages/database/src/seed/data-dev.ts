import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { CASE_TYPES_ID, CASE_SUBTYPES_ID } from './static_data/ids/index.ts';

export async function seedDev(dbClient: PrismaClient) {
	console.log('starting seed of 100 cases...');

	const locations = ['Bristol', 'Taunton', 'Leeds', 'Sheffield', 'Manchester', 'London', 'Birmingham', 'Liverpool'];

	const officers = ['dev_officer_001', 'dev_officer_002', 'dev_officer_003'];

	const scenarios = [
		{
			type: CASE_TYPES_ID.RIGHTS_OF_WAY,
			subType: CASE_SUBTYPES_ID.OPPOSED_DMMO,
			prefix: 'ROW',
			nameTemplate: 'Footpath diversion at',
			hasAddress: true
		},
		{
			type: CASE_TYPES_ID.DROUGHT,
			subType: CASE_SUBTYPES_ID.DROUGHT_ORDERS,
			prefix: 'DRT',
			nameTemplate: 'Drought Order for',
			hasAddress: false
		},
		{
			type: CASE_TYPES_ID.HOUSING_PLANNING_CPOS,
			subType: CASE_SUBTYPES_ID.HOUSING,
			prefix: 'HOU',
			nameTemplate: 'Development of residential units at',
			hasAddress: true
		}
	];

	for (let i = 1; i <= 100; i++) {
		const scenario = scenarios[i % scenarios.length];
		const location = locations[i % locations.length];
		const officer = officers[i % officers.length];

		const idSuffix = (1000 + i).toString();
		const reference = `${scenario.prefix}/2025/${idSuffix}`;

		const dateOffset = Math.floor(Math.random() * 180);
		const receivedDate = new Date();
		receivedDate.setDate(receivedDate.getDate() - dateOffset);

		const siteAddressData = scenario.hasAddress
			? {
					SiteAddress: {
						create: {
							line1: `${i} High Street`,
							line2: i % 3 === 0 ? 'Industrial Estate' : undefined,
							townCity: location,
							postcode: `BS${(i % 20) + 1} ${i % 9}AB`,
							county: 'Somerset'
						}
					}
				}
			: {};

		await dbClient.case.upsert({
			where: { reference },
			update: {},
			create: {
				reference,
				name: `${scenario.nameTemplate} ${location} - Site ${i}`,
				caseOfficerId: officer,
				receivedDate,
				location: i % 2 === 0 ? 'South West' : 'North East',
				Type: { connect: { id: scenario.type } },
				SubType: { connect: { id: scenario.subType } },
				...siteAddressData
			}
		});
	}

	console.log('dev seed complete');
}
