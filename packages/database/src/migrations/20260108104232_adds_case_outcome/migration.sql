BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[CaseDecision] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [CaseDecision_id_df] DEFAULT newid(),
    [decisionMakerEntraId] NVARCHAR(1000),
    [outcomeDate] DATETIME2,
    [decisionReceivedDate] DATETIME2,
    [inTarget] BIT,
    [partiesNotifiedDate] DATETIME2,
    [orderDecisionDispatchDate] DATETIME2,
    [sealedOrderReturnedDate] DATETIME2,
    [decisionPublishedDate] DATETIME2,
    [isFencingPermanent] BIT,
    [fencingPermanentComment] NVARCHAR(2000),
    [decisionTypeId] NVARCHAR(1000),
    [outcomeId] NVARCHAR(1000),
    [caseId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [CaseDecision_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CaseDecision_caseId_key] UNIQUE NONCLUSTERED ([caseId])
);

-- CreateTable
CREATE TABLE [dbo].[DecisionType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [DecisionType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Outcome] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [Outcome_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[CaseDecision] ADD CONSTRAINT [CaseDecision_decisionTypeId_fkey] FOREIGN KEY ([decisionTypeId]) REFERENCES [dbo].[DecisionType]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CaseDecision] ADD CONSTRAINT [CaseDecision_outcomeId_fkey] FOREIGN KEY ([outcomeId]) REFERENCES [dbo].[Outcome]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CaseDecision] ADD CONSTRAINT [CaseDecision_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[Case]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
