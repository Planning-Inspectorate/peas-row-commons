import type { InitEntraClient } from '@pins/peas-row-commons-lib/graph/types.ts';
import type { EntraGroupMembers } from './entra-groups-types.ts';
import type { BaseLogger } from 'pino';
import type { UserMap } from '../app/views/cases/view/types.ts';
import type { UserDetails } from '@pins/peas-row-commons-lib/graph/cached-entra-client.ts';
import { UNKNOWN_USER } from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';

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

export interface GetNonEntraGroupUsersOptions {
	logger: BaseLogger;
	initClient: InitEntraClient;
	session: any;
	userIds: string[];
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

/**
 * Gets user details for a list of user IDs, used to find users that are not in any of the Entra groups.
 */
export async function getNonEntraGroupUsers({
	logger,
	initClient,
	session,
	userIds
}: GetNonEntraGroupUsersOptions): Promise<UserDetails[]> {
	const client = initClient(session);
	if (!client || !userIds.length) {
		return [];
	}

	try {
		const users = await client.listUsersByIds(userIds);
		logger.info({ count: users.length }, 'fetched inactive users from graph');
		return users;
	} catch (error) {
		logger.error({ error }, 'failed to fetch inactive users from graph');
		return [];
	}
}

export async function buildUserDisplayNameMap(
	groupMembers: EntraGroupMembers,
	missingUserIds: string[],
	opts: {
		logger: BaseLogger;
		initClient: InitEntraClient;
		session: any;
	}
): Promise<Map<string, string>> {
	const userMap = new Map(groupMembers.allUsers.map((member) => [member.id, member.displayName]));
	const unresolvedIds = [...new Set(missingUserIds)].filter((id) => !userMap.has(id));

	if (unresolvedIds.length) {
		const inactiveUsers = await getNonEntraGroupUsers({
			logger: opts.logger,
			initClient: opts.initClient,
			session: opts.session,
			userIds: unresolvedIds
		});
		for (const user of inactiveUsers) {
			userMap.set(user.id, user.displayName);
		}
		// Add any still-unresolved IDs with the unknown-user fallback
		for (const id of unresolvedIds) {
			if (!userMap.has(id)) {
				userMap.set(id, UNKNOWN_USER);
			}
		}
	}
	return userMap;
}

/**
 * Gets group members and builds a user display name map for the given user IDs.
 * Combines getEntraGroupMembers and buildUserDisplayNameMap into one call.
 */
export async function getUserDisplayNames(
	userIds: string[],
	opts: GetEntraGroupMembersOptions
): Promise<{ groupMembers: EntraGroupMembers; userMap: UserMap }> {
	const groupMembers = await getEntraGroupMembers({
		logger: opts.logger,
		initClient: opts.initClient,
		session: opts.session,
		groupIds: opts.groupIds
	});

	const userMap = await buildUserDisplayNameMap(groupMembers, userIds, {
		logger: opts.logger,
		initClient: opts.initClient,
		session: opts.session
	});

	return { groupMembers, userMap };
}

/**
 * Gets a user's display name from the user map, with a fallback
 */
export function getUserDisplayName(
	userMap: UserMap,
	userId: string | null | undefined,
	fallback = UNKNOWN_USER
): string {
	if (!userId) return fallback;
	return userMap.get(userId) || fallback;
}
