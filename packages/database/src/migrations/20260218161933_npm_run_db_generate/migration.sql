/*
  Warnings:

  - You are about to alter the column `userId` on the `CaseHistory` table. The data in that column could be lost. The data in that column will be cast from `NVarChar(1000)` to `UniqueIdentifier`.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CaseHistory] ALTER COLUMN [userId] UNIQUEIDENTIFIER NOT NULL;

-- AddForeignKey
ALTER TABLE [dbo].[CaseHistory] ADD CONSTRAINT [CaseHistory_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
