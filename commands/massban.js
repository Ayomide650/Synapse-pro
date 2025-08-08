const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'massban',
  description: 'Bans multiple users at once and logs the action.',
  options: [
    {
      name: 'user_list',
      type: 'STRING',
      description: 'List of user IDs or mentions separated by spaces',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for the bans',
      required: false,
    },
  ],
  async execute(interaction) {
    const userList = interaction.options.getString('user_list').split(/\s+/);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const failedBans = [];
    const successfulBans = [];

    await interaction.reply({ content: '🔄 Processing mass ban...', ephemeral: true });

    for (const userId of userList) {
      try {
        const user = await interaction.guild.members.fetch(userId).catch(() => null);
        if (user) {
          await user.ban({ reason });
          successfulBans.push(user.user.tag);
        } else {
          failedBans.push(userId);
        }
      } catch (error) {
        console.error(`Error banning user ${userId}:`, error);
        failedBans.push(userId);
      }
    }

    // Log the action
    const guildId = interaction.guild.id;
    const action = {
      type: 'massban',
      users: successfulBans,
      failed: failedBans,
      moderator: interaction.user.tag,
      moderatorId: interaction.user.id,
      reason: reason,
      timestamp: new Date().toISOString(),
    };
    await database.logModerationAction(guildId, action);

    await interaction.followUp({
      content: `✅ Successfully banned: ${successfulBans.join(', ')}\n❌ Failed to ban: ${failedBans.join(', ')}`,
      ephemeral: true,
    });
  },
};
