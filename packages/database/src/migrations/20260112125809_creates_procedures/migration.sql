/*
  Warnings:

  - You are about to drop the column `procedureId` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the `CaseProcedure` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Case] DROP CONSTRAINT [Case_procedureId_fkey];

-- AlterTable
ALTER TABLE [dbo].[Case] DROP COLUMN [procedureId];
ALTER TABLE [dbo].[Case] ADD [primaryProcedureStep] NVARCHAR(50);

-- DropTable
DROP TABLE [dbo].[CaseProcedure];

-- CreateTable
CREATE TABLE [dbo].[Procedure] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Procedure_id_df] DEFAULT newid(),
    [procedureTypeId] NVARCHAR(1000),
    [procedureStatusId] NVARCHAR(1000),
    [caseOfficerVerificationDate] DATETIME2,
    [siteVisitDate] DATETIME2,
    [siteVisitTypeId] NVARCHAR(1000),
    [adminProcedureType] NVARCHAR(1000),
    [hearingTargetDate] DATETIME2,
    [earliestHearingDate] DATETIME2,
    [confirmedHearingDate] DATETIME2,
    [hearingClosedDate] DATETIME2,
    [hearingDateNotificationDate] DATETIME2,
    [hearingVenueNotificationDate] DATETIME2,
    [partiesNotifiedOfHearingDate] DATETIME2,
    [lengthOfHearingEvent] DECIMAL(32,16),
    [hearingInTarget] BIT,
    [hearingPreparationTimeDays] DECIMAL(32,16),
    [hearingTravelTimeDays] DECIMAL(32,16),
    [hearingSittingTimeDays] DECIMAL(32,16),
    [hearingReportingTimeDays] DECIMAL(32,16),
    [hearingFormatId] NVARCHAR(1000),
    [hearingVenueId] UNIQUEIDENTIFIER,
    [inquiryTargetDate] DATETIME2,
    [earliestInquiryDate] DATETIME2,
    [confirmedInquiryDate] DATETIME2,
    [inquiryFinishedDate] DATETIME2,
    [inquiryClosedDate] DATETIME2,
    [inquiryDateNotificationDate] DATETIME2,
    [inquiryVenueNotificationDate] DATETIME2,
    [partiesNotifiedOfInquiryDate] DATETIME2,
    [lengthOfInquiryEvent] DECIMAL(32,16),
    [inquiryInTarget] BIT,
    [inquiryPreparationTimeDays] DECIMAL(32,16),
    [inquiryTravelTimeDays] DECIMAL(32,16),
    [inquirySittingTimeDays] DECIMAL(32,16),
    [inquiryReportingTimeDays] DECIMAL(32,16),
    [inquiryFormatId] NVARCHAR(1000),
    [inquiryVenueId] UNIQUEIDENTIFIER,
    [conferenceDate] DATETIME2,
    [conferenceNoteSentDate] DATETIME2,
    [preInquiryMeetingDate] DATETIME2,
    [preInquiryNoteSentDate] DATETIME2,
    [conferenceFormatId] NVARCHAR(1000),
    [conferenceVenueId] UNIQUEIDENTIFIER,
    [preInquiryMeetingFormatId] NVARCHAR(1000),
    [inquiryOrConferenceId] NVARCHAR(1000),
    [proofsOfEvidenceReceivedDate] DATETIME2,
    [statementsOfCaseReceivedDate] DATETIME2,
    [inHouseDate] DATETIME2,
    [offerForWrittenRepresentationsDate] DATETIME2,
    [caseId] UNIQUEIDENTIFIER NOT NULL,
    [step] NVARCHAR(50) NOT NULL,
    CONSTRAINT [Procedure_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Procedure_caseId_step_key] UNIQUE NONCLUSTERED ([caseId],[step])
);

-- CreateTable
CREATE TABLE [dbo].[ProcedureEventFormat] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [ProcedureEventFormat_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ProcedureType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [ProcedureType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ProcedureStatus] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [ProcedureStatus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[InquiryOrConference] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [InquiryOrConference_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SiteVisitType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [SiteVisitType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AdminProcedureType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [AdminProcedureType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Procedure] ADD CONSTRAINT [Procedure_procedureTypeId_fkey] FOREIGN KEY ([procedureTypeId]) REFERENCES [dbo].[ProcedureType]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Procedure] ADD CONSTRAINT [Procedure_procedureStatusId_fkey] FOREIGN KEY ([procedureStatusId]) REFERENCES [dbo].[ProcedureStatus]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Procedure] ADD CONSTRAINT [Procedure_siteVisitTypeId_fkey] FOREIGN KEY ([siteVisitTypeId]) REFERENCES [dbo].[SiteVisitType]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Procedure] ADD CONSTRAINT [Procedure_adminProcedureType_fkey] FOREIGN KEY ([adminProcedureType]) REFERENCES [dbo].[AdminProcedureType]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Procedure] ADD CONSTRAINT [Procedure_hearingFormatId_fkey] FOREIGN KEY ([hearingFormatId]) REFERENCES [dbo].[ProcedureEventFormat]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Procedure] ADD CONSTRAINT [Procedure_hearingVenueId_fkey] FOREIGN KEY ([hearingVenueId]) REFERENCES [dbo].[Address]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Procedure] ADD CONSTRAINT [Procedure_inquiryFormatId_fkey] FOREIGN KEY ([inquiryFormatId]) REFERENCES [dbo].[ProcedureEventFormat]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Procedure] ADD CONSTRAINT [Procedure_inquiryVenueId_fkey] FOREIGN KEY ([inquiryVenueId]) REFERENCES [dbo].[Address]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Procedure] ADD CONSTRAINT [Procedure_conferenceFormatId_fkey] FOREIGN KEY ([conferenceFormatId]) REFERENCES [dbo].[ProcedureEventFormat]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Procedure] ADD CONSTRAINT [Procedure_conferenceVenueId_fkey] FOREIGN KEY ([conferenceVenueId]) REFERENCES [dbo].[Address]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Procedure] ADD CONSTRAINT [Procedure_preInquiryMeetingFormatId_fkey] FOREIGN KEY ([preInquiryMeetingFormatId]) REFERENCES [dbo].[ProcedureEventFormat]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Procedure] ADD CONSTRAINT [Procedure_inquiryOrConferenceId_fkey] FOREIGN KEY ([inquiryOrConferenceId]) REFERENCES [dbo].[InquiryOrConference]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Procedure] ADD CONSTRAINT [Procedure_caseId_fkey] FOREIGN KEY ([caseId]) REFERENCES [dbo].[Case]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
