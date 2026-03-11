/*
  Warnings:

  - You are about to drop the column `withdrawalDate` on the `CaseAbeyance` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CaseAbeyance] DROP COLUMN [withdrawalDate];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
