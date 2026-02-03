BEGIN TRY

BEGIN TRAN;

-- RenameColumn
EXEC sp_rename 'dbo.Case.internalReference', 'historicalReference', 'COLUMN';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH