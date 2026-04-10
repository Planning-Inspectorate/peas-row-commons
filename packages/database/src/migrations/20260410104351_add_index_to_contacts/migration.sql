BEGIN TRY

BEGIN TRAN;

-- Remove if already exists
DROP INDEX IF EXISTS [Contact_caseId_contactTypeId_idx] ON [dbo].[Contact];
DROP INDEX IF EXISTS [Contact_contactTypeId_firstName_idx] ON [dbo].[Contact];
DROP INDEX IF EXISTS [Contact_contactTypeId_lastName_idx] ON [dbo].[Contact];
DROP INDEX IF EXISTS [Contact_contactTypeId_orgName_idx] ON [dbo].[Contact];

-- CreateIndex
CREATE NONCLUSTERED INDEX [Contact_caseId_contactTypeId_idx] ON [dbo].[Contact]([caseId], [contactTypeId]);

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
