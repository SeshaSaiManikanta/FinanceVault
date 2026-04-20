-- AddColumn passwordResetToken, passwordResetExpiresAt, pinResetToken, pinResetExpiresAt to User
ALTER TABLE "User" ADD COLUMN "passwordResetToken" TEXT,
ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN "pinResetToken" TEXT,
ADD COLUMN "pinResetExpiresAt" TIMESTAMP(3);
