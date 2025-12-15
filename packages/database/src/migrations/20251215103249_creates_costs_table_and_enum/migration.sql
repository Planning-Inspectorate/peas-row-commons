BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Case] ADD [invoiceSentId] NVARCHAR(1000);

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

-- CreateTable
CREATE TABLE [dbo].[CaseInvoiceSent] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [CaseInvoiceSent_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_invoiceSentId_fkey] FOREIGN KEY ([invoiceSentId]) REFERENCES [dbo].[CaseInvoiceSent]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

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
