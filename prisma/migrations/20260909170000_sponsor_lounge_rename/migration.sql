-- Rename the investor room to the sponsor lounge.
ALTER TYPE "InvestorAccessKind" RENAME TO "LoungeAccessKind";

ALTER TABLE "InvestorUser" RENAME TO "LoungeMember";
ALTER TABLE "InvestorDocument" RENAME TO "LoungeDocument";
ALTER TABLE "InvestorAccess" RENAME TO "LoungeAccess";

ALTER TABLE "LoungeAccess" RENAME COLUMN "investorId" TO "memberId";

ALTER INDEX "InvestorUser_pkey" RENAME TO "LoungeMember_pkey";
ALTER INDEX "InvestorDocument_pkey" RENAME TO "LoungeDocument_pkey";
ALTER INDEX "InvestorAccess_pkey" RENAME TO "LoungeAccess_pkey";
ALTER INDEX "InvestorUser_email_key" RENAME TO "LoungeMember_email_key";
ALTER INDEX "InvestorDocument_storageKey_key" RENAME TO "LoungeDocument_storageKey_key";
ALTER INDEX "InvestorDocument_published_publishedAt_idx" RENAME TO "LoungeDocument_published_publishedAt_idx";
ALTER INDEX "InvestorAccess_investorId_createdAt_idx" RENAME TO "LoungeAccess_memberId_createdAt_idx";
ALTER INDEX "InvestorAccess_documentId_createdAt_idx" RENAME TO "LoungeAccess_documentId_createdAt_idx";

ALTER TABLE "LoungeAccess" RENAME CONSTRAINT "InvestorAccess_investorId_fkey" TO "LoungeAccess_memberId_fkey";
ALTER TABLE "LoungeAccess" RENAME CONSTRAINT "InvestorAccess_documentId_fkey" TO "LoungeAccess_documentId_fkey";
