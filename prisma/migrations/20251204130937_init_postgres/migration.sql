-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "balanceEcho" INTEGER NOT NULL DEFAULT 0,
    "participationScore" INTEGER NOT NULL DEFAULT 0,
    "referralCode" TEXT,
    "referrerId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NftMintEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "wallet" TEXT NOT NULL,
    "tierId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "txSignature" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidSol" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "NftMintEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Key" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hashedPassword" TEXT,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activeExpires" BIGINT NOT NULL,
    "idleExpires" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifyEmailToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifyEmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResetPasswordToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResetPasswordToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EchoLog" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EchoLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_referrerId_idx" ON "User"("referrerId");

-- CreateIndex
CREATE INDEX "Key_userId_idx" ON "Key"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "VerifyEmailToken_userId_idx" ON "VerifyEmailToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerifyEmailToken_tokenHash_key" ON "VerifyEmailToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ResetPasswordToken_userId_idx" ON "ResetPasswordToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResetPasswordToken_tokenHash_key" ON "ResetPasswordToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "EchoLog_dedupeKey_key" ON "EchoLog"("dedupeKey");

-- CreateIndex
CREATE INDEX "EchoLog_userId_kind_idx" ON "EchoLog"("userId", "kind");

-- CreateIndex
CREATE INDEX "EchoLog_action_idx" ON "EchoLog"("action");

-- CreateIndex
CREATE INDEX "EchoLog_sourceId_idx" ON "EchoLog"("sourceId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Key" ADD CONSTRAINT "Key_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifyEmailToken" ADD CONSTRAINT "VerifyEmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResetPasswordToken" ADD CONSTRAINT "ResetPasswordToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EchoLog" ADD CONSTRAINT "EchoLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
