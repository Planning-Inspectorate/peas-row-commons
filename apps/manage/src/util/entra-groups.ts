import type { InitEntraClient } from '@pins/peas-row-commons-lib/graph/types.ts';
import type { EntraGroupMembers } from './entra-groups-types.ts';
import type { BaseLogger } from 'pino';

export type GroupMembers = {
	allUsers: string;
	caseOfficers: string;
	inspectors: string;
};

export interface GetEntraGroupMembersOptions {
	logger: BaseLogger;
	initClient: InitEntraClient;
	session: any;
	groupIds: GroupMembers;
}

/**
 * Gets all the entra group members based on the provides
 * group IDs.
 */
export async function getEntraGroupMembers({
	logger,
	initClient,
	session,
	groupIds
}: GetEntraGroupMembersOptions): Promise<EntraGroupMembers> {
	const members = {
		allUsers: [],
		caseOfficers: [],
		inspectors: []
	};

	const client = initClient(session);

	if (!client) {
		logger.warn('skipping entra group members, no Entra client');
		return members;
	}

	const [allUsers, caseOfficers, inspectors] = await Promise.all([
		client.listAllGroupMembers(groupIds.allUsers),
		client.listAllGroupMembers(groupIds.caseOfficers),
		client.listAllGroupMembers(groupIds.inspectors)
	]);

	members.allUsers = allUsers;
	members.caseOfficers = caseOfficers;
	members.inspectors = inspectors;
	logger.info(
		{ allUsersCount: allUsers.length, caseOfficersCount: caseOfficers.length, inspectorsCount: inspectors.length },
		'got group members'
	);

	return members;
}
