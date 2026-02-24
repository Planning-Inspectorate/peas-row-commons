/*
  Warnings:

  - You are about to drop the column `act` on the `Case` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Case] DROP COLUMN [act];
ALTER TABLE [dbo].[Case] ADD [actId] NVARCHAR(1000),
[sectionId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[Act] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [Act_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Section] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [Section_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_actId_fkey] FOREIGN KEY ([actId]) REFERENCES [dbo].[Act]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_sectionId_fkey] FOREIGN KEY ([sectionId]) REFERENCES [dbo].[Section]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
