BEGIN TRY

BEGIN TRAN;

-- CreateIndex
CREATE NONCLUSTERED INDEX [CaseNote_caseId_idx] ON [dbo].[CaseNote]([caseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Document_deletedAt_folderId_caseId_idx]
   ON [dbo].[Document] ([deletedAt], [folderId], [caseId])
   INCLUDE ([blobName], [fileName], [mimeType], [size], [uploadedDate])
   WITH (ONLINE = ON);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Folder_deletedAt_parentFolderId_idx] ON [dbo].[Folder]([deletedAt], [parentFolderId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
