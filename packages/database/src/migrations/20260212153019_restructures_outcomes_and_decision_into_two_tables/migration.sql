/*
  Warnings:

  - You are about to drop the column `caseId` on the `CaseDecision` table. All the data in the column will be lost.
  - You are about to drop the column `decisionPublishedDate` on the `CaseDecision` table. All the data in the column will be lost.
  - You are about to drop the column `fencingPermanentComment` on the `CaseDecision` table. All the data in the column will be lost.
  - You are about to drop the column `inTarget` on the `CaseDecision` table. All the data in the column will be lost.
  - You are about to drop the column `isFencingPermanent` on the `CaseDecision` table. All the data in the column will be lost.
  - You are about to drop the column `orderDecisionDispatchDate` on the `CaseDecision` table. All the data in the column will be lost.
  - You are about to drop the column `partiesNotifiedDate` on the `CaseDecision` table. All the data in the column will be lost.
  - You are about to drop the column `proposeNotToConfirmComment` on the `CaseDecision` table. All the data in the column will be lost.
  - You are about to drop the column `sealedOrderReturnedDate` on the `CaseDecision` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[CaseDecision] DROP CONSTRAINT [CaseDecision_caseId_fkey];

-- DropIndex
ALTER TABLE [dbo].[CaseDecision] DROP CONSTRAINT [CaseDecision_caseId_key];

-- AlterTable
ALTER TABLE [dbo].[CaseDecision] DROP COLUMN [caseId],
[decisionPublishedDate],
[fencingPermanentComment],
[inTarget],
[isFencingPermanent],
[orderDecisionDispatchDate],
[partiesNotifiedDate],
[proposeNotToConfirmComment],
[sealedOrderReturnedDate];
ALTER TABLE [dbo].[CaseDecision] ADD [caseOutcomeId] UNIQUEIDENTIFIER,
[decisionMakerTypeId] NVARCHAR(1000),
[otherComment] NVARCHAR(2000);

-- CreateTable
CREATE TABLE [dbo].[CaseOutcome] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [CaseOutcome_id_df] DEFAULT newid(),
    [caseId] UNIQUEIDENTIFIER NOT NULL,
    [partiesNotifiedDate] DATETIME2,
    [orderDecisionDispatchDate] DATETIME2,
    [sealedOrderReturnedDate] DATETIME2,
    [decisionPublishedDate] DATETIME2,
    CONSTRAINT [CaseOutcome_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CaseOutcome_caseId_key] UNIQUE NONCLUSTERED ([caseId])
);

-- CreateTable
CREATE TABLE [dbo].[DecisionMakerType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [DecisionMakerType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[CaseOutcome] ADD CONSTRAINT [CaseOutcome_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[Case]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CaseDecision] ADD CONSTRAINT [CaseDecision_caseOutcomeId_fkey] FOREIGN KEY ([caseOutcomeId]) REFERENCES [dbo].[CaseOutcome]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CaseDecision] ADD CONSTRAINT [CaseDecision_decisionMakerTypeId_fkey] FOREIGN KEY ([decisionMakerTypeId]) REFERENCES [dbo].[DecisionMakerType]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
