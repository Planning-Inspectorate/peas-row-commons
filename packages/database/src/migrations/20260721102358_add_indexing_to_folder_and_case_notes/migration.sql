BEGIN TRY

BEGIN TRAN;

-- CreateIndex
CREATE NONCLUSTERED INDEX [CaseNote_caseId_idx] ON [dbo].[CaseNote]([caseId]);

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
