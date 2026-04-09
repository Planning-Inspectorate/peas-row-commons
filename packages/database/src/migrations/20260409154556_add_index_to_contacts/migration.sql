BEGIN TRY

BEGIN TRAN;

-- CreateIndex
CREATE NONCLUSTERED INDEX [Contact_contactTypeId_firstName_idx] ON [dbo].[Contact]([contactTypeId], [firstName]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Contact_contactTypeId_lastName_idx] ON [dbo].[Contact]([contactTypeId], [lastName]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Contact_contactTypeId_orgName_idx] ON [dbo].[Contact]([contactTypeId], [orgName]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
