BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[CaseAbeyance] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [CaseAbeyance_id_df] DEFAULT newid(),
    [abeyanceStartDate] DATETIME2,
    [abeyanceEndDate] DATETIME2,
    [withdrawalDate] DATETIME2,
    [caseId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [CaseAbeyance_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CaseAbeyance_caseId_key] UNIQUE NONCLUSTERED ([caseId])
);

-- AddForeignKey
ALTER TABLE [dbo].[CaseAbeyance] ADD CONSTRAINT [CaseAbeyance_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[Case]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
