import type { PrismaClient } from '../src/client/client.ts';

export async function getFolderStats(
	db: PrismaClient,
	folderId: string
): Promise<{ totalFolders: number; totalDocuments: number }> {
	const result = await db.$queryRaw<
		{ totalFolders: number; totalDocuments: number }[]
	>`EXEC GetFolderStats @FolderId=${folderId}`;
	return result[0] ?? { totalFolders: 0, totalDocuments: 0 };
}
