const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'resetlevels',
  description: 'Resets ALL XP and levels in the server. This action cannot be undone.',
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    await interaction.reply({
      content: '⚠️ **WARNING**: This will reset ALL user XP and levels in the server.\n' +
              'This action cannot be undone!\n\n' +
              'Type `CONFIRM` within 30 seconds to proceed.',
      ephemeral: true
    });

    try {
      const filter = m => m.author.id === interaction.user.id && m.content === 'CONFIRM';
      const collected = await interaction.channel.awaitMessages({
        filter,
        max: 1,
        time: 30000,
        errors: ['time']
      });

      if (collected) {
        const guildId = interaction.guild.id;
        const fileName = 'leveling/user_levels.json';
        const data = await database.read(fileName);

        // Create backup before reset
        await database.createBackupIfExists(fileName);

        // Reset all levels
        data[guildId] = {};
        await database.write(fileName, data);

        // Log the action
        const action = {
          type: 'resetlevels',
          moderator: interaction.user.tag,
          moderatorId: interaction.user.id,
          timestamp: new Date().toISOString(),
        };
        await database.logModerationAction(guildId, action);

        await interaction.followUp({
          content: '✅ Successfully reset all XP and levels in the server.',
          ephemeral: true
        });
      }
    } catch (error) {
      if (error.message === 'time') {
        return interaction.followUp({
          content: '❌ Reset cancelled - confirmation timed out.',
          ephemeral: true
        });
      }
      console.error('Error resetting levels:', error);
      interaction.followUp({
        content: '❌ Failed to reset levels. Please try again later.',
        ephemeral: true
      });
    }
  },
};
