-- CreateTable
CREATE TABLE "EchoLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amountUe" INTEGER NOT NULL,
    "bucket" TEXT,
    "sourceId" TEXT,
    "refUserId" TEXT,
    "meta" JSONB,
    "dedupeKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EchoLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "participationScore" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id", "updatedAt") SELECT "createdAt", "email", "emailVerified", "id", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EchoLog_dedupeKey_key" ON "EchoLog"("dedupeKey");

-- CreateIndex
CREATE INDEX "EchoLog_userId_kind_idx" ON "EchoLog"("userId", "kind");

-- CreateIndex
CREATE INDEX "EchoLog_action_idx" ON "EchoLog"("action");

-- CreateIndex
CREATE INDEX "EchoLog_sourceId_idx" ON "EchoLog"("sourceId");
