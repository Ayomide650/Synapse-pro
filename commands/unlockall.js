const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'unlockall',
  description: 'Unlocks all previously locked text channels in the server.',
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      const guildId = interaction.guild.id;
      const fileName = 'moderation/server_configs.json';
      const data = await database.read(fileName);

      if (!data[guildId]?.lockedChannels || Object.keys(data[guildId].lockedChannels).length === 0) {
        return interaction.reply({ content: 'No channels are currently locked.', ephemeral: true });
      }

      await interaction.reply({ content: '🔓 Unlocking all text channels...', ephemeral: true });

      for (const [channelId, permissions] of Object.entries(data[guildId].lockedChannels)) {
        const channel = interaction.guild.channels.cache.get(channelId);
        if (channel) {
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, permissions);
          await channel.send(`🔓 This channel has been unlocked.`);
        }
      }

      delete data[guildId].lockedChannels;
      await database.write(fileName, data);

      await interaction.followUp({ content: '✅ Unlocked all previously locked channels.' });
    } catch (error) {
      console.error('Error unlocking all channels:', error);
      interaction.followUp({ content: '❌ Failed to unlock all channels. Please try again later.', ephemeral: true });
    }
  },
};
