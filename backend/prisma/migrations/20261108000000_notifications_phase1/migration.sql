-- CreateEnum
CREATE TYPE "notification_permission" AS ENUM ('Default', 'Granted', 'Denied');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notification_type" ADD VALUE 'AssignmentPublished';
ALTER TYPE "notification_type" ADD VALUE 'AssignmentDueSoon';
ALTER TYPE "notification_type" ADD VALUE 'SubmissionComment';
ALTER TYPE "notification_type" ADD VALUE 'CourseCompleted';
ALTER TYPE "notification_type" ADD VALUE 'CourseWelcome';

-- DropIndex
DROP INDEX "notifications_source_event_id_key";

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "welcome_message" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "group_key" TEXT,
ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "outbox_events" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_error" TEXT;

-- CreateTable
CREATE TABLE "notification_subscriptions" (
    "user_id" UUID NOT NULL,
    "course_id" INTEGER NOT NULL,
    "status" "notification_permission" NOT NULL DEFAULT 'Default',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_subscriptions_pkey" PRIMARY KEY ("user_id","course_id")
);

-- CreateIndex
CREATE INDEX "notification_subscriptions_course_id_status_idx" ON "notification_subscriptions"("course_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_source_event_id_recipient_id_key" ON "notifications"("source_event_id", "recipient_id");

-- AddForeignKey
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

