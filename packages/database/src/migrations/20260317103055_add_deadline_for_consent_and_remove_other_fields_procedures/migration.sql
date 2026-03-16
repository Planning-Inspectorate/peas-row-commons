/*
  Warnings:

  - You are about to drop the column `hearingInTarget` on the `Procedure` table. All the data in the column will be lost.
  - You are about to drop the column `inquiryFinishedDate` on the `Procedure` table. All the data in the column will be lost.
  - You are about to drop the column `inquiryInTarget` on the `Procedure` table. All the data in the column will be lost.
  - You are about to drop the column `lengthOfHearingEvent` on the `Procedure` table. All the data in the column will be lost.
  - You are about to drop the column `lengthOfInquiryEvent` on the `Procedure` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Procedure] DROP COLUMN [hearingInTarget],
[inquiryFinishedDate],
[inquiryInTarget],
[lengthOfHearingEvent],
[lengthOfInquiryEvent];
ALTER TABLE [dbo].[Procedure] ADD [deadlineForConsentDate] DATETIME2;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
