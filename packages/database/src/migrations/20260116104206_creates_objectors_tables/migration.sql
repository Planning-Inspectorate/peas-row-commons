BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Contact] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Contact_id_df] DEFAULT newid(),
    [orgName] NVARCHAR(1000),
    [firstName] NVARCHAR(1000),
    [lastName] NVARCHAR(1000),
    [telephoneNumber] NVARCHAR(1000),
    [email] NVARCHAR(1000),
    [addressId] UNIQUEIDENTIFIER,
    [objectorStatusId] NVARCHAR(1000),
    [contactTypeId] NVARCHAR(1000),
    [caseId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [Contact_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ContactType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [ContactType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ObjectorStatus] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [ObjectorStatus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Contact] ADD CONSTRAINT [Contact_addressId_fkey] FOREIGN KEY ([addressId]) REFERENCES [dbo].[Address]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Contact] ADD CONSTRAINT [Contact_objectorStatusId_fkey] FOREIGN KEY ([objectorStatusId]) REFERENCES [dbo].[ObjectorStatus]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Contact] ADD CONSTRAINT [Contact_contactTypeId_fkey] FOREIGN KEY ([contactTypeId]) REFERENCES [dbo].[ContactType]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Contact] ADD CONSTRAINT [Contact_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[Case]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
