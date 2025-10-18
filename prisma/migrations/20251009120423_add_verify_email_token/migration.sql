-- CreateTable
CREATE TABLE "VerifyEmailToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerifyEmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VerifyEmailToken_userId_idx" ON "VerifyEmailToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerifyEmailToken_tokenHash_key" ON "VerifyEmailToken"("tokenHash");
