BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[CaseCosts] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [CaseCosts_id_df] DEFAULT newid(),
    [rechargeable] BIT,
    [finalCost] DECIMAL(32,16),
    [feeReceived] BIT,
    [invoiceSent] NVARCHAR(1000),
    [caseId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [CaseCosts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CaseCosts_caseId_key] UNIQUE NONCLUSTERED ([caseId])
);

-- AddForeignKey
ALTER TABLE [dbo].[CaseCosts] ADD CONSTRAINT [CaseCosts_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[Case]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
