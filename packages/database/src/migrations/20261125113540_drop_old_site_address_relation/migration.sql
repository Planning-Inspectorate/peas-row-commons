/*
  Warnings:

  - You are about to drop the column `siteAddressId` on the `Case` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Case] DROP CONSTRAINT [Case_siteAddressId_fkey];

-- AlterTable
ALTER TABLE [dbo].[Case] DROP COLUMN [siteAddressId];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
