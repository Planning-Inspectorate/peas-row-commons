import type { Folder } from '@pins/peas-row-commons-database/src/client/client.ts';

/**
 * Formats folders array for displaying,
 * currently only orders them, if they have
 * a display order, else pushes them to the top.
 */
export function createFoldersViewModel(folders: Folder[]) {
	const sortedFolders = folders.sort((a, b) => (a.displayOrder || 100) - (b?.displayOrder || 100));

	const mappedFolders = sortedFolders.map((folder) => {
		return {
			...folder,
			encodedDisplayName: encodeURIComponent(folder.displayName)
		};
	});
	return mappedFolders;
}
