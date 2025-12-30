/*
  Warnings:

  - You are about to drop the column `offerForWrittenRepresentationDate` on the `CaseDates` table. All the data in the column will be lost.
  - You are about to drop the column `partiesEventNotificationDeadlineDate` on the `CaseDates` table. All the data in the column will be lost.
  - You are about to drop the column `targetEventDate` on the `CaseDates` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CaseDates] DROP COLUMN [offerForWrittenRepresentationDate],
[partiesEventNotificationDeadlineDate],
[targetEventDate];
ALTER TABLE [dbo].[CaseDates] ADD [caseOfficerVerificationDate] DATETIME2,
[proposedModificationsDate] DATETIME2,
[targetDecisionDate] DATETIME2;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
