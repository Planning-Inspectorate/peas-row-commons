/*
  Warnings:

  - You are about to drop the column `invoiceSentId` on the `Case` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Case] DROP CONSTRAINT [Case_invoiceSentId_fkey];

-- AlterTable
ALTER TABLE [dbo].[Case] DROP COLUMN [invoiceSentId];

-- AddForeignKey
ALTER TABLE [dbo].[CaseCosts] ADD CONSTRAINT [CaseCosts_invoiceSent_fkey] FOREIGN KEY ([invoiceSent]) REFERENCES [dbo].[CaseInvoiceSent]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
