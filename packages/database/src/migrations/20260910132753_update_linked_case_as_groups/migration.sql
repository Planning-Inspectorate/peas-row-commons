BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[LinkedCase] DROP CONSTRAINT [LinkedCase_caseId_fkey];

-- AlterTable
ALTER TABLE [dbo].[Case] ADD [linkedCasesId] UNIQUEIDENTIFIER;

-- AlterTable
ALTER TABLE [dbo].[LinkedCase] ALTER COLUMN [isLead] BIT NULL;
ALTER TABLE [dbo].[LinkedCase] ALTER COLUMN [caseId] UNIQUEIDENTIFIER NULL;
ALTER TABLE [dbo].[LinkedCase] ADD [leadCaseId] UNIQUEIDENTIFIER;

-- CreateIndex
CREATE NONCLUSTERED INDEX [LinkedCase_leadCaseId_idx] ON [dbo].[LinkedCase]([leadCaseId]);

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_linkedCasesId_fkey] FOREIGN KEY ([linkedCasesId]) REFERENCES [dbo].[LinkedCase]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LinkedCase] ADD CONSTRAINT [LinkedCase_leadCaseId_fkey] FOREIGN KEY ([leadCaseId]) REFERENCES [dbo].[Case]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LinkedCase] ADD CONSTRAINT [LinkedCase_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[Case]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
