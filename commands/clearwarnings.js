const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'clearwarnings',
  description: 'Removes all warnings for a user and logs the action.',
  options: [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to clear warnings for',
      required: true,
    },
  ],
  async execute(interaction) {
    const member = interaction.options.getMember('user');

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      const guildId = interaction.guild.id;
      const fileName = 'moderation/user_warnings.json';
      const data = await database.read(fileName);

      if (!data[guildId] || !data[guildId][member.id] || data[guildId][member.id].length === 0) {
        return interaction.reply({ content: `${member.user.tag} has no warnings to clear.`, ephemeral: true });
      }

      // Confirm action
      await interaction.reply({
        content: `Are you sure you want to clear all warnings for ${member.user.tag}? Reply with "CONFIRM" to proceed.`,
        ephemeral: true,
      });

      const filter = (response) => response.author.id === interaction.user.id && response.content === 'CONFIRM';
      const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });

      if (collected) {
        delete data[guildId][member.id];
        await database.write(fileName, data);

        await interaction.followUp({ content: `✅ Cleared all warnings for ${member.user.tag}.` });

        // Log the action
        const action = {
          type: 'clearwarnings',
          user: member.user.tag,
          userId: member.id,
          moderator: interaction.user.tag,
          moderatorId: interaction.user.id,
          timestamp: new Date().toISOString(),
        };
        await database.logModerationAction(guildId, action);
      }
    } catch (error) {
      if (error.message === 'time') {
        return interaction.followUp({ content: '❌ Confirmation timed out. Warnings were not cleared.', ephemeral: true });
      }
      console.error('Error clearing warnings:', error);
      interaction.followUp({ content: '❌ Failed to clear warnings. Please try again later.', ephemeral: true });
    }
  },
};
