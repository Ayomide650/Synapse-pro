const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'kick',
  description: 'Removes a member from the server and logs the action.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to kick',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for the kick',
      required: false,
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    if (!member.kickable) {
      return interaction.reply({ content: 'I cannot kick this user. Ensure my role is higher than theirs.', ephemeral: true });
    }

    try {
      await member.kick(reason);
      await interaction.reply({ content: `✅ Successfully kicked ${member.user.tag} for: ${reason}` });

      // Log the action to the database
      const guildId = interaction.guild.id;
      const action = {
        type: 'kick',
        user: member.user.tag,
        userId: member.id,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
        reason: reason,
      };
      await database.logModerationAction(guildId, action);
    } catch (error) {
      console.error('Error kicking user:', error);
      interaction.reply({ content: '❌ Failed to kick the user. Please try again later.', ephemeral: true });
    }
  },
};
