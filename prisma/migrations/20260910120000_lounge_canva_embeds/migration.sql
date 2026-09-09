-- Decks can now be an embedded Canva design instead of an uploaded file.
ALTER TABLE "LoungeDocument" ADD COLUMN "embedUrl" TEXT;

ALTER TABLE "LoungeDocument"
  ALTER COLUMN "storageKey" DROP NOT NULL,
  ALTER COLUMN "filename" DROP NOT NULL,
  ALTER COLUMN "contentType" DROP NOT NULL,
  ALTER COLUMN "contentType" DROP DEFAULT,
  ALTER COLUMN "sizeBytes" DROP NOT NULL;
