-- CreateEnum
CREATE TYPE "FormSubmissionKind" AS ENUM ('club_pilot', 'ambassador', 'faq_question', 'other');

-- CreateEnum
CREATE TYPE "FormSubmissionStatus" AS ENUM ('new', 'in_review', 'done', 'spam', 'archived');

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "kind" "FormSubmissionKind" NOT NULL,
    "status" "FormSubmissionStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "telegram" TEXT,
    "preferredLang" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "subject" TEXT,
    "message" TEXT,
    "payload" JSONB,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "privacyVersion" TEXT,
    "sourcePath" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "dedupeKey" TEXT,
    "internalNote" TEXT,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormSubmission_dedupeKey_key" ON "FormSubmission"("dedupeKey");

-- CreateIndex
CREATE INDEX "FormSubmission_kind_status_idx" ON "FormSubmission"("kind", "status");

-- CreateIndex
CREATE INDEX "FormSubmission_createdAt_idx" ON "FormSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "FormSubmission_email_idx" ON "FormSubmission"("email");

-- CreateIndex
CREATE INDEX "FormSubmission_country_city_idx" ON "FormSubmission"("country", "city");

-- CreateIndex
CREATE INDEX "FormSubmission_userId_idx" ON "FormSubmission"("userId");

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
