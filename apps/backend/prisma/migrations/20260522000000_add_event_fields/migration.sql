-- AlterTable
ALTER TABLE `Event`
  MODIFY `description` TEXT NULL,
  ADD COLUMN `category`     VARCHAR(191) NULL,
  ADD COLUMN `maxAttendees` INTEGER NULL,
  ADD COLUMN `imageUrl`     VARCHAR(512) NULL;
