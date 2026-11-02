-- Course card fields: category label and public cover image.
ALTER TABLE "courses" ADD COLUMN "category" TEXT,
ADD COLUMN "thumbnail_url" TEXT;
