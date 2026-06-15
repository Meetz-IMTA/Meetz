-- AlterTable: add readReceipts to User
ALTER TABLE `User` ADD COLUMN `readReceipts` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: add messageId to Report
ALTER TABLE `Report` ADD COLUMN `messageId` INTEGER NULL;

-- CreateIndex on Report.messageId
CREATE INDEX `Report_messageId_idx` ON `Report`(`messageId`);

-- CreateTable: Conversation
CREATE TABLE `Conversation` (
    `id`        INTEGER NOT NULL AUTO_INCREMENT,
    `type`      ENUM('PRIVATE', 'EVENT_GROUP') NOT NULL,
    `name`      VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `eventId`   INTEGER NULL,

    UNIQUE INDEX `Conversation_eventId_key`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: ConversationParticipant
CREATE TABLE `ConversationParticipant` (
    `conversationId` INTEGER NOT NULL,
    `userId`         INTEGER NOT NULL,
    `joinedAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastReadAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`conversationId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Message
CREATE TABLE `Message` (
    `id`             INTEGER NOT NULL AUTO_INCREMENT,
    `content`        TEXT NULL,
    `imageUrl`       VARCHAR(191) NULL,
    `gifUrl`         VARCHAR(191) NULL,
    `conversationId` INTEGER NOT NULL,
    `senderId`       INTEGER NOT NULL,
    `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: MessageReaction
CREATE TABLE `MessageReaction` (
    `id`        INTEGER NOT NULL AUTO_INCREMENT,
    `messageId` INTEGER NOT NULL,
    `userId`    INTEGER NOT NULL,
    `emoji`     VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MessageReaction_messageId_userId_emoji_key`(`messageId`, `userId`, `emoji`),
    INDEX `MessageReaction_messageId_idx`(`messageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: Conversation.eventId -> Event.id
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_eventId_fkey`
    FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: ConversationParticipant.conversationId -> Conversation.id
ALTER TABLE `ConversationParticipant` ADD CONSTRAINT `ConversationParticipant_conversationId_fkey`
    FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ConversationParticipant.userId -> User.id
ALTER TABLE `ConversationParticipant` ADD CONSTRAINT `ConversationParticipant_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Message.conversationId -> Conversation.id
ALTER TABLE `Message` ADD CONSTRAINT `Message_conversationId_fkey`
    FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Message.senderId -> User.id
ALTER TABLE `Message` ADD CONSTRAINT `Message_senderId_fkey`
    FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: MessageReaction.messageId -> Message.id
ALTER TABLE `MessageReaction` ADD CONSTRAINT `MessageReaction_messageId_fkey`
    FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: MessageReaction.userId -> User.id
ALTER TABLE `MessageReaction` ADD CONSTRAINT `MessageReaction_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Report.messageId -> Message.id
ALTER TABLE `Report` ADD CONSTRAINT `Report_messageId_fkey`
    FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
