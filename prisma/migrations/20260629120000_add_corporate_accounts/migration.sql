-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('person', 'company');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "accountType" "AccountType" NOT NULL DEFAULT 'person';

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "registryCode" TEXT NOT NULL,
    "vatNumber" TEXT,
    "country" TEXT NOT NULL,
    "legalAddress" TEXT,
    "contactPerson" TEXT NOT NULL,
    "contactEmail" TEXT,
    "website" TEXT,
    "sponsorshipPurpose" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_country_registryCode_key" ON "CompanyProfile"("country", "registryCode");

-- CreateIndex
CREATE INDEX "CompanyProfile_country_idx" ON "CompanyProfile"("country");

-- CreateIndex
CREATE INDEX "CompanyProfile_registryCode_idx" ON "CompanyProfile"("registryCode");

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
