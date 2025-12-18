-- AlterTable
ALTER TABLE "NftMintEvent" ADD COLUMN     "buyerFirstName" TEXT,
ADD COLUMN     "buyerLastName" TEXT,
ADD COLUMN     "collectorId" TEXT,
ADD COLUMN     "designChoice" INTEGER,
ADD COLUMN     "designKey" INTEGER,
ADD COLUMN     "serial" INTEGER,
ADD COLUMN     "tierCode" TEXT,
ADD COLUMN     "withPhysical" BOOLEAN;
