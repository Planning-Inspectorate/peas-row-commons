BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Case] ADD [act] NVARCHAR(1000),
[consentSought] NVARCHAR(1000),
[inspectorBandId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[InspectorBand] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [InspectorBand_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_inspectorBandId_fkey] FOREIGN KEY ([inspectorBandId]) REFERENCES [dbo].[InspectorBand]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
