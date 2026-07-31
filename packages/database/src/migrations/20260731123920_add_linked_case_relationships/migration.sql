BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[CaseRelationship] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [CaseRelationship_id_df] DEFAULT newid(),
    [parentCaseId] UNIQUEIDENTIFIER NOT NULL,
    [childCaseId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [CaseRelationship_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CaseRelationship_childCaseId_key] UNIQUE NONCLUSTERED ([childCaseId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CaseRelationship_parentCaseId_idx] ON [dbo].[CaseRelationship]([parentCaseId]);

-- AddForeignKey
ALTER TABLE [dbo].[CaseRelationship] ADD CONSTRAINT [CaseRelationship_parentCaseId_fkey] FOREIGN KEY ([parentCaseId]) REFERENCES [dbo].[Case]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CaseRelationship] ADD CONSTRAINT [CaseRelationship_childCaseId_fkey] FOREIGN KEY ([childCaseId]) REFERENCES [dbo].[Case]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
