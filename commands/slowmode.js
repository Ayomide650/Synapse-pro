const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'slowmode',
  description: 'Sets the slowmode for the current channel and logs the action.',
  options: [
    {
      name: 'seconds',
      type: 'INTEGER',
      description: 'Slowmode duration in seconds (0-21600)',
      required: true,
    },
  ],
  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    if (seconds < 0 || seconds > 21600) {
      return interaction.reply({ content: 'Slowmode duration must be between 0 and 21600 seconds.', ephemeral: true });
    }

    try {
      await interaction.channel.setRateLimitPerUser(seconds);
      await interaction.reply({ content: `✅ Slowmode set to ${seconds} seconds.` });

      // Log the action
      const guildId = interaction.guild.id;
      const action = {
        type: 'slowmode',
        channel: interaction.channel.name,
        duration: seconds,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
        timestamp: new Date().toISOString(),
      };
      await database.logModerationAction(guildId, action);
    } catch (error) {
      console.error('Error setting slowmode:', error);
      interaction.reply({ content: '❌ Failed to set slowmode. Please try again later.', ephemeral: true });
    }
  },
};
