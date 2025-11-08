-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "balanceEcho" INTEGER NOT NULL DEFAULT 0,
    "participationScore" INTEGER NOT NULL DEFAULT 0,
    "referralCode" TEXT,
    "referrerId" TEXT,
    CONSTRAINT "User_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("balanceEcho", "createdAt", "email", "emailVerified", "id", "participationScore", "passwordHash", "updatedAt") SELECT "balanceEcho", "createdAt", "email", "emailVerified", "id", "participationScore", "passwordHash", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX "User_referrerId_idx" ON "User"("referrerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
