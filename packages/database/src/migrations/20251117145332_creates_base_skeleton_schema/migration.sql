BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Case] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Case_id_df] DEFAULT newid(),
    [createdDate] DATETIME2 NOT NULL CONSTRAINT [Case_createdDate_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedDate] DATETIME2,
    [receivedDate] DATETIME2 NOT NULL,
    [typeId] NVARCHAR(1000) NOT NULL,
    [subTypeId] NVARCHAR(1000) NOT NULL,
    [reference] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [applicant] NVARCHAR(1000),
    [siteAddressId] UNIQUEIDENTIFIER,
    [authority] NVARCHAR(1000),
    [area] NVARCHAR(1000),
    [caseOfficerId] NVARCHAR(1000) NOT NULL,
    [procedureId] NVARCHAR(1000),
    [linkedCases] NVARCHAR(1000),
    CONSTRAINT [Case_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Case_reference_key] UNIQUE NONCLUSTERED ([reference])
);

-- CreateTable
CREATE TABLE [dbo].[CaseworkArea] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [CaseworkArea_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CaseType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    [caseworkAreaId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [CaseType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CaseSubType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    [parentTypeId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [CaseSubType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CaseProcedure] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [CaseProcedure_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Address] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Address_id_df] DEFAULT newid(),
    [line1] NVARCHAR(1000),
    [line2] NVARCHAR(1000),
    [townCity] NVARCHAR(1000),
    [county] NVARCHAR(1000),
    [postcode] NVARCHAR(1000),
    CONSTRAINT [Address_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_typeId_fkey] FOREIGN KEY ([typeId]) REFERENCES [dbo].[CaseType]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_subTypeId_fkey] FOREIGN KEY ([subTypeId]) REFERENCES [dbo].[CaseSubType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_siteAddressId_fkey] FOREIGN KEY ([siteAddressId]) REFERENCES [dbo].[Address]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Case] ADD CONSTRAINT [Case_procedureId_fkey] FOREIGN KEY ([procedureId]) REFERENCES [dbo].[CaseProcedure]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CaseType] ADD CONSTRAINT [CaseType_caseworkAreaId_fkey] FOREIGN KEY ([caseworkAreaId]) REFERENCES [dbo].[CaseworkArea]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CaseSubType] ADD CONSTRAINT [CaseSubType_parentTypeId_fkey] FOREIGN KEY ([parentTypeId]) REFERENCES [dbo].[CaseType]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
