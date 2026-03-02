/*
  Warnings:

  - You are about to drop the column `primaryProcedureStep` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `step` on the `Procedure` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropIndex
ALTER TABLE [dbo].[Procedure] DROP CONSTRAINT [Procedure_caseId_step_key];

-- AlterTable
ALTER TABLE [dbo].[Case] DROP COLUMN [primaryProcedureStep];

-- AlterTable
ALTER TABLE [dbo].[Procedure] DROP COLUMN [step];
ALTER TABLE [dbo].[Procedure] ADD [inspectorId] UNIQUEIDENTIFIER;

-- AddForeignKey
ALTER TABLE [dbo].[Procedure] ADD CONSTRAINT [Procedure_inspectorId_fkey] FOREIGN KEY ([inspectorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
