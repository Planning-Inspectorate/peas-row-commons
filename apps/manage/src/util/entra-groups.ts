import { InitEntraClient } from '@pins/peas-row-commons-lib/graph/types.ts';
import { EntraGroupMembers } from './entra-groups-types.ts';
import type { BaseLogger } from 'pino';

export interface GetEntraGroupMembersOptions {
	logger: BaseLogger;
	initClient: InitEntraClient;
	session: any;
	groupId: string;
}

/**
 * Gets all the entra group members inside of the `groupId`.
 *
 * Can be expanded to be passed >1 groupId and we can increase the Promise.
 *
 * Currently we state that all caseOfficers are just all users with access
 * to the env.
 */
export async function getEntraGroupMembers({
	logger,
	initClient,
	session,
	groupId
}: GetEntraGroupMembersOptions): Promise<EntraGroupMembers> {
	const members = {
		caseOfficers: []
	};

	const client = initClient(session);

	if (!client) {
		logger.warn('skipping entra group members, no Entra client');
		return members;
	}

	const [caseOfficers] = await Promise.all([client.listAllGroupMembers(groupId)]);

	members.caseOfficers = caseOfficers;
	logger.info({ caseOfficersCount: caseOfficers.length }, 'got group members');

	return members;
}
