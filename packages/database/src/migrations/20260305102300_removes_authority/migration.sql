/*
  Warnings:

  - You are about to drop the column `authorityid` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the `Authority` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Case] DROP CONSTRAINT [Case_authorityid_fkey];

-- AlterTable
ALTER TABLE [dbo].[Case] DROP COLUMN [authorityid];

-- DropTable
DROP TABLE [dbo].[Authority];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
