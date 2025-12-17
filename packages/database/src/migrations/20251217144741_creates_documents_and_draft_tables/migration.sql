BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Document] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Document_id_df] DEFAULT newid(),
    [fileName] NVARCHAR(1000) NOT NULL,
    [uploadedDate] DATETIME2 NOT NULL CONSTRAINT [Document_uploadedDate_df] DEFAULT CURRENT_TIMESTAMP,
    [size] BIGINT NOT NULL CONSTRAINT [Document_size_df] DEFAULT 0,
    [blobName] NVARCHAR(1000) NOT NULL,
    [caseId] UNIQUEIDENTIFIER NOT NULL,
    [folderId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [Document_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DraftDocument] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DraftDocument_id_df] DEFAULT newid(),
    [sessionKey] NVARCHAR(1000) NOT NULL,
    [caseId] NVARCHAR(1000) NOT NULL,
    [folderId] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [blobName] NVARCHAR(1000) NOT NULL,
    [size] BIGINT NOT NULL,
    CONSTRAINT [DraftDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DraftDocument_sessionKey_caseId_idx] ON [dbo].[DraftDocument]([sessionKey], [caseId]);

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[Case]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_folderId_fkey] FOREIGN KEY ([folderId]) REFERENCES [dbo].[Folder]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
