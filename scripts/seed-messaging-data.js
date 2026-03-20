const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMessagingData() {
  console.log('💬 Seeding messaging test data...\n');

  const tenantId = '06d09e08-fe1f-4feb-89f8-c3b619026ba9'; // Rainy Day's Inn

  try {
    // Get staff members
    const staff = await prisma.staff.findMany({
      where: { tenantId },
      take: 3,
    });

    if (staff.length === 0) {
      console.log('❌ No staff members found.');
      return;
    }

    console.log(`✅ Found ${staff.length} staff members\n`);

    // Create channels
    console.log('📢 Creating communication channels...');

    // General channel (default, everyone auto-joins)
    const generalChannel = await prisma.communicationChannel.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: 'general',
        },
      },
      update: {},
      create: {
        tenantId,
        name: 'general',
        displayName: 'General',
        description: 'General team discussions',
        type: 'PUBLIC',
        icon: '💬',
        color: '#4A90E2',
        isDefault: true,
        createdById: staff[0].id,
      },
    });

    // Announcements channel
    const announcementsChannel = await prisma.communicationChannel.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: 'announcements',
        },
      },
      update: {},
      create: {
        tenantId,
        name: 'announcements',
        displayName: 'Announcements',
        description: 'Important facility announcements',
        type: 'PUBLIC',
        icon: '📢',
        color: '#F5A623',
        isDefault: true,
        createdById: staff[0].id,
      },
    });

    // Shift Handoff channel
    const shiftHandoffChannel = await prisma.communicationChannel.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: 'shift-handoff',
        },
      },
      update: {},
      create: {
        tenantId,
        name: 'shift-handoff',
        displayName: 'Shift Handoff',
        description: 'Share important info between shifts',
        type: 'PUBLIC',
        icon: '🔄',
        color: '#7ED321',
        isDefault: false,
        createdById: staff[0].id,
      },
    });

    console.log('✅ Created 3 channels\n');

    // Add all staff as members to all channels
    console.log('👥 Adding channel members...');

    for (const channel of [
      generalChannel,
      announcementsChannel,
      shiftHandoffChannel,
    ]) {
      for (const staffMember of staff) {
        await prisma.channelMember.upsert({
          where: {
            channelId_staffId: {
              channelId: channel.id,
              staffId: staffMember.id,
            },
          },
          update: {},
          create: {
            channelId: channel.id,
            staffId: staffMember.id,
            role: staffMember.id === staff[0].id ? 'ADMIN' : 'MEMBER',
          },
        });
      }
    }

    console.log(`✅ Added ${staff.length} members to each channel\n`);

    // Create sample messages
    console.log('💬 Creating sample messages...');

    // General channel messages
    await prisma.channelMessage.create({
      data: {
        channelId: generalChannel.id,
        senderId: staff[0].id,
        content: 'Good morning team! Hope everyone has a great day today! 🌞',
      },
    });

    await prisma.channelMessage.create({
      data: {
        channelId: generalChannel.id,
        senderId: staff[1]?.id || staff[0].id,
        content: 'Morning! Ready for another busy day!',
      },
    });

    await prisma.channelMessage.create({
      data: {
        channelId: generalChannel.id,
        senderId: staff[0].id,
        content: "Don't forget we have a team meeting at 2pm today",
      },
    });

    // Announcements channel messages
    await prisma.channelMessage.create({
      data: {
        channelId: announcementsChannel.id,
        senderId: staff[0].id,
        content:
          '📢 Reminder: New cleaning protocols start Monday. Please review the updated checklist.',
      },
    });

    await prisma.channelMessage.create({
      data: {
        channelId: announcementsChannel.id,
        senderId: staff[0].id,
        content:
          '🎉 Great news! We received excellent reviews this week. Keep up the amazing work!',
      },
    });

    // Shift Handoff messages
    await prisma.channelMessage.create({
      data: {
        channelId: shiftHandoffChannel.id,
        senderId: staff[0].id,
        content:
          'Morning shift update: All pets fed and walked. Max in Suite 3 needs extra attention today - seems a bit anxious.',
      },
    });

    await prisma.channelMessage.create({
      data: {
        channelId: shiftHandoffChannel.id,
        senderId: staff[1]?.id || staff[0].id,
        content:
          "Thanks for the heads up! I'll keep an eye on Max. Also, we're running low on treats - added to shopping list.",
      },
    });

    await prisma.channelMessage.create({
      data: {
        channelId: shiftHandoffChannel.id,
        senderId: staff[0].id,
        content:
          "Perfect! Also, Luna's owner will pick her up around 4pm today.",
      },
    });

    console.log('✅ Created 8 sample messages\n');

    // Mark some messages as read for the first staff member
    const firstStaffMember = staff[0];
    const generalLastMessage = await prisma.channelMessage.findFirst({
      where: { channelId: generalChannel.id },
      orderBy: { createdAt: 'desc' },
    });

    if (generalLastMessage) {
      await prisma.channelMember.updateMany({
        where: {
          channelId: generalChannel.id,
          staffId: firstStaffMember.id,
        },
        data: {
          lastReadAt: new Date(generalLastMessage.createdAt.getTime() - 60000), // 1 minute before last message
          lastReadMessageId: generalLastMessage.id,
        },
      });
    }

    console.log('🎉 Messaging data seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Channels: 3 (General, Announcements, Shift Handoff)`);
    console.log(`   Members: ${staff.length} staff in each channel`);
    console.log(`   Messages: 8 total`);
    console.log(`   - General: 3 messages`);
    console.log(`   - Announcements: 2 messages`);
    console.log(`   - Shift Handoff: 3 messages`);
    console.log(`\n✅ Login to test messaging at /mobile/chat`);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedMessagingData().catch((error) => {
  console.error(error);
  process.exit(1);
});
