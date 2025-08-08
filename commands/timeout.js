const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');
const ms = require('ms'); // Ensure the `ms` package is installed

module.exports = {
  name: 'timeout',
  description: 'Applies a timeout to a user and logs the action.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to timeout',
      required: true,
    },
    {
      name: 'duration',
      type: 'STRING',
      description: 'Duration of the timeout (e.g., 1m, 1h, 1d)',
      required: true,
    },
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for the timeout',
      required: false,
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const durationMs = ms(duration);
    if (!durationMs || durationMs < 1000 || durationMs > 28 * 24 * 60 * 60 * 1000) {
      return interaction.reply({ content: 'Invalid duration. Please specify a duration between 1 second and 28 days.', ephemeral: true });
    }

    try {
      await member.timeout(durationMs, reason);
      await interaction.reply({ content: `✅ Successfully timed out ${member.user.tag} for ${duration} with reason: ${reason}` });

      // Log the action
      const guildId = interaction.guild.id;
      const action = {
        type: 'timeout',
        user: member.user.tag,
        userId: member.id,
        moderator: interaction.user.tag,
        moderatorId: interaction.user.id,
        reason: reason,
        duration: duration,
        expiresAt: new Date(Date.now() + durationMs).toISOString(),
      };
      await database.logModerationAction(guildId, action);
    } catch (error) {
      console.error('Error timing out user:', error);
      interaction.reply({ content: '❌ Failed to timeout the user. Please try again later.', ephemeral: true });
    }
  },
};
