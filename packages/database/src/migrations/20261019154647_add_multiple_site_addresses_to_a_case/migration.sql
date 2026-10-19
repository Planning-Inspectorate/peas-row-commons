BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[CaseToAddress] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [CaseToAddress_id_df] DEFAULT newid(),
    [caseId] UNIQUEIDENTIFIER NOT NULL,
    [addressId] UNIQUEIDENTIFIER NOT NULL,
    [answerIndex] INT NOT NULL,
    CONSTRAINT [CaseToAddress_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CaseToAddress_caseId_addressId_key] UNIQUE NONCLUSTERED ([caseId],[addressId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CaseToAddress_addressId_idx] ON [dbo].[CaseToAddress]([addressId]);

-- AddForeignKey
ALTER TABLE [dbo].[CaseToAddress] ADD CONSTRAINT [CaseToAddress_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[Case]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CaseToAddress] ADD CONSTRAINT [CaseToAddress_addressId_fkey] FOREIGN KEY ([addressId]) REFERENCES [dbo].[Address]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
