BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Document] ADD [mimeType] NVARCHAR(1000) NOT NULL CONSTRAINT [Document_mimeType_df] DEFAULT 'application/octet-stream';

-- AlterTable
ALTER TABLE [dbo].[DraftDocument] ADD [mimeType] NVARCHAR(1000) NOT NULL CONSTRAINT [DraftDocument_mimeType_df] DEFAULT 'application/octet-stream';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
