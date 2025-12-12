-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('none', 'pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "CountryZone" AS ENUM ('green', 'grey', 'red');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "kycCountryZone" "CountryZone",
ADD COLUMN     "kycNote" TEXT,
ADD COLUMN     "kycStatus" "KycStatus" NOT NULL DEFAULT 'none',
ADD COLUMN     "kycUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserProfile" (
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "phone" TEXT,
    "countryResidence" TEXT,
    "countryTax" TEXT,
    "addressStreet" TEXT,
    "addressRegion" TEXT,
    "addressCity" TEXT,
    "addressPostal" TEXT,
    "language" TEXT,
    "photo" TEXT,
    "isikukood" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
