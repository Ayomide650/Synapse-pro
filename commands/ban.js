const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'ban',
  description: 'Permanently bans a user from the server and logs the action.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to ban',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for the ban',
      required: false,
    },
    {
      name: 'delete_days',
      type: 'INTEGER',
      description: 'Number of days of messages to delete (1-7)',
      required: false,
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    if (!member.bannable) {
      return interaction.reply({ content: 'I cannot ban this user. Ensure my role is higher than theirs.', ephemeral: true });
    }

    if (deleteDays < 0 || deleteDays > 7) {
      return interaction.reply({ content: 'Delete days must be between 0 and 7.', ephemeral: true });
    }

    try {
      await member.ban({ days: deleteDays, reason });
      await interaction.reply({ content: `✅ Successfully banned ${member.user.tag} for: ${reason}` });

      // Log the action to the database
      const guildId = interaction.guild.id;
      const action = {
        type: 'ban',
        user: member.user.tag,
        userId: member.id,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
        reason: reason,
        deleteDays: deleteDays,
      };
      await database.logModerationAction(guildId, action);
    } catch (error) {
      console.error('Error banning user:', error);
      interaction.reply({ content: '❌ Failed to ban the user. Please try again later.', ephemeral: true });
    }
  },
};
