export interface FlatFolder {
	id: string;
	parentFolderId?: string | null;
	displayName: string;
	[key: string]: any;
}

export interface FolderNode extends FlatFolder {
	children: FolderNode[];
}
