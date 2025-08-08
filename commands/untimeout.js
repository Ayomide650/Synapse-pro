const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'untimeout',
  description: 'Removes a timeout from a user and logs the action.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to remove timeout from',
      required: true,
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user');

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    if (!member.isCommunicationDisabled()) {
      return interaction.reply({ content: 'This user is not currently timed out.', ephemeral: true });
    }

    try {
      await member.timeout(null); // Remove timeout
      await interaction.reply({ content: `✅ Successfully removed timeout for ${member.user.tag}.` });

      // Log the action
      const guildId = interaction.guild.id;
      const action = {
        type: 'untimeout',
        user: member.user.tag,
        userId: member.id,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
        timestamp: new Date().toISOString(),
      };
      await database.logModerationAction(guildId, action);
    } catch (error) {
      console.error('Error removing timeout:', error);
      interaction.reply({ content: '❌ Failed to remove timeout. Please try again later.', ephemeral: true });
    }
  },
};
