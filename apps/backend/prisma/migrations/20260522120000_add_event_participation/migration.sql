-- CreateTable
CREATE TABLE `EventParticipation` (
  `id`        INTEGER NOT NULL AUTO_INCREMENT,
  `userId`    INTEGER NOT NULL,
  `eventId`   INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `EventParticipation_userId_eventId_key`(`userId`, `eventId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EventParticipation` ADD CONSTRAINT `EventParticipation_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventParticipation` ADD CONSTRAINT `EventParticipation_eventId_fkey`
  FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
