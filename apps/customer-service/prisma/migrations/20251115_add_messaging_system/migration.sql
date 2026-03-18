-- Safe migration to add internal messaging system tables
-- Created: 2024-11-15
-- Purpose: Add communication channels, messages, and related tables for staff messaging
-- SAFE: Uses CREATE TABLE IF NOT EXISTS and checks before adding constraints/indexes
-- NO DATA LOSS: Only adds new tables, does not modify existing ones

-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE "ChannelType" AS ENUM ('PUBLIC', 'PRIVATE', 'DIRECT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ChannelMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationLevel" AS ENUM ('ALL', 'MENTIONS', 'NONE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Communication Channels Table
CREATE TABLE IF NOT EXISTS "communication_channels" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "type" "ChannelType" NOT NULL DEFAULT 'PUBLIC',
    "icon" TEXT,
    "color" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "allowThreads" BOOLEAN NOT NULL DEFAULT true,
    "allowReactions" BOOLEAN NOT NULL DEFAULT true,
    "allowFileUploads" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,

    CONSTRAINT "communication_channels_pkey" PRIMARY KEY ("id")
);

-- 2. Channel Members Table
CREATE TABLE IF NOT EXISTS "channel_members" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "role" "ChannelMemberRole" NOT NULL DEFAULT 'MEMBER',
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "mutedUntil" TIMESTAMP(3),
    "notificationLevel" "NotificationLevel" NOT NULL DEFAULT 'ALL',
    "lastReadAt" TIMESTAMP(3),
    "lastReadMessageId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "channel_members_pkey" PRIMARY KEY ("id")
);

-- 3. Channel Messages Table
CREATE TABLE IF NOT EXISTS "channel_messages" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "threadId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_messages_pkey" PRIMARY KEY ("id")
);

-- 4. Direct Message Conversations Table
CREATE TABLE IF NOT EXISTS "direct_message_conversations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'dev',
    "participant1Id" TEXT NOT NULL,
    "participant2Id" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_message_conversations_pkey" PRIMARY KEY ("id")
);

-- 5. Direct Messages Table
CREATE TABLE IF NOT EXISTS "direct_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- 6. Message Reactions Table
CREATE TABLE IF NOT EXISTS "message_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- 7. Message Mentions Table
CREATE TABLE IF NOT EXISTS "message_mentions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_mentions_pkey" PRIMARY KEY ("id")
);

-- 8. Message Attachments Table
CREATE TABLE IF NOT EXISTS "message_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- 9. Message Read Receipts Table
CREATE TABLE IF NOT EXISTS "message_read_receipts" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_read_receipts_pkey" PRIMARY KEY ("id")
);

-- 10. Pinned Messages Table
CREATE TABLE IF NOT EXISTS "pinned_messages" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "pinnedById" TEXT NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pinned_messages_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'channel_tenant_name_unique'
    ) THEN
        ALTER TABLE "communication_channels" ADD CONSTRAINT "channel_tenant_name_unique" 
        UNIQUE ("tenantId", "name");
        RAISE NOTICE 'Added unique constraint channel_tenant_name_unique';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'channel_member_unique'
    ) THEN
        ALTER TABLE "channel_members" ADD CONSTRAINT "channel_member_unique" 
        UNIQUE ("channelId", "staffId");
        RAISE NOTICE 'Added unique constraint channel_member_unique';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'dm_conversation_participants_unique'
    ) THEN
        ALTER TABLE "direct_message_conversations" ADD CONSTRAINT "dm_conversation_participants_unique" 
        UNIQUE ("participant1Id", "participant2Id");
        RAISE NOTICE 'Added unique constraint dm_conversation_participants_unique';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'message_reaction_unique'
    ) THEN
        ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reaction_unique" 
        UNIQUE ("messageId", "staffId", "emoji");
        RAISE NOTICE 'Added unique constraint message_reaction_unique';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'message_read_receipt_unique'
    ) THEN
        ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipt_unique" 
        UNIQUE ("messageId", "staffId");
        RAISE NOTICE 'Added unique constraint message_read_receipt_unique';
    END IF;
END $$;

-- Create indexes for performance
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_channels_tenant_archived') THEN
        CREATE INDEX "idx_channels_tenant_archived" ON "communication_channels"("tenantId", "isArchived");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_channels_tenant_type') THEN
        CREATE INDEX "idx_channels_tenant_type" ON "communication_channels"("tenantId", "type");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_channels_created') THEN
        CREATE INDEX "idx_channels_created" ON "communication_channels"("createdAt");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_channel_members_staff') THEN
        CREATE INDEX "idx_channel_members_staff" ON "channel_members"("staffId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_channel_members_active') THEN
        CREATE INDEX "idx_channel_members_active" ON "channel_members"("channelId", "leftAt");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_channel_messages_channel') THEN
        CREATE INDEX "idx_channel_messages_channel" ON "channel_messages"("channelId", "createdAt");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_channel_messages_sender') THEN
        CREATE INDEX "idx_channel_messages_sender" ON "channel_messages"("senderId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_channel_messages_thread') THEN
        CREATE INDEX "idx_channel_messages_thread" ON "channel_messages"("threadId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dm_conversations_participants') THEN
        CREATE INDEX "idx_dm_conversations_participants" ON "direct_message_conversations"("participant1Id", "participant2Id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dm_conversations_tenant') THEN
        CREATE INDEX "idx_dm_conversations_tenant" ON "direct_message_conversations"("tenantId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_direct_messages_conversation') THEN
        CREATE INDEX "idx_direct_messages_conversation" ON "direct_messages"("conversationId", "createdAt");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_direct_messages_recipient') THEN
        CREATE INDEX "idx_direct_messages_recipient" ON "direct_messages"("recipientId", "isRead");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_message_reactions_message') THEN
        CREATE INDEX "idx_message_reactions_message" ON "message_reactions"("messageId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_message_mentions_message') THEN
        CREATE INDEX "idx_message_mentions_message" ON "message_mentions"("messageId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_message_mentions_staff') THEN
        CREATE INDEX "idx_message_mentions_staff" ON "message_mentions"("staffId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_message_attachments_message') THEN
        CREATE INDEX "idx_message_attachments_message" ON "message_attachments"("messageId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_message_read_receipts_message') THEN
        CREATE INDEX "idx_message_read_receipts_message" ON "message_read_receipts"("messageId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pinned_messages_channel') THEN
        CREATE INDEX "idx_pinned_messages_channel" ON "pinned_messages"("channelId");
    END IF;
END $$;

-- Add foreign key constraints (safe - checks if exists first)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'communication_channels_createdById_fkey'
    ) THEN
        ALTER TABLE "communication_channels" ADD CONSTRAINT "communication_channels_createdById_fkey" 
        FOREIGN KEY ("createdById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'channel_members_channelId_fkey'
    ) THEN
        ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channelId_fkey" 
        FOREIGN KEY ("channelId") REFERENCES "communication_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'channel_members_staffId_fkey'
    ) THEN
        ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_staffId_fkey" 
        FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'channel_messages_channelId_fkey'
    ) THEN
        ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_channelId_fkey" 
        FOREIGN KEY ("channelId") REFERENCES "communication_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'channel_messages_senderId_fkey'
    ) THEN
        ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_senderId_fkey" 
        FOREIGN KEY ("senderId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'direct_message_conversations_participant1Id_fkey'
    ) THEN
        ALTER TABLE "direct_message_conversations" ADD CONSTRAINT "direct_message_conversations_participant1Id_fkey" 
        FOREIGN KEY ("participant1Id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'direct_message_conversations_participant2Id_fkey'
    ) THEN
        ALTER TABLE "direct_message_conversations" ADD CONSTRAINT "direct_message_conversations_participant2Id_fkey" 
        FOREIGN KEY ("participant2Id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'direct_messages_conversationId_fkey'
    ) THEN
        ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversationId_fkey" 
        FOREIGN KEY ("conversationId") REFERENCES "direct_message_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'direct_messages_senderId_fkey'
    ) THEN
        ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_senderId_fkey" 
        FOREIGN KEY ("senderId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'direct_messages_recipientId_fkey'
    ) THEN
        ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_recipientId_fkey" 
        FOREIGN KEY ("recipientId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'message_reactions_messageId_fkey'
    ) THEN
        ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_messageId_fkey" 
        FOREIGN KEY ("messageId") REFERENCES "channel_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'message_reactions_staffId_fkey'
    ) THEN
        ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_staffId_fkey" 
        FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'message_mentions_messageId_fkey'
    ) THEN
        ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_messageId_fkey" 
        FOREIGN KEY ("messageId") REFERENCES "channel_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'message_mentions_staffId_fkey'
    ) THEN
        ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_staffId_fkey" 
        FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'message_attachments_messageId_fkey'
    ) THEN
        ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_messageId_fkey" 
        FOREIGN KEY ("messageId") REFERENCES "channel_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'message_read_receipts_messageId_fkey'
    ) THEN
        ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_messageId_fkey" 
        FOREIGN KEY ("messageId") REFERENCES "channel_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'message_read_receipts_staffId_fkey'
    ) THEN
        ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_staffId_fkey" 
        FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pinned_messages_channelId_fkey'
    ) THEN
        ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_channelId_fkey" 
        FOREIGN KEY ("channelId") REFERENCES "communication_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pinned_messages_messageId_fkey'
    ) THEN
        ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_messageId_fkey" 
        FOREIGN KEY ("messageId") REFERENCES "channel_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pinned_messages_pinnedById_fkey'
    ) THEN
        ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_pinnedById_fkey" 
        FOREIGN KEY ("pinnedById") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Messaging system tables created successfully!';
    RAISE NOTICE 'Tables: communication_channels, channel_members, channel_messages, direct_message_conversations, direct_messages';
    RAISE NOTICE 'Supporting tables: message_reactions, message_mentions, message_attachments, message_read_receipts, pinned_messages';
    RAISE NOTICE 'All foreign keys and indexes created.';
    RAISE NOTICE 'SAFE: No existing data was modified or deleted.';
END $$;
