-- CreateTable
CREATE TABLE "KycData" (
    "userId" TEXT NOT NULL,
    "pepDeclared" BOOLEAN,
    "pepDetails" TEXT,
    "consent" BOOLEAN,
    "passportNumber" TEXT,
    "passportCountry" TEXT,
    "passportIssuedAt" TIMESTAMP(3),
    "passportExpiresAt" TIMESTAMP(3),
    "passportIssuer" TEXT,
    "documentImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycData_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "KycData" ADD CONSTRAINT "KycData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
