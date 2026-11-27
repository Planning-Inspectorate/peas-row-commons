BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Document] ADD [scanStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [Document_scanStatus_df] DEFAULT 'pending';

-- CreateTable
CREATE TABLE [dbo].[DocumentScanStatus] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [DocumentScanStatus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- Manually add the default values for the new DocumentScanStatus table
INSERT INTO [dbo].[DocumentScanStatus] ([id], [displayName])
VALUES ('pending', 'Pending'), ('pass', 'Pass'), ('fail', 'Fail');

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_scanStatus_fkey] FOREIGN KEY ([scanStatus]) REFERENCES [dbo].[DocumentScanStatus]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
