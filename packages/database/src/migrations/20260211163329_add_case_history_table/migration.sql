BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[CaseHistory] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [CaseHistory_id_df] DEFAULT newid(),
    [caseId] UNIQUEIDENTIFIER NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [metadata] NVARCHAR(max),
    [userId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CaseHistory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [CaseHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CaseHistory_caseId_createdAt_idx] ON [dbo].[CaseHistory]([caseId], [createdAt] DESC);

-- AddForeignKey
ALTER TABLE [dbo].[CaseHistory] ADD CONSTRAINT [CaseHistory_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[Case]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
