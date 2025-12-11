type Folder = {
	displayName: string;
	displayOrder: number;
	childFolders?: { create: Folder[] };
};

/**
 * Updates the static data passed in, appending a caseId
 */
export function addCaseIdToFolders(folders: Folder[], caseId: string) {
	return folders.map((folder) => {
		const folderWithId = {
			...folder,
			caseId
		};

		if (folder.childFolders?.create) {
			folderWithId.childFolders = {
				create: folder.childFolders.create.map((child: any) => ({
					...child,
					caseId
				}))
			};
		}

		return folderWithId;
	});
}

/**
 * Creates folders for a given case.
 *
 * "Awaits" Promise.all because I think it has clearer intent than
 * "return"ing it and just awaiting in the function-call. Even though we
 * lose a tick.
 */
export async function createFolders(folders: Folder[], caseId: string, tx: any) {
	const folderData = addCaseIdToFolders(folders, caseId);

	await Promise.all(
		folderData.map((folderData) =>
			tx.folder.create({
				data: folderData
			})
		)
	);
}
