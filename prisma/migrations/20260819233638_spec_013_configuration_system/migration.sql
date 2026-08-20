-- SPEC-013: System Administration & Configuration
-- This migration adds the complete configuration system including:
-- 1. System, Company, and Branch level configuration
-- 2. Feature flags with rollout control
-- 3. Document numbering sequences
-- 4. Working hours and holidays
-- 5. Configuration audit trail

-- Create enums
CREATE TYPE "ConfigDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'ENUM');
CREATE TYPE "ConfigScope" AS ENUM ('SYSTEM', 'COMPANY', 'BRANCH');
CREATE TYPE "FeatureFlagScope" AS ENUM ('GLOBAL', 'COMPANY', 'BRANCH', 'USER');
CREATE TYPE "NumberingResetPolicy" AS ENUM ('NEVER', 'YEARLY', 'MONTHLY');
CREATE TYPE "HolidayScope" AS ENUM ('COMPANY', 'BRANCH');

-- SystemConfiguration table
CREATE TABLE "SystemConfiguration" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" JSONB NOT NULL,
    "dataType" "ConfigDataType" NOT NULL DEFAULT 'STRING',
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "SystemConfiguration_pkey" PRIMARY KEY ("id")
);

-- CompanyConfiguration table
CREATE TABLE "CompanyConfiguration" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" JSONB NOT NULL,
    "dataType" "ConfigDataType" NOT NULL DEFAULT 'STRING',
    "category" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "CompanyConfiguration_pkey" PRIMARY KEY ("id")
);

-- BranchConfiguration table
CREATE TABLE "BranchConfiguration" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" JSONB NOT NULL,
    "dataType" "ConfigDataType" NOT NULL DEFAULT 'STRING',
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "BranchConfiguration_pkey" PRIMARY KEY ("id")
);

-- FeatureFlag table
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "flagKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" "FeatureFlagScope" NOT NULL DEFAULT 'GLOBAL',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 0,
    "targetBranches" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- ConfigurationAudit table
CREATE TABLE "ConfigurationAudit" (
    "id" TEXT NOT NULL,
    "configType" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "changeReason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "ConfigurationAudit_pkey" PRIMARY KEY ("id")
);

-- DocumentNumbering table
CREATE TABLE "DocumentNumbering" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "branchId" TEXT,
    "prefix" TEXT NOT NULL DEFAULT '',
    "suffix" TEXT NOT NULL DEFAULT '',
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "currentNumber" INTEGER NOT NULL DEFAULT 0,
    "padding" INTEGER NOT NULL DEFAULT 6,
    "resetPolicy" "NumberingResetPolicy" NOT NULL DEFAULT 'NEVER',
    "lastResetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentNumbering_pkey" PRIMARY KEY ("id")
);

-- WorkingHours table
CREATE TABLE "WorkingHours" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "openTime" TIMESTAMP(3),
    "closeTime" TIMESTAMP(3),
    "breakStart" TIMESTAMP(3),
    "breakEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkingHours_pkey" PRIMARY KEY ("id")
);

-- Holiday table
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "scope" "HolidayScope" NOT NULL DEFAULT 'COMPANY',
    "branchId" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "SystemConfiguration_configKey_key" ON "SystemConfiguration"("configKey");
CREATE UNIQUE INDEX "FeatureFlag_flagKey_key" ON "FeatureFlag"("flagKey");
CREATE UNIQUE INDEX "DocumentNumbering_documentType_branchId_key" ON "DocumentNumbering"("documentType", "branchId");
CREATE UNIQUE INDEX "WorkingHours_branchId_dayOfWeek_key" ON "WorkingHours"("branchId", "dayOfWeek");

-- Create search indexes
CREATE INDEX "SystemConfiguration_category_idx" ON "SystemConfiguration"("category");
CREATE INDEX "SystemConfiguration_isActive_idx" ON "SystemConfiguration"("isActive");
CREATE INDEX "CompanyConfiguration_configKey_idx" ON "CompanyConfiguration"("configKey");
CREATE INDEX "CompanyConfiguration_isActive_effectiveFrom_effectiveTo_idx" ON "CompanyConfiguration"("isActive", "effectiveFrom", "effectiveTo");
CREATE INDEX "BranchConfiguration_branchId_idx" ON "BranchConfiguration"("branchId");
CREATE INDEX "BranchConfiguration_configKey_idx" ON "BranchConfiguration"("configKey");
CREATE INDEX "BranchConfiguration_branchId_isActive_idx" ON "BranchConfiguration"("branchId", "isActive");
CREATE INDEX "FeatureFlag_scope_idx" ON "FeatureFlag"("scope");
CREATE INDEX "FeatureFlag_isEnabled_idx" ON "FeatureFlag"("isEnabled");
CREATE INDEX "ConfigurationAudit_configType_idx" ON "ConfigurationAudit"("configType");
CREATE INDEX "ConfigurationAudit_configKey_idx" ON "ConfigurationAudit"("configKey");
CREATE INDEX "ConfigurationAudit_changedAt_idx" ON "ConfigurationAudit"("changedAt");
CREATE INDEX "ConfigurationAudit_changedBy_idx" ON "ConfigurationAudit"("changedBy");
CREATE INDEX "DocumentNumbering_documentType_idx" ON "DocumentNumbering"("documentType");
CREATE INDEX "DocumentNumbering_branchId_idx" ON "DocumentNumbering"("branchId");
CREATE INDEX "WorkingHours_branchId_idx" ON "WorkingHours"("branchId");
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");
CREATE INDEX "Holiday_branchId_idx" ON "Holiday"("branchId");

-- Add foreign key constraints
ALTER TABLE "SystemConfiguration" ADD CONSTRAINT "SystemConfiguration_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompanyConfiguration" ADD CONSTRAINT "CompanyConfiguration_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BranchConfiguration" ADD CONSTRAINT "BranchConfiguration_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BranchConfiguration" ADD CONSTRAINT "BranchConfiguration_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfigurationAudit" ADD CONSTRAINT "ConfigurationAudit_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentNumbering" ADD CONSTRAINT "DocumentNumbering_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
