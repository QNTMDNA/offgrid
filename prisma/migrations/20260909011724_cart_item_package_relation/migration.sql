-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "showcase" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
