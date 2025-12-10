BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Folder] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Folder_id_df] DEFAULT newid(),
    [displayName] NVARCHAR(1000) NOT NULL,
    [displayOrder] INT,
    [parentFolderId] UNIQUEIDENTIFIER,
    [caseId] UNIQUEIDENTIFIER,
    [isCustom] BIT NOT NULL CONSTRAINT [Folder_isCustom_df] DEFAULT 0,
    [deletedAt] DATETIME2,
    CONSTRAINT [Folder_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Folder_caseId_displayName_parentFolderId_deletedAt_key] UNIQUE NONCLUSTERED ([caseId],[displayName],[parentFolderId],[deletedAt])
);

-- AddForeignKey
ALTER TABLE [dbo].[Folder] ADD CONSTRAINT [Folder_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[Case]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Folder] ADD CONSTRAINT [Folder_parentFolderId_fkey] FOREIGN KEY ([parentFolderId]) REFERENCES [dbo].[Folder]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
