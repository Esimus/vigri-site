-- CreateEnum
CREATE TYPE "PilotClubCategory" AS ENUM ('sport', 'dance', 'music', 'art');

-- CreateEnum
CREATE TYPE "PilotClubStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "PilotClub" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "PilotClubStatus" NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "category" "PilotClubCategory",
    "city" TEXT,
    "country" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "email" TEXT,
    "quote" TEXT,
    "logoUrl" TEXT,
    "logoAlt" TEXT,
    "pilotPhotoUrl" TEXT,
    "pilotPhotoAlt" TEXT,
    "pilotPhotoCaption" TEXT,
    "pilotBadge" TEXT,
    "verifiedInPerson" BOOLEAN NOT NULL DEFAULT false,
    "nftCount" INTEGER NOT NULL DEFAULT 0,
    "vigriAllocation" INTEGER NOT NULL DEFAULT 0,
    "internalNote" TEXT,

    CONSTRAINT "PilotClub_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PilotClub_slug_key" ON "PilotClub"("slug");

-- CreateIndex
CREATE INDEX "PilotClub_status_sortOrder_idx" ON "PilotClub"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "PilotClub_category_idx" ON "PilotClub"("category");
