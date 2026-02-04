import {
	PEAS_FOLDERS,
	ROW_FOLDERS,
	COMMON_LAND_FOLDERS
} from '@pins/peas-row-commons-database/src/seed/static_data/folders.ts';
import { CASE_TYPES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/types.ts';
import type { FlatFolder, FolderNode } from './types.ts';
import { stringToKebab } from '@pins/peas-row-commons-lib/util/strings.ts';
import type { FlatFolder, FolderNode } from './types.ts';

const ROW_FOLDERS_MAP = {
	[CASE_TYPES_ID.COASTAL_ACCESS]: ROW_FOLDERS,
	[CASE_TYPES_ID.RIGHTS_OF_WAY]: ROW_FOLDERS
};

const COMMON_LAND_FOLDERS_MAP = {
	[CASE_TYPES_ID.COMMON_LAND]: COMMON_LAND_FOLDERS
};

const PEAS_FOLDERS_MAP = {
	[CASE_TYPES_ID.DROUGHT]: PEAS_FOLDERS,
	[CASE_TYPES_ID.HOUSING_PLANNING_CPOS]: PEAS_FOLDERS,
	[CASE_TYPES_ID.OTHER_SOS_CASEWORK]: PEAS_FOLDERS,
	[CASE_TYPES_ID.PURCHASE_NOTICES]: PEAS_FOLDERS,
	[CASE_TYPES_ID.WAYLEAVES]: PEAS_FOLDERS
};

/**
 * Maps case types to their desired folder structure on creation.
 * All PEAS get same folder.
 * RoW & Coastal Access share one style.
 * Common Land gets its own folder structure.
 */
export const FOLDER_TEMPLATES_MAP = {
	...PEAS_FOLDERS_MAP,
	...ROW_FOLDERS_MAP,
	...COMMON_LAND_FOLDERS_MAP
};

type Folder = {
	displayName: string;
	displayOrder: number;
	ChildFolders?: { create: Folder[] };
};

/**
 * Breadcrumb item structure for breadcrumbs component
 */
export type BreadcrumbItem = {
	text: string;
	href?: string;
};

/**
 * Minimal folder info needed for breadcrumbs
 */
export type FolderBreadcrumb = {
	id: string;
	displayName: string;
	parentFolderId: string | null;
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

		if (folder.ChildFolders?.create) {
			folderWithId.ChildFolders = {
				create: folder.ChildFolders.create.map((child: any) => ({
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

/**
 * Returns desired folder structure based on typeId & passed in lookup map.
 */
export function findFolders(
	typeId: (typeof CASE_TYPES_ID)[keyof typeof CASE_TYPES_ID],
	lookupMap: typeof FOLDER_TEMPLATES_MAP
) {
	return lookupMap[typeId] || [];
}

/**
 * Takes the flat folder data connected to case and builds the nested structure,
 * NB: not currently used anywhere beyonds tests, will be used in a following ticket.
 */
export function buildFolderTree(flatFolders: FlatFolder[]): FolderNode[] {
	const nodeMap = new Map<string, FolderNode>();
	const roots: FolderNode[] = [];

	for (const folder of flatFolders) {
		nodeMap.set(folder.id, { ...folder, children: [] });
	}

	for (const folder of flatFolders) {
		const node = nodeMap.get(folder.id);

		if (!node) continue;

		if (folder.parentFolderId && nodeMap.has(folder.parentFolderId)) {
			const parent = nodeMap.get(folder.parentFolderId);
			parent?.children.push(node);
		} else {
			roots.push(node);
		}
	}

	return roots;
}
/**
 * Builds breadcrumb items for the breadcrumbs component.
 * Structure: Manage case files > Folder > Subfolder > Subfolder
 */
export function buildBreadcrumbItems(caseId: string, folderPath: FolderBreadcrumb[]): BreadcrumbItem[] {
	const baseFoldersUrl = `/cases/${caseId}/case-folders`;

	// Start with "Manage case files" which links to the root folders page
	const breadcrumbItems: BreadcrumbItem[] = [
		{
			text: 'Manage case files',
			href: baseFoldersUrl
		}
	];

	// Add each folder in the path
	// All folders except the last one get links
	folderPath.forEach((folder, index) => {
		const isLastItem = index === folderPath.length - 1;

		breadcrumbItems.push({
			text: folder.displayName,
			// Last item (current page) shouldn't have a link per guidelines
			href: isLastItem ? undefined : `${baseFoldersUrl}/${folder.id}/${stringToKebab(folder.displayName)}`
		});
	});

	return breadcrumbItems;
}

/**
 * Takes the flat folder data connected to case and builds the nested structure,
 * NB: not currently used anywhere beyonds tests, will be used in a following ticket.
 */
export function buildFolderTree(flatFolders: FlatFolder[]): FolderNode[] {
	const nodeMap = new Map<string, FolderNode>();
	const roots: FolderNode[] = [];

	for (const folder of flatFolders) {
		nodeMap.set(folder.id, { ...folder, children: [] });
	}

	for (const folder of flatFolders) {
		const node = nodeMap.get(folder.id);

		if (!node) continue;

		if (folder.parentFolderId && nodeMap.has(folder.parentFolderId)) {
			const parent = nodeMap.get(folder.parentFolderId);
			parent?.children.push(node);
		} else {
			roots.push(node);
		}
	}

	return roots;
}
