BEGIN TRY

BEGIN TRAN;

-- CreateIndex
CREATE NONCLUSTERED INDEX [Case_subTypeId_typeId_id_receivedDate_idx] ON [dbo].[Case]([subTypeId], [typeId], [id], [receivedDate]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
