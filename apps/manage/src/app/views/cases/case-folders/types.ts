export interface FlatFolder {
	id: string;
	parentFolderId?: string | null;
	displayName: string;
	[key: string]: any;
}

export interface FolderNode extends FlatFolder {
	children: FolderNode[];
}

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
