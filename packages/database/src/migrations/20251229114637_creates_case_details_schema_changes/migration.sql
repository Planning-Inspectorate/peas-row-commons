/*
  Warnings:

  - You are about to drop the column `applicant` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `area` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `authority` on the `Case` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Case] DROP COLUMN [applicant],
[area],
[authority];
ALTER TABLE [dbo].[Case] ADD [advertisedModificationId] NVARCHAR(1000),
[applicantId] UNIQUEIDENTIFIER,
[authorityid] UNIQUEIDENTIFIER,
[internalReference] NVARCHAR(1000),
[location] NVARCHAR(1000),
[priorityId] NVARCHAR(1000),
[statusId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[CaseStatus] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [CaseStatus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AdvertisedModificationStatus] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [AdvertisedModificationStatus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CasePriority] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [CasePriority_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Applicant] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Applicant_id_df] DEFAULT newid(),
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [telephoneNumber] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Applicant_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Authority] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Authority_id_df] DEFAULT newid(),
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [telephoneNumber] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Authority_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[CaseStatus]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_advertisedModificationId_fkey] FOREIGN KEY ([advertisedModificationId]) REFERENCES [dbo].[AdvertisedModificationStatus]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_applicantId_fkey] FOREIGN KEY ([applicantId]) REFERENCES [dbo].[Applicant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_authorityid_fkey] FOREIGN KEY ([authorityid]) REFERENCES [dbo].[Authority]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_priorityId_fkey] FOREIGN KEY ([priorityId]) REFERENCES [dbo].[CasePriority]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
