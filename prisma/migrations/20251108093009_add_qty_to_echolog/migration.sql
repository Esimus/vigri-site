-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EchoLog" (
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
    "qty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EchoLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EchoLog" ("action", "amountUe", "bucket", "createdAt", "dedupeKey", "id", "kind", "meta", "refUserId", "sourceId", "userId") SELECT "action", "amountUe", "bucket", "createdAt", "dedupeKey", "id", "kind", "meta", "refUserId", "sourceId", "userId" FROM "EchoLog";
DROP TABLE "EchoLog";
ALTER TABLE "new_EchoLog" RENAME TO "EchoLog";
CREATE UNIQUE INDEX "EchoLog_dedupeKey_key" ON "EchoLog"("dedupeKey");
CREATE INDEX "EchoLog_userId_kind_idx" ON "EchoLog"("userId", "kind");
CREATE INDEX "EchoLog_action_idx" ON "EchoLog"("action");
CREATE INDEX "EchoLog_sourceId_idx" ON "EchoLog"("sourceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
