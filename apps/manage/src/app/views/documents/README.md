# Documents
- This is the directory for the generic document modules.

## Deleting
- Deleting documents is a soft delete, there is a `deletedAt` column that is used to determine whether a file has been deleted & when.
- This is important to remember as when grabbing all documents, you need to remember to do the equivalent of `SELECT * FROM documents WHERE deletedAt IS NULL;`
- The only time we hard delete files is when a user uploads a file and then immediately removes it before committing.
- Deleting is also a bulk action, allowing users to delete up to 100 documents at a time.

## Downloading
- Downloading is also a bulk action.
- We use a package called `archiver` to zip the files before downloading to make the process more efficient and user friendly.
- We went with level 5 archiving, which strikes a balance between speed and level of compression. If it is found to be too slow, then we can tweak this number more towards speed at a compression cost.
- Because we allow files of the same name currently, when zipping we calculate and increment a counter to stop files being overwritten. E.g. zipping `file.docx` and `file.docx` together will download a zip with `file.docx` and `file (1).docx`

## Read & Flagged
- Documents can be `read` and `flagged` on a user-by-user basis.
- This is achieved through a join table between `Users` & `Documents`
- To avoid inserting millions of rows on migration, and having to deal with the headache of combining this with our `Just-In-Time` User model creation, we opted for a "table-as-override" model, where we have a default status, and a row in the database acts as an override.
- For example, a document uploaded by User A will have no read & flagged statuses in the database, so it falls back to the default (`Unread` and `Unflagged`) when rendering the UI. If User A then marks the file as `Read`, then a row will be inserted into the table as an override with `Read=true` and `Flagged=false`. User B will still see the defaults however until they themselves decide to update it.
- The defaults are almost always `Unread` and `Unflagged` - however, for closed cases migrated from Horizon, those files are defaulted to `Read` and `Unflagged`