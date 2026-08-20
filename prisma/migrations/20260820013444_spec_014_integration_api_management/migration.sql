-- SPEC-014: Integration & API Management

-- Create enums
CREATE TYPE "ProviderCategory" AS ENUM ('payment', 'email', 'sms', 'whatsapp', 'storage', 'analytics', 'other');
CREATE TYPE "HealthStatus" AS ENUM ('healthy', 'degraded', 'unhealthy', 'unknown');
CREATE TYPE "WebhookEventStatus" AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'dead_letter');

-- ExternalProvider table
CREATE TABLE "ExternalProvider" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerKey" VARCHAR(100) NOT NULL,
    "providerName" VARCHAR(200) NOT NULL,
    "category" "ProviderCategory" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "supportsWebhooks" BOOLEAN NOT NULL DEFAULT false,
    "healthEndpoint" TEXT,
    "documentationUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalProvider_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalProvider_providerKey_key" ON "ExternalProvider"("providerKey");
CREATE INDEX "ExternalProvider_providerKey_idx" ON "ExternalProvider"("providerKey");
CREATE INDEX "ExternalProvider_category_idx" ON "ExternalProvider"("category");
CREATE INDEX "ExternalProvider_isEnabled_idx" ON "ExternalProvider"("isEnabled");

-- Integration table
CREATE TABLE "Integration" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerId" UUID NOT NULL,
    "integrationName" VARCHAR(200) NOT NULL,
    "branchId" UUID,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "configuration" JSONB NOT NULL,
    "encryptedSecrets" TEXT,
    "environment" VARCHAR(20) NOT NULL DEFAULT 'production',
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'unknown',
    "lastHealthCheck" TIMESTAMP(3),
    "lastError" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Integration_providerId_idx" ON "Integration"("providerId");
CREATE INDEX "Integration_branchId_idx" ON "Integration"("branchId");
CREATE INDEX "Integration_isEnabled_idx" ON "Integration"("isEnabled");
CREATE INDEX "Integration_healthStatus_idx" ON "Integration"("healthStatus");
CREATE INDEX "Integration_environment_idx" ON "Integration"("environment");

-- APIKey table
CREATE TABLE "APIKey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "keyPrefix" VARCHAR(20) NOT NULL,
    "keyHash" VARCHAR(128) NOT NULL,
    "description" VARCHAR(500),
    "scope" JSONB NOT NULL,
    "branchId" UUID,
    "environment" VARCHAR(20) NOT NULL DEFAULT 'production',
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "APIKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "APIKey_keyPrefix_key" ON "APIKey"("keyPrefix");
CREATE UNIQUE INDEX "APIKey_keyHash_key" ON "APIKey"("keyHash");
CREATE INDEX "APIKey_keyPrefix_idx" ON "APIKey"("keyPrefix");
CREATE INDEX "APIKey_keyHash_idx" ON "APIKey"("keyHash");
CREATE INDEX "APIKey_branchId_idx" ON "APIKey"("branchId");
CREATE INDEX "APIKey_isActive_idx" ON "APIKey"("isActive");
CREATE INDEX "APIKey_expiresAt_idx" ON "APIKey"("expiresAt");

-- WebhookEndpoint table
CREATE TABLE "WebhookEndpoint" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "integrationId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "secret" VARCHAR(128) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookEndpoint_integrationId_idx" ON "WebhookEndpoint"("integrationId");
CREATE INDEX "WebhookEndpoint_isEnabled_idx" ON "WebhookEndpoint"("isEnabled");

-- IntegrationWebhookEvent table
CREATE TABLE "IntegrationWebhookEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "endpointId" UUID NOT NULL,
    "eventId" VARCHAR(200) NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "responseStatus" INTEGER,
    "responseBody" TEXT,

    CONSTRAINT "IntegrationWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationWebhookEvent_eventId_key" ON "IntegrationWebhookEvent"("eventId");
CREATE INDEX "IntegrationWebhookEvent_endpointId_idx" ON "IntegrationWebhookEvent"("endpointId");
CREATE INDEX "IntegrationWebhookEvent_eventId_idx" ON "IntegrationWebhookEvent"("eventId");
CREATE INDEX "IntegrationWebhookEvent_eventType_idx" ON "IntegrationWebhookEvent"("eventType");
CREATE INDEX "IntegrationWebhookEvent_status_idx" ON "IntegrationWebhookEvent"("status");
CREATE INDEX "IntegrationWebhookEvent_receivedAt_idx" ON "IntegrationWebhookEvent"("receivedAt");
CREATE INDEX "IntegrationWebhookEvent_processedAt_idx" ON "IntegrationWebhookEvent"("processedAt");

-- IntegrationLog table
CREATE TABLE "IntegrationLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "integrationId" UUID NOT NULL,
    "correlationId" VARCHAR(100) NOT NULL,
    "operation" VARCHAR(100) NOT NULL,
    "direction" VARCHAR(20) NOT NULL,
    "requestUrl" TEXT,
    "requestMethod" VARCHAR(20),
    "requestHeaders" JSONB,
    "requestBody" TEXT,
    "responseStatus" INTEGER,
    "responseHeaders" JSONB,
    "responseBody" TEXT,
    "duration" INTEGER,
    "errorCode" VARCHAR(100),
    "errorMessage" TEXT,
    "retryAttempt" INTEGER NOT NULL DEFAULT 0,
    "providerRequestId" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntegrationLog_integrationId_idx" ON "IntegrationLog"("integrationId");
CREATE INDEX "IntegrationLog_correlationId_idx" ON "IntegrationLog"("correlationId");
CREATE INDEX "IntegrationLog_operation_idx" ON "IntegrationLog"("operation");
CREATE INDEX "IntegrationLog_createdAt_idx" ON "IntegrationLog"("createdAt");
CREATE INDEX "IntegrationLog_responseStatus_idx" ON "IntegrationLog"("responseStatus");

-- IntegrationAudit table
CREATE TABLE "IntegrationAudit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "integrationId" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "changedBy" UUID NOT NULL,
    "changeReason" TEXT,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntegrationAudit_integrationId_idx" ON "IntegrationAudit"("integrationId");
CREATE INDEX "IntegrationAudit_changedBy_idx" ON "IntegrationAudit"("changedBy");
CREATE INDEX "IntegrationAudit_createdAt_idx" ON "IntegrationAudit"("createdAt");

-- IdempotencyKey table
CREATE TABLE "IdempotencyKey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "idempotencyKey" VARCHAR(200) NOT NULL,
    "scope" VARCHAR(100) NOT NULL,
    "requestHash" VARCHAR(128) NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "responseHeaders" JSONB,
    "responseBody" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdempotencyKey_idempotencyKey_key" ON "IdempotencyKey"("idempotencyKey");
CREATE INDEX "IdempotencyKey_idempotencyKey_idx" ON "IdempotencyKey"("idempotencyKey");
CREATE INDEX "IdempotencyKey_scope_idx" ON "IdempotencyKey"("scope");
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- Foreign key constraints
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ExternalProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "APIKey" ADD CONSTRAINT "APIKey_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "APIKey" ADD CONSTRAINT "APIKey_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IntegrationWebhookEvent" ADD CONSTRAINT "IntegrationWebhookEvent_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationLog" ADD CONSTRAINT "IntegrationLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationAudit" ADD CONSTRAINT "IntegrationAudit_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationAudit" ADD CONSTRAINT "IntegrationAudit_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
