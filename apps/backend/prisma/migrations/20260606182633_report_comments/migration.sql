-- AlterTable
ALTER TABLE `Report` ADD COLUMN `commentId` INTEGER NULL,
    MODIFY `threadId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Report_commentId_idx` ON `Report`(`commentId`);

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
