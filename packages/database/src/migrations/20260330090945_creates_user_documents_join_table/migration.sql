BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[UserDocument] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [UserDocument_id_df] DEFAULT newid(),
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [documentId] UNIQUEIDENTIFIER NOT NULL,
    [caseId] UNIQUEIDENTIFIER NOT NULL,
    [readStatus] BIT NOT NULL CONSTRAINT [UserDocument_readStatus_df] DEFAULT 0,
    [flaggedStatus] BIT NOT NULL CONSTRAINT [UserDocument_flaggedStatus_df] DEFAULT 0,
    CONSTRAINT [UserDocument_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserDocument_userId_documentId_key] UNIQUE NONCLUSTERED ([userId],[documentId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserDocument_caseId_userId_idx] ON [dbo].[UserDocument]([caseId], [userId]);

-- AddForeignKey
ALTER TABLE [dbo].[UserDocument] ADD CONSTRAINT [UserDocument_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserDocument] ADD CONSTRAINT [UserDocument_documentId_fkey] FOREIGN KEY ([documentId]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserDocument] ADD CONSTRAINT [UserDocument_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[Case]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
