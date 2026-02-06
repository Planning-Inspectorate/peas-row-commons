/*
  Warnings:

  - You are about to alter the column `caseOfficerId` on the `Case` table. The data in that column could be lost. The data in that column will be cast from `NVarChar(1000)` to `UniqueIdentifier`.
  - You are about to drop the column `decisionMakerEntraId` on the `CaseDecision` table. All the data in the column will be lost.
  - You are about to drop the column `authorEntraId` on the `CaseNote` table. All the data in the column will be lost.
  - You are about to drop the column `inspectorEntraId` on the `Inspector` table. All the data in the column will be lost.
  - Added the required column `authorId` to the `CaseNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inspectorId` to the `Inspector` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Case] ALTER COLUMN [caseOfficerId] UNIQUEIDENTIFIER NULL;

-- AlterTable
ALTER TABLE [dbo].[CaseDecision] DROP COLUMN [decisionMakerEntraId];
ALTER TABLE [dbo].[CaseDecision] ADD [decisionMakerId] UNIQUEIDENTIFIER;

-- AlterTable
ALTER TABLE [dbo].[CaseNote] DROP COLUMN [authorEntraId];
ALTER TABLE [dbo].[CaseNote] ADD [authorId] UNIQUEIDENTIFIER NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Inspector] DROP COLUMN [inspectorEntraId];
ALTER TABLE [dbo].[Inspector] ADD [inspectorId] UNIQUEIDENTIFIER NOT NULL;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [User_id_df] DEFAULT newid(),
    [idpUserId] NVARCHAR(1000),
    [legacyId] NVARCHAR(1000),
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_idpUserId_key] UNIQUE NONCLUSTERED ([idpUserId])
);

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_caseOfficerId_fkey] FOREIGN KEY ([caseOfficerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CaseNote] ADD CONSTRAINT [CaseNote_authorId_fkey] FOREIGN KEY ([authorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CaseDecision] ADD CONSTRAINT [CaseDecision_decisionMakerId_fkey] FOREIGN KEY ([decisionMakerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Inspector] ADD CONSTRAINT [Inspector_inspectorId_fkey] FOREIGN KEY ([inspectorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
