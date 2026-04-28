# File Upload
This is the directory that contains the logic for uploading files into MPESC.

## Blob
- We use Azure Blob for storing files.
- When uploading a file the first thing that happens is that the file is saved into blob storage.
- It is saved under the name `<case_id>/<randomly_generated_uuid>`. This is to avoid clashing names, versioning issues, and orphaned documents.

## Draft Documents
- After successfully uploading into blob, documents are then inserted into a "draft documents" table, or scratchpad.
- This is because the upload flow allows users to upload documents and then immediately delete or leave before finally saving.
- This scratchpad contains pretty much the same columns as you would expect in the documents table, with the addition of a sessionKey,
this key is the current sessionId from the request object and is used for finding the correct documents to commit or delete

## Deleting before committing
- Once the file has been uploaded into blob and a scratchpad row has been created, the user can delete the file.
- Deleting will remove the file from the draft documents table and delete the file in blob

## Committing
- Once happy, clicking save will "commit" the files, saving them into the concrete and permanent Documents table
- They will then appear as a proper document in MPESC.
