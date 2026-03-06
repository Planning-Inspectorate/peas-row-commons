BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Case] ADD [authorityId] UNIQUEIDENTIFIER;

-- CreateTable
CREATE TABLE [dbo].[Authority] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Authority_id_df] DEFAULT newid(),
    [name] NVARCHAR(1000) NOT NULL,
    [pinsCode] NVARCHAR(1000) NOT NULL,
    [authorityStatusId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Authority_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuthorityStatus] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [AuthorityStatus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Authority_pinsCode_idx] ON [dbo].[Authority]([pinsCode]);

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_authorityId_fkey] FOREIGN KEY ([authorityId]) REFERENCES [dbo].[Authority]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Authority] ADD CONSTRAINT [Authority_authorityStatusId_fkey] FOREIGN KEY ([authorityStatusId]) REFERENCES [dbo].[AuthorityStatus]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
