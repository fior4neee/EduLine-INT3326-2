-- CreateEnum
CREATE TYPE "submission_type" AS ENUM ('TextEntry', 'FileUpload');

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "allow_late_submissions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "attachment_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "submission_types" "submission_type"[] DEFAULT ARRAY['TextEntry', 'FileUpload']::"submission_type"[],
ADD COLUMN     "unlock_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "text_body" TEXT,
ALTER COLUMN "file_key" DROP NOT NULL,
ALTER COLUMN "file_name" DROP NOT NULL,
ALTER COLUMN "size_bytes" DROP NOT NULL,
ALTER COLUMN "mime_type" DROP NOT NULL;

-- CreateTable
CREATE TABLE "submission_comments" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_comments_submission_id_created_at_idx" ON "submission_comments"("submission_id", "created_at");

-- AddForeignKey
ALTER TABLE "submission_comments" ADD CONSTRAINT "submission_comments_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_comments" ADD CONSTRAINT "submission_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written: a submission is either a text entry or a file, never both or neither.
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_text_or_file"
  CHECK (("text_body" IS NOT NULL) <> ("file_key" IS NOT NULL));
