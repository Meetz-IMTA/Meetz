-- AlterTable
ALTER TABLE `User`
  ADD COLUMN `cooptedById` INTEGER NULL,
  ADD COLUMN `cooptedAt` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `User`
  ADD CONSTRAINT `User_cooptedById_fkey`
  FOREIGN KEY (`cooptedById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
