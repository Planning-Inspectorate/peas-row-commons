BEGIN TRY

BEGIN TRAN;

-- CreateIndex
CREATE NONCLUSTERED INDEX [Contact_caseId_contactTypeId_idx] ON [dbo].[Contact]([caseId], [contactTypeId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
