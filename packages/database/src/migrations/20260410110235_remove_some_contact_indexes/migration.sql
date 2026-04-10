BEGIN TRY

BEGIN TRAN;

-- DropIndex
DROP INDEX [Contact_contactTypeId_firstName_idx] ON [dbo].[Contact];

-- DropIndex
DROP INDEX [Contact_contactTypeId_lastName_idx] ON [dbo].[Contact];

-- DropIndex
DROP INDEX [Contact_contactTypeId_orgName_idx] ON [dbo].[Contact];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
