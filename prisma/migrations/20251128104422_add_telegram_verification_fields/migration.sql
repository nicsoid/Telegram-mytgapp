-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramVerificationCode" TEXT,
ADD COLUMN     "telegramVerificationExpires" TIMESTAMP(3),
ADD COLUMN     "telegramVerificationTelegramId" TEXT,
ADD COLUMN     "telegramVerificationTelegramUsername" TEXT;
