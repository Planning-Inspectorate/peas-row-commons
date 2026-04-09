BEGIN TRY

BEGIN TRAN;

-- CreateIndex
CREATE NONCLUSTERED INDEX [Contact_firstName_idx] ON [dbo].[Contact]([firstName]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Contact_lastName_idx] ON [dbo].[Contact]([lastName]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Contact_orgName_idx] ON [dbo].[Contact]([orgName]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
