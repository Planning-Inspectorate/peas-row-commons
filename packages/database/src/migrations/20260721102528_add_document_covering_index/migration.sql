CREATE NONCLUSTERED INDEX [IX_Document_deletedAt_folderId_caseId]
   ON [dbo].[Document] ([deletedAt], [folderId], [caseId])
   INCLUDE ([blobName], [fileName], [mimeType], [size], [uploadedDate])
   WITH (ONLINE = ON);