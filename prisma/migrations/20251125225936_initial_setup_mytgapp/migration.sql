-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'PUBLISHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'MONTHLY', 'REVENUE_SHARE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE', 'EARNED', 'SPENT', 'WITHDRAWAL', 'ADMIN_GRANT', 'COMMISSION');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "telegramId" TEXT,
    "telegramUsername" TEXT,
    "telegramVerifiedAt" TIMESTAMP(3),
    "credits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publisher" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscriptionExpiresAt" TIMESTAMP(3),
    "revenueSharePercent" DOUBLE PRECISION,
    "totalEarnings" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "freeCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "telegramVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramGroup" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "description" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationCode" TEXT,
    "verifiedByBot" BOOLEAN NOT NULL DEFAULT false,
    "pricePerPost" INTEGER NOT NULL DEFAULT 1,
    "freePostIntervalDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "postingWindows" JSONB,
    "totalPostsScheduled" INTEGER NOT NULL DEFAULT 0,
    "totalPostsSent" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramPost" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "advertiserId" TEXT,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "postedAt" TIMESTAMP(3),
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "failureReason" TEXT,
    "isPaidAd" BOOLEAN NOT NULL DEFAULT false,
    "creditsPaid" INTEGER,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "relatedPostId" TEXT,
    "relatedGroupId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "monthlyFee" INTEGER,
    "revenueSharePercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublisherManagedUser" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditsAdded" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherManagedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publisherId" TEXT,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_telegramId_idx" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "User_telegramUsername_idx" ON "User"("telegramUsername");

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_userId_key" ON "Publisher"("userId");

-- CreateIndex
CREATE INDEX "Publisher_userId_idx" ON "Publisher"("userId");

-- CreateIndex
CREATE INDEX "Publisher_isVerified_idx" ON "Publisher"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramGroup_telegramChatId_key" ON "TelegramGroup"("telegramChatId");

-- CreateIndex
CREATE INDEX "TelegramGroup_publisherId_idx" ON "TelegramGroup"("publisherId");

-- CreateIndex
CREATE INDEX "TelegramGroup_telegramChatId_idx" ON "TelegramGroup"("telegramChatId");

-- CreateIndex
CREATE INDEX "TelegramGroup_isVerified_idx" ON "TelegramGroup"("isVerified");

-- CreateIndex
CREATE INDEX "TelegramPost_groupId_idx" ON "TelegramPost"("groupId");

-- CreateIndex
CREATE INDEX "TelegramPost_publisherId_idx" ON "TelegramPost"("publisherId");

-- CreateIndex
CREATE INDEX "TelegramPost_advertiserId_idx" ON "TelegramPost"("advertiserId");

-- CreateIndex
CREATE INDEX "TelegramPost_scheduledAt_idx" ON "TelegramPost"("scheduledAt");

-- CreateIndex
CREATE INDEX "TelegramPost_status_idx" ON "TelegramPost"("status");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");

-- CreateIndex
CREATE INDEX "CreditTransaction_type_idx" ON "CreditTransaction"("type");

-- CreateIndex
CREATE INDEX "CreditTransaction_createdAt_idx" ON "CreditTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_publisherId_idx" ON "Subscription"("publisherId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_publisherId_tier_key" ON "Subscription"("publisherId", "tier");

-- CreateIndex
CREATE INDEX "PublisherManagedUser_publisherId_idx" ON "PublisherManagedUser"("publisherId");

-- CreateIndex
CREATE INDEX "PublisherManagedUser_userId_idx" ON "PublisherManagedUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PublisherManagedUser_publisherId_userId_key" ON "PublisherManagedUser"("publisherId", "userId");

-- CreateIndex
CREATE INDEX "CreditRequest_userId_idx" ON "CreditRequest"("userId");

-- CreateIndex
CREATE INDEX "CreditRequest_publisherId_idx" ON "CreditRequest"("publisherId");

-- CreateIndex
CREATE INDEX "CreditRequest_status_idx" ON "CreditRequest"("status");

-- CreateIndex
CREATE INDEX "CreditRequest_createdAt_idx" ON "CreditRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publisher" ADD CONSTRAINT "Publisher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramGroup" ADD CONSTRAINT "TelegramGroup_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramPost" ADD CONSTRAINT "TelegramPost_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TelegramGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramPost" ADD CONSTRAINT "TelegramPost_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramPost" ADD CONSTRAINT "TelegramPost_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherManagedUser" ADD CONSTRAINT "PublisherManagedUser_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherManagedUser" ADD CONSTRAINT "PublisherManagedUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditRequest" ADD CONSTRAINT "CreditRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditRequest" ADD CONSTRAINT "CreditRequest_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
