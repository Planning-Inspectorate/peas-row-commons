BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Case] ADD [closedDate] DATETIME2;

-- CreateTable
CREATE TABLE [dbo].[CaseDates] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [CaseDates_id_df] DEFAULT newid(),
    [startDate] DATETIME2,
    [objectionPeriodEndsDate] DATETIME2,
    [expectedSubmissionDate] DATETIME2,
    [offerForWrittenRepresentationDate] DATETIME2,
    [consentDeadlineDate] DATETIME2,
    [targetEventDate] DATETIME2,
    [ogdDueDate] DATETIME2,
    [proposalLetterDate] DATETIME2,
    [expiryDate] DATETIME2,
    [partiesEventNotificationDeadlineDate] DATETIME2,
    [partiesDecisionNotificationDeadlineDate] DATETIME2,
    [caseId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [CaseDates_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CaseDates_caseId_key] UNIQUE NONCLUSTERED ([caseId])
);

-- AddForeignKey
ALTER TABLE [dbo].[CaseDates] ADD CONSTRAINT [CaseDates_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[Case]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
