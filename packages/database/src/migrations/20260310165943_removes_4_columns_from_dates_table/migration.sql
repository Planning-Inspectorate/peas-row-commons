/*
  Warnings:

  - You are about to drop the column `caseOfficerVerificationDate` on the `CaseDates` table. All the data in the column will be lost.
  - You are about to drop the column `consentDeadlineDate` on the `CaseDates` table. All the data in the column will be lost.
  - You are about to drop the column `ogdDueDate` on the `CaseDates` table. All the data in the column will be lost.
  - You are about to drop the column `proposalLetterDate` on the `CaseDates` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CaseDates] DROP COLUMN [caseOfficerVerificationDate],
[consentDeadlineDate],
[ogdDueDate],
[proposalLetterDate];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
