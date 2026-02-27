-- CreateTable
CREATE TABLE "KycDataArchive" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "archivedById" TEXT,
    "reason" TEXT,
    "prevKycStatus" "KycStatus",
    "prevKycCountryZone" "CountryZone",
    "prevKycUpdatedAt" TIMESTAMP(3),
    "prevKycNote" TEXT,
    "pepDeclared" BOOLEAN,
    "pepDetails" TEXT,
    "consent" BOOLEAN,
    "passportNumber" TEXT,
    "passportCountry" TEXT,
    "passportIssuedAt" TIMESTAMP(3),
    "passportExpiresAt" TIMESTAMP(3),
    "passportIssuer" TEXT,
    "documentImage" TEXT,

    CONSTRAINT "KycDataArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KycDataArchive_userId_createdAt_idx" ON "KycDataArchive"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "KycDataArchive_archivedById_createdAt_idx" ON "KycDataArchive"("archivedById", "createdAt");

-- AddForeignKey
ALTER TABLE "KycDataArchive" ADD CONSTRAINT "KycDataArchive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDataArchive" ADD CONSTRAINT "KycDataArchive_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
