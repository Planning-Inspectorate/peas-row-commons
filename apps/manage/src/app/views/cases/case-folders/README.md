# Case Folders
- This is the directory for handling everything to do with folders in a case.

## Architecture & Schema
- `Folder`s are their own table, containing a `parentId` column that points to another folder, this is how you get the nested structure.
- The `Document`s table then points to a folder with `folderId`.
- Importantly, the documents' locations in azure blob are _decoupled_ from their folder location in MPESC.
- When you move folder, all you are doing is updating its `folderId` column, you are not touching its location on Azure Blob.
- This is to make it cleaner in terms of deleting, renaming, moving files, as there is no real reason to have the location aligned and it would cost to have to manually keep these 2 things in sync, as unlike SharePoint there is no UI to be accessing these files from outside of MPESC.

## Creating Folders
- Adding a new folder just involves providing a name and saving, you cannot have 2 folders with the same name within the same folder, but across cases or within different folders then they can have the same name.
- There are also a variety of special characters that we do not allow

### Forward slashes
- We allow forward slashes (`/`) in folder names
- Important to note, as folder names are used in places where a forward slash would break things (e.g. in the URL), so it is important that we sanitise these into something like `-` or `_`

## Renaming Folders
- Renaming a folder is the same as adding a new one, it has the same validation but just edits the currently selected folder.

## Deleting Folders
- Utilises soft-deleting, where the `deletedAt` nullable column indicates whether a folder has been removed and also provides added detail of _when_ as well.
- You cannot delete folders that contain files or other folders.