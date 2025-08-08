const { PermissionsBitField } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  name: 'lockall',
  description: 'Locks all text channels in the server.',
  options: [
    {
      name: 'reason',
      type: 'STRING',
      description: 'Reason for locking all channels',
      required: false,
    },
  ],
  async execute(interaction) {
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    try {
      const guildId = interaction.guild.id;
      const fileName = 'moderation/server_configs.json';
      const data = await database.read(fileName);
      if (!data[guildId]) data[guildId] = { lockedChannels: {} };

      await interaction.reply({ content: '🔒 Locking all text channels...', ephemeral: true });

      const channels = interaction.guild.channels.cache.filter((ch) => ch.isTextBased());
      for (const [channelId, channel] of channels) {
        const originalPermissions = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
        const originalAllow = originalPermissions?.allow.bitfield || 0;
        const originalDeny = originalPermissions?.deny.bitfield || 0;

        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SEND_MESSAGES: false });
        data[guildId].lockedChannels[channelId] = { allow: originalAllow, deny: originalDeny };

        await channel.send(`🔒 This channel has been locked. Reason: ${reason}`);
      }

      await database.write(fileName, data);
      await interaction.followUp({ content: `✅ Locked all text channels. Reason: ${reason}` });
    } catch (error) {
      console.error('Error locking all channels:', error);
      interaction.followUp({ content: '❌ Failed to lock all channels. Please try again later.', ephemeral: true });
    }
  },
};
