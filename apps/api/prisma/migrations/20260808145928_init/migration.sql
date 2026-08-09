-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SALES',
    "avatar" TEXT,
    "initials" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "projectDescription" TEXT,
    "location" TEXT NOT NULL,
    "budgetLakhs" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "phone" TEXT,
    "email" TEXT,
    "ownerId" TEXT NOT NULL,
    "winProbability" REAL NOT NULL DEFAULT 0,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "stageChangedAt" DATETIME,
    "wonAt" DATETIME,
    "lostReason" TEXT,
    "lostNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "leads_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT,
    "quote" REAL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "activities_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "durationMins" INTEGER NOT NULL DEFAULT 60,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "meetings_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "meetings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "file_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "file_assets_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "file_assets_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "amountLakhs" REAL NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Sent',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "proposals_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "proposals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "activities_leadId_idx" ON "activities"("leadId");

-- CreateIndex
CREATE INDEX "notes_leadId_idx" ON "notes"("leadId");

-- CreateIndex
CREATE INDEX "meetings_leadId_idx" ON "meetings"("leadId");

-- CreateIndex
CREATE INDEX "file_assets_leadId_idx" ON "file_assets"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_leadId_key" ON "proposals"("leadId");
