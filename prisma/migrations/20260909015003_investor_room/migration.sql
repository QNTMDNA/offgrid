-- CreateEnum
CREATE TYPE "InvestorAccessKind" AS ENUM ('SIGN_IN', 'VIEW', 'DOWNLOAD');

-- CreateTable
CREATE TABLE "InvestorUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "passcodeHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "invitedById" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "period" TEXT,
    "storageKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorAccess" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "documentId" TEXT,
    "kind" "InvestorAccessKind" NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestorUser_email_key" ON "InvestorUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorDocument_storageKey_key" ON "InvestorDocument"("storageKey");

-- CreateIndex
CREATE INDEX "InvestorDocument_published_publishedAt_idx" ON "InvestorDocument"("published", "publishedAt");

-- CreateIndex
CREATE INDEX "InvestorAccess_investorId_createdAt_idx" ON "InvestorAccess"("investorId", "createdAt");

-- CreateIndex
CREATE INDEX "InvestorAccess_documentId_createdAt_idx" ON "InvestorAccess"("documentId", "createdAt");

-- AddForeignKey
ALTER TABLE "InvestorAccess" ADD CONSTRAINT "InvestorAccess_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "InvestorUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorAccess" ADD CONSTRAINT "InvestorAccess_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InvestorDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
